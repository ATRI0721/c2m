import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api';
import type { Message, SSEEvent } from '../../types/api';
import { useChatStore, useMcpStore, useUiStore, useAuthStore } from '../../stores';
import { generateTempId } from '../../stores/chatStore';
import AgentSelector from './AgentSelector';
import MCPPanel from './MCPPanel';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ConversationList from './ConversationList';

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [prefilledMessage, setPrefilledMessage] = useState<string>('');

  // Stores
  const {
    conversations,
    messages,
    isStreaming,
    streamingMessageId,
    isLoadingConversations,
    isLoadingMessages,
    loadConversations,
    loadMessages,
    addConversation,
    removeConversation,
    setCurrentConversation,
    updateConversationTimestamp,
    addMessage,
    updateMessage,
    updateMessagesConversationId,
    clearMessages,
    startStreaming,
    stopStreaming,
    appendStreamingContent,
    setStreamingError,
    finalizeStreamingMessage,
  } = useChatStore();

  const {
    agents,
    mcpServers,
    selectedAgent,
    enabledServices,
    loadAgents,
    loadMcpServers,
    setSelectedAgent,
    toggleService,
    getRequiredServices,
  } = useMcpStore();

  const {
    isSidebarCollapsed,
    isMCPPanelOpen,
    toggleSidebar,
    toggleMCPPanel,
    setMCPPanelOpen,
  } = useUiStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load agents and MCP servers on mount
  useEffect(() => {
    loadAgents();
    loadMcpServers();
  }, [loadAgents, loadMcpServers]);

  // Load conversations when user changes
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, loadConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    } else {
      clearMessages();
    }
  }, [conversationId, loadMessages, clearMessages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    // Clear any previous streaming state
    setStreamingError(null);

    // Add user message
    const userMessageId = generateTempId();
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      conversation_id: conversationId || '',
      message_type: 'message',
      tool_call_id: null,
      tool_name: null,
      tool_arguments: null,
      tool_error: false,
    };
    addMessage(userMessage);

    // Create placeholder assistant message that will be streamed into
    const assistantMessageId = generateTempId();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '', // Will be filled during streaming
      created_at: new Date().toISOString(),
      conversation_id: conversationId || '',
      message_type: 'message',
      tool_call_id: null,
      tool_name: null,
      tool_arguments: null,
      tool_error: false,
    };
    addMessage(assistantPlaceholder);
    startStreaming(assistantMessageId);

    try {
      let currentConvId = conversationId;
      let isNewConversation = false;

      // Create conversation if needed
      if (!currentConvId) {
        console.log('[Chat] Creating new conversation...');
        const agent = agents.find(a => a.name === selectedAgent);
        const newConv = await api.createConversation({
          title: content.slice(0, 50),
          model: agent?.model || 'deepseek-chat',
        });
        currentConvId = newConv.id;
        isNewConversation = true;
        addConversation(newConv);
        // Update local messages' conversation_id to match the new conversation
        // This prevents them from being cleared when navigating to the new conversation URL
        updateMessagesConversationId('', currentConvId);
        console.log('[Chat] Conversation created:', currentConvId);
      }

      console.log('[Chat] Starting stream for conversation:', currentConvId);
      // Stream chat
      const response = await api.streamChat({
        conversation_id: currentConvId,
        message: content,
        agent: selectedAgent,
        mcp_services: enabledServices,
      });

      let assistantContent = '';

      console.log('[Chat] Processing stream events...');
      for await (const event of response) {
        console.log('[Chat] Received event:', event.type);

        if (event.type === 'content') {
          // 实时累积内容并更新UI
          assistantContent += event.content;
          appendStreamingContent(event.content);
          // 实时更新消息内容
          updateMessage(assistantMessageId, { content: assistantContent });
        } else if (event.type === 'tool_call') {
          // Tool call event - insert placeholder into content for database storage
          const toolCallEvent = event as Extract<SSEEvent, { type: 'tool_call' }>;
          const toolId = toolCallEvent.tool || toolCallEvent.tool_call_id || '';
          // Format: [TOOL_CALL:tool_id]
          assistantContent += `\n[TOOL_CALL:${toolId}]\n`;
          // 实时更新
          updateMessage(assistantMessageId, { content: assistantContent });
          console.log('[Chat] Tool call:', toolId, toolCallEvent.args);
        } else if (event.type === 'end') {
          console.log('[Chat] Stream ended normally');
        } else if (event.type === 'error') {
          const errorEvent = event as Extract<SSEEvent, { type: 'error' }>;
          console.error('[Chat] Stream error:', errorEvent.message);
          setStreamingError(errorEvent.message);
          updateMessage(assistantMessageId, {
            content: assistantContent + `\n\n❌ Error: ${errorEvent.message}`
          });
        }
      }

      console.log('[Chat] Stream completed. Content length:', assistantContent.length);

      // Finalize: Update the placeholder message with actual content
      // This is atomic - the message stays in the same position, just content changes
      finalizeStreamingMessage(assistantMessageId);

      // Navigate after streaming completes for new conversations
      if (isNewConversation) {
        console.log('[Chat] Updating URL for new conversation:', currentConvId);
        // 使用 history.replaceState 更新 URL，但不触发 React Router 导航
        // 这样可以：
        // 1. 更新浏览器地址栏（用户可以复制链接）
        // 2. 不触发 useEffect 的 loadMessages
        // 3. 避免消息重复
        window.history.replaceState({}, '', `/chat/${currentConvId}`);
        // 更新 store 中的当前会话 ID
        setCurrentConversation(currentConvId);
      } else {
        // For existing conversations, optimistically update timestamp
        // This moves the conversation to the top of the list without fetching from server
        updateConversationTimestamp(currentConvId);
      }
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStreamingError(errorMessage);
      updateMessage(assistantMessageId, {
        content: `❌ Failed to send message: ${errorMessage}`
      });
    } finally {
      // 保留内容用于显示
      stopStreaming(true);
    }
  }, [conversationId, selectedAgent, enabledServices, agents, isStreaming, navigate, addMessage, updateMessage, updateMessagesConversationId, startStreaming, appendStreamingContent, setStreamingError, finalizeStreamingMessage, stopStreaming, addConversation, updateConversationTimestamp]);

  const handleSelectAgent = (agentName: string) => {
    setSelectedAgent(agentName);
  };

  const handleToggleService = (serviceName: string) => {
    toggleService(serviceName);
  };

  const handleLoadConversation = (id: string) => {
    setCurrentConversation(id);
    navigate(`/chat/${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      removeConversation(id);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleCreateNew = () => {
    setCurrentConversation(null);
    navigate('/chat');
  };

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex gap-2">
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
          <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-surface-50">
      {/* Sidebar */}
      <div
        className={`transition-all duration-300 ease-in-out min-w-0 flex-shrink-0 ${
          isSidebarCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'
        }`}
      >
        <ConversationList
          conversations={conversations}
          currentConversationId={conversationId || null}
          onLoadConversation={handleLoadConversation}
          onDeleteConversation={handleDeleteConversation}
          onCreateNew={handleCreateNew}
          isLoading={isLoadingConversations}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-16 border-b border-surface-200 flex items-center px-6 bg-white/80 backdrop-blur-md sticky top-0 z-30">
          {/* Left Section */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors flex-shrink-0"
              type="button"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={handleCreateNew}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors group flex-shrink-0"
              type="button"
              title="New Chat"
              aria-label="New Chat"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="min-w-0 max-w-xs">
              <h1 className="font-display text-xl font-semibold text-gray-900 truncate">
                {conversationId
                  ? conversations.find(c => c.id === conversationId)?.title || 'Chat'
                  : 'New Chat'
                }
              </h1>
              <p className="text-xs text-gray-500 truncate">
                {agents.find(a => a.name === selectedAgent)?.description || ''}
              </p>
            </div>
          </div>

          {/* Centered Agent Selector */}
          <div className="absolute left-1/2 -translate-x-1/2 max-w-md w-full px-6">
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={handleSelectAgent}
              compact
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            {/* MCP Configuration Button */}
            <button
              onClick={toggleMCPPanel}
              className="p-2 hover:bg-surface-100 rounded-lg transition-colors group relative"
              type="button"
              title="MCP Service Configuration"
              aria-label="MCP Service Configuration"
            >
              <svg className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {/* Badge for enabled services count */}
              {enabledServices.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {enabledServices.length}
                </span>
              )}
            </button>
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={() => {
                api.setToken(null);
                navigate('/login');
              }}
              className="btn btn-ghost text-sm"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-br from-surface-50 via-white to-primary-50/30">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              {/* Artistic Header */}
              <div className="text-center mb-12 animate-slide-up">
                {/* Animated gradient icon */}
                <div className="relative inline-block mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 rounded-full blur-2xl opacity-60 animate-pulse-soft" />
                  <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>

                {/* Artistic Title with gradient text */}
                <h1 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-gray-900 via-primary-700 to-accent-600 bg-clip-text text-transparent">
                  CityLive
                </h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                  How can I help you today? Choose a topic to start a conversation
                </p>
              </div>

              {/* Example Prompt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full px-4 animate-slide-up [animation-delay:150ms]">
                {[
                  { icon: '🏥', prompt: 'Find nearby hospitals and elderly healthcare services', color: 'from-rose-50 to-pink-50 border-rose-200' },
                  { icon: '🍽️', prompt: 'Recommend restaurants for group dining and gatherings', color: 'from-amber-50 to-orange-50 border-amber-200' },
                  { icon: '🏃', prompt: 'Find nearby gyms and sports facilities', color: 'from-emerald-50 to-green-50 border-emerald-200' },
                  { icon: '🎡', prompt: 'Suggest weekend family activities and entertainment venues', color: 'from-blue-50 to-cyan-50 border-blue-200' },
                ].map((card, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setPrefilledMessage(card.prompt);
                    }}
                    className={`p-5 rounded-2xl border-2 bg-gradient-to-br ${card.color} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left group`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{card.icon}</span>
                      <p className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                        {card.prompt}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Or input your message */}
              <div className="mt-8 text-gray-500 text-sm animate-slide-up [animation-delay:300ms]">
                Or type directly what you want to ask
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => {
                // Check if this message is currently being streamed
                const isStreamingMessage = msg.id === streamingMessageId;

                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreamingMessage}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* MCP Panel */}
        <MCPPanel
          mcpServers={mcpServers}
          enabledServices={enabledServices}
          requiredServices={getRequiredServices()}
          onToggleService={handleToggleService}
          isOpen={isMCPPanelOpen}
          onClose={() => setMCPPanelOpen(false)}
        />

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          placeholder="Type a message..."
          prefilledMessage={prefilledMessage}
          onPrefilledMessageUsed={() => setPrefilledMessage('')}
        />
      </div>
    </div>
  );
}
