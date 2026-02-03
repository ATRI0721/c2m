import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2, Plus, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
import { conversationApi, Conversation } from '@/api/api';
import { ToolCallCard } from '@/components/ToolCallCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// A segment in the message stream can be either content or a tool call
type MessageSegment =
  | { type: 'content'; content: string }
  | { type: 'tool_call'; toolId: string; toolName: string; arguments: Record<string, any>; startTime: number; status: 'pending' | 'running' | 'completed' | 'failed'; result?: string; error?: boolean; duration?: number };

interface Message {
  role: 'user' | 'assistant';
  segments: MessageSegment[];
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversationList, setShowConversationList] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载对话列表
  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const data = await conversationApi.getConversations(1, 50);
      setConversations(data.items);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  };

  // 初始化时加载对话列表
  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 创建新对话
  const createNewConversation = async () => {
    try {
      const newConv = await conversationApi.createConversation('AI配置助手');
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversation(newConv);
      setMessages([
        { role: 'assistant', segments: [{ type: 'content', content: '你好！我是 Code2MCP 配置助手，可以帮助您：\n\n• 配置和管理 MCP 服务\n• 创建和优化 Agent\n• 解答系统配置问题\n• 诊断配置错误\n\n请问有什么我可以帮助您的吗？' }] }
      ]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // 加载对话消息
  const loadConversationMessages = async (conversation: Conversation) => {
    setIsLoading(true);
    try {
      const messagesData = await conversationApi.getMessages(conversation.id);
      const messages: Message[] = [];

      for (const msg of messagesData) {
        // 跳过系统消息
        if (msg.role === 'system') continue;

        const role = msg.role as 'user' | 'assistant';

        // 工具调用消息：添加到上一条 assistant 消息或创建新消息
        if (msg.message_type === 'tool_call' && msg.tool_call_id && msg.tool_name) {
          const toolCallSegment: MessageSegment & { type: 'tool_call' } = {
            type: 'tool_call',
            toolId: msg.tool_call_id,
            toolName: msg.tool_name,
            arguments: msg.tool_arguments ? JSON.parse(msg.tool_arguments) : {},
            startTime: 0,
            status: msg.tool_error ? 'failed' : 'completed',
            result: msg.content || undefined,
            error: msg.tool_error,
          };

          // 添加到上一条 assistant 消息或创建新消息
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.role === 'assistant') {
            lastMsg.segments.push(toolCallSegment);
          } else {
            messages.push({ role: 'assistant', segments: [toolCallSegment] });
          }
        }
        // 普通消息：移除工具调用占位符
        else if (msg.message_type === 'message' && msg.content) {
          const cleanContent = msg.content.replace(/\[TOOL_CALL:[a-zA-Z0-9_-]+\]/g, '').trim();

          // 合并到上一条同角色消息
          const lastMsg = messages[messages.length - 1];
          if (lastMsg?.role === role) {
            if (cleanContent) {
              lastMsg.segments.push({ type: 'content', content: cleanContent });
            }
          } else if (cleanContent) {
            messages.push({ role, segments: [{ type: 'content', content: cleanContent }] });
          }
        }
      }

      setMessages(messages.length > 0 ? messages : [
        { role: 'assistant', segments: [{ type: 'content', content: '你好！我是 Code2MCP 配置助手，可以帮助您：\n\n• 配置和管理 MCP 服务\n• 创建和优化 Agent\n• 解答系统配置问题\n• 诊断配置错误\n\n请问有什么我可以帮助您的吗？' }] }
      ]);
      setCurrentConversation(conversation);
      setShowConversationList(false);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除对话
  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;
    try {
      await conversationApi.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([
          { role: 'assistant', segments: [{ type: 'content', content: '你好！我是 Code2MCP 配置助手，可以帮助您：\n\n• 配置和管理 MCP 服务\n• 创建和优化 Agent\n• 解答系统配置问题\n• 诊断配置错误\n\n请问有什么我可以帮助您的吗？' }] }
        ]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', segments: [{ type: 'content', content: userMessage }] }]);
    setIsLoading(true);

    try {
      // 如果没有当前对话，创建新对话
      let convId = currentConversation?.id;
      if (!convId) {
        const newConv = await conversationApi.createConversation('AI配置助手');
        setConversations(prev => [newConv, ...prev]);
        setCurrentConversation(newConv);
        convId = newConv.id;
      }

      // 调用后端AI助手API
      const response = await fetch('/api/v1/agent/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: convId
        })
      });

      if (!response.ok) {
        throw new Error('API请求失败');
      }

      // 读取流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const activeToolCalls = new Map<string, MessageSegment & { type: 'tool_call' }>();

      // Create a new message with empty segments initially
      setMessages(prev => [...prev, { role: 'assistant', segments: [] }]);
      setIsLoading(false);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (!data.trim()) continue;

              try {
                const parsed = JSON.parse(data);

                setMessages(prev => {
                  const newMessages = prev.map(msg => ({ ...msg, segments: [...msg.segments] }));
                  const lastMessage = newMessages[newMessages.length - 1];

                  // 处理内容事件
                  if (parsed.type === 'content' && parsed.content) {
                    const lastSegment = lastMessage.segments[lastMessage.segments.length - 1];
                    if (lastSegment?.type === 'content') {
                      // Create new object with appended content
                      lastMessage.segments[lastMessage.segments.length - 1] = {
                        type: 'content',
                        content: lastSegment.content + parsed.content
                      };
                    } else {
                      // Create new content segment
                      lastMessage.segments.push({ type: 'content', content: parsed.content });
                    }
                  }
                  // 处理工具调用事件
                  else if (parsed.type === 'tool_call') {
                    const toolId = parsed.tool_id;
                    const toolName = toolId.split(':')[1] || toolId;
                    const toolCall: MessageSegment & { type: 'tool_call' } = {
                      type: 'tool_call',
                      toolId,
                      toolName,
                      arguments: parsed.arguments || {},
                      startTime: Date.now(),
                      status: 'running',
                    };
                    activeToolCalls.set(toolId, toolCall);
                    lastMessage.segments.push({ ...toolCall });
                  }
                  // 处理工具结果事件
                  else if (parsed.type === 'tool_result') {
                    const toolId = parsed.tool_id;
                    const existingCall = activeToolCalls.get(toolId);
                    if (existingCall) {
                      const duration = Date.now() - existingCall.startTime;
                      const updatedCall: MessageSegment & { type: 'tool_call' } = {
                        ...existingCall,
                        status: parsed.error ? 'failed' : 'completed',
                        result: parsed.result,
                        error: parsed.error,
                        duration,
                      };
                      activeToolCalls.set(toolId, updatedCall);
                      // Update the segment in the message
                      lastMessage.segments = lastMessage.segments.map(seg =>
                        seg.type === 'tool_call' && seg.toolId === toolId ? { ...updatedCall } : seg
                      );
                    }
                  }
                  // 处理错误事件
                  else if (parsed.type === 'error') {
                    const lastSegment = lastMessage.segments[lastMessage.segments.length - 1];
                    if (lastSegment?.type === 'content') {
                      lastMessage.segments[lastMessage.segments.length - 1] = {
                        type: 'content',
                        content: lastSegment.content + `\n\n[错误: ${parsed.message}]`
                      };
                    } else {
                      lastMessage.segments.push({ type: 'content', content: `\n\n[错误: ${parsed.message}]` });
                    }
                  }
                  // 兼容旧格式 (直接有 content 字段)
                  else if (parsed.content) {
                    const lastSegment = lastMessage.segments[lastMessage.segments.length - 1];
                    if (lastSegment?.type === 'content') {
                      lastMessage.segments[lastMessage.segments.length - 1] = {
                        type: 'content',
                        content: lastSegment.content + parsed.content
                      };
                    } else {
                      lastMessage.segments.push({ type: 'content', content: parsed.content });
                    }
                  }

                  return newMessages;
                });
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      // 刷新对话列表以更新 updated_at
      await loadConversations();
    } catch (error) {
      console.error('AI助手请求失败:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        segments: [{ type: 'content', content: '抱歉，我遇到了一些问题。请确保后端服务正在运行，然后重试。' }]
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时显示欢迎消息
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: 'assistant', segments: [{ type: 'content', content: '你好！我是 Code2MCP 配置助手，可以帮助您：\n\n• 配置和管理 MCP 服务\n• 创建和优化 Agent\n• 解答系统配置问题\n• 诊断配置错误\n\n请问有什么我可以帮助您的吗？' }] }
      ]);
    }
  }, []);

  return (
    <Card className="glow border-border/60">
      {/* Header with accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary to-secondary" />
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 border border-primary/30">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="font-display text-base">AI 配置助手</CardTitle>
              <div className="mono-label mt-1">SYSTEM_ASSISTANT_V1</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConversationList(!showConversationList)}
              className="font-mono text-xs"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              历史
              ({conversations.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={createNewConversation}
              className="font-mono text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              新对话
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadConversations}
              disabled={isLoadingConversations}
              className="font-mono text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingConversations ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Conversation List */}
        {showConversationList && (
          <div className="mt-4 p-3 bg-black/20 border border-border/60 rounded max-h-48 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-4">
                暂无对话记录
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => loadConversationMessages(conv)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                      currentConversation?.id === conv.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{conv.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current conversation indicator */}
        {currentConversation && (
          <div className="text-xs text-muted-foreground mono-label">
            当前对话: {currentConversation.title}
          </div>
        )}

        {/* Messages */}
        <div className="h-[400px] overflow-y-auto p-4 bg-black/20 border border-border/60 text-sm space-y-4">
          {messages.map((message, index) => (
            <div key={index}>
              {message.role === 'assistant' ? (
                <div className="space-y-3">
                  {/* AI Header */}
                  <div className="flex gap-2">
                    <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-primary/20 flex items-center justify-center mt-0.5">
                      <span className="text-[10px] text-primary">AI</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      {/* Render segments in order */}
                      {message.segments.length === 0 ? (
                        <div className="px-3 py-2 border bg-muted/20 border-border/60">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </div>
                      ) : (
                        message.segments.map((segment, segIdx) => {
                          if (segment.type === 'content') {
                            return (
                              <div key={`content-${segIdx}`} className="px-3 py-2 border bg-muted/20 border-border/60 prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ children }: { children?: React.ReactNode }) => <p className="whitespace-pre-wrap leading-relaxed mb-2 last:mb-0">{children}</p>,
                                    code: ({ inline, className, children }: { inline?: boolean; className?: string; children?: React.ReactNode }) => inline ? (
                                      <code className="bg-primary/20 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                                    ) : (
                                      <code className={className}>{children}</code>
                                    ),
                                    pre: ({ children }: { children?: React.ReactNode }) => <pre className="bg-black/30 p-3 rounded overflow-x-auto border border-border/60 my-2">{children}</pre>,
                                  }}
                                >
                                  {segment.content}
                                </ReactMarkdown>
                              </div>
                            );
                          } else {
                            return (
                              <ToolCallCard
                                key={`tool-${segIdx}`}
                                toolId={segment.toolId}
                                toolName={segment.toolName}
                                arguments={segment.arguments}
                                result={segment.result}
                                error={segment.error}
                                status={segment.status}
                                duration={segment.duration}
                              />
                            );
                          }
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* User Message */
                <div className="flex justify-end">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="px-3 py-2 border bg-primary/10 border-primary/30">
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {message.segments.find(s => s.type === 'content')?.content || ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-secondary/20 flex items-center justify-center mt-0.5">
                      <span className="text-[10px] text-secondary">U</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && messages.length === 0 && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-sm bg-primary/20 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] text-primary">AI</span>
                </div>
                <div className="px-3 py-2 bg-muted/20 border border-border/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder="输入您的问题..."
              className="font-mono text-sm bg-black/20 border-border/60 focus:border-primary"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading}
            className="font-mono text-xs bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                SEND
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
