import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import type { Agent, Message, Conversation, MCPServer, SSEEvent } from '../../types/api';
import AgentSelector from './AgentSelector';
import MCPPanel from './MCPPanel';
import ChatMessage, { StreamingIndicator } from './ChatMessage';
import ChatInput from './ChatInput';
import ConversationList from './ConversationList';

export default function ChatPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('chat');
  const [enabledServices, setEnabledServices] = useState<string[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingEvents, setStreamingEvents] = useState<SSEEvent[]>([]);

  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
  }, [messages, streamingEvents]);

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await api.getAgents();
        const agentList = Object.values(response.agents) as Agent[];
        setAgents(agentList);
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    };
    loadAgents();
  }, []);

  // Load MCP servers
  useEffect(() => {
    const loadMCPServers = async () => {
      try {
        const servers = await api.getMCPServers();
        setMcpServers(servers);
      } catch (error) {
        console.error('Failed to load MCP servers:', error);
      }
    };
    loadMCPServers();
  }, []);

  // Update enabled services when agent changes
  useEffect(() => {
    const agent = agents.find(a => a.name === selectedAgent);
    if (agent) {
      setEnabledServices(agent.mcp_services);
    }
  }, [selectedAgent, agents]);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) return;
      setIsLoadingConversations(true);
      try {
        const response = await api.getConversations(1, 50);
        setConversations(response.items);
      } catch (error) {
        console.error('Failed to load conversations:', error);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    loadConversations();
  }, [user]);

  // Load messages for current conversation
  useEffect(() => {
    const loadMessages = async () => {
      if (!conversationId) {
        setMessages([]);
        return;
      }
      setIsLoadingMessages(true);
      try {
        const messages = await api.getConversationMessages(conversationId);
        console.log('[Chat] Loaded', messages.length, 'messages');
        setMessages(messages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    loadMessages();
  }, [conversationId]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
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
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingEvents([]);

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
        setConversations(prev => [newConv, ...prev]);
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
        console.log('[Chat] Received event:', event.type, event);
        setStreamingEvents(prev => {
          const newEvents = [...prev, event];
          console.log('[Chat] Total streaming events:', newEvents.length);
          return newEvents;
        });

        if (event.type === 'content') {
          assistantContent += event.content;
        } else if (event.type === 'tool_call') {
          // Tool call event - insert placeholder into content for database storage
          const toolCallEvent = event as Extract<SSEEvent, { type: 'tool_call' }>;
          const toolId = toolCallEvent.tool || toolCallEvent.tool_call_id || '';
          // Format: [TOOL_CALL:tool_id]
          assistantContent += `\n[TOOL_CALL:${toolId}]\n`;
          console.log('[Chat] Tool call:', toolId, toolCallEvent.args);
        }
      }

      console.log('[Chat] Stream completed. Content length:', assistantContent.length);

      // Create assistant message from streamed content
      // Keep tool call placeholders in the content for proper display when loaded from backend
      if (assistantContent) {
        const assistantMessage: Message = {
          id: Date.now().toString() + '_assistant',
          role: 'assistant',
          content: assistantContent,
          created_at: new Date().toISOString(),
          conversation_id: currentConvId,
          message_type: 'message',
          tool_call_id: null,
          tool_name: null,
          tool_arguments: null,
          tool_error: false,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }

      // Navigate after streaming completes for new conversations
      if (isNewConversation) {
        console.log('[Chat] Navigating to new conversation:', currentConvId);
        navigate(`/chat/${currentConvId}`, { replace: true });
      }

      // Reload conversations to update order
      const convs = await api.getConversations(1, 50);
      setConversations(convs.items);
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      alert('发送消息失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsStreaming(false);
      setStreamingEvents([]);
    }
  }, [conversationId, selectedAgent, enabledServices, agents, isStreaming, navigate]);

  const handleSelectAgent = (agentName: string) => {
    setSelectedAgent(agentName);
  };

  const handleToggleService = (serviceName: string) => {
    const currentAgent = agents.find(a => a.name === selectedAgent);
    const requiredServices = currentAgent?.mcp_services || [];

    // Prevent toggling required services
    if (requiredServices.includes(serviceName)) {
      return;
    }

    setEnabledServices(prev =>
      prev.includes(serviceName)
        ? prev.filter(s => s !== serviceName)
        : [...prev, serviceName]
    );
  };

  const handleLoadConversation = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleCreateNew = () => {
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
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
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

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white border border-surface-300 p-2 rounded-lg hover:border-primary-400 transition-all duration-200 shadow-soft"
        type="button"
        title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
      >
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
            isSidebarCollapsed ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-16 border-b border-surface-300 flex items-center justify-between px-6 bg-white">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-surface-200 rounded-lg transition-colors"
              type="button"
              title={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
              aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-display text-xl font-semibold text-gray-900">
                {conversationId
                  ? conversations.find(c => c.id === conversationId)?.title || '对话'
                  : '新对话'
                }
              </h1>
              <p className="text-xs text-gray-500">
                {agents.find(a => a.name === selectedAgent)?.description || ''}
              </p>
            </div>
          </div>

          {/* Agent Selector in Header */}
          <div className="flex-1 max-w-md mx-8">
            <AgentSelector
              agents={agents}
              selectedAgent={selectedAgent}
              onSelectAgent={handleSelectAgent}
              compact
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user.email}</span>
            <button
              onClick={() => {
                api.setToken(null);
                navigate('/login');
              }}
              className="btn btn-ghost text-sm"
              type="button"
            >
              退出
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-surface-50">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex gap-2">
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
                <span className="w-3 h-3 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg font-medium text-gray-600">开始新对话</p>
              <p className="text-sm mt-1">选择一个助手并输入消息</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isStreaming && (
                <>
                  {streamingEvents.length > 0 ? (
                    <ChatMessage
                      message={{
                        id: 'streaming',
                        role: 'assistant',
                        content: '',
                        created_at: new Date().toISOString(),
                        conversation_id: conversationId || '',
                        message_type: 'message',
                        tool_call_id: null,
                        tool_name: null,
                        tool_arguments: null,
                        tool_error: false,
                      }}
                      streamingEvents={streamingEvents}
                    />
                  ) : (
                    <StreamingIndicator />
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* MCP Panel */}
        <MCPPanel
          mcpServers={mcpServers}
          enabledServices={enabledServices}
          requiredServices={agents.find(a => a.name === selectedAgent)?.mcp_services || []}
          onToggleService={handleToggleService}
        />

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          placeholder="输入消息..."
        />
      </div>
    </div>
  );
}
