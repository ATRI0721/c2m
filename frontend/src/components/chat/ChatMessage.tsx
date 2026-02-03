import type { Message, SSEEvent } from '../../types/api';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import ToolCallIndicator, { parseToolCalls, type ToolCallStatus } from './ToolCallIndicator';

interface ChatMessageProps {
  message: Message;
  streamingEvents?: SSEEvent[];
}

export default function ChatMessage({ message, streamingEvents = [] }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const isStreaming = streamingEvents.length > 0;
  const hasToolCall = message.tool_call_id !== null;

  // 追踪工具调用状态
  const toolCallStatuses = useMemo(() => {
    const statuses = new Map<string, ToolCallStatus>();
    const toolOrder: string[] = [];

    for (const event of streamingEvents) {
      if (event.type === 'tool_call') {
        const toolCallEvent = event as Extract<SSEEvent, { type: 'tool_call' }>;
        // 优先使用 tool，其次使用 tool_call_id，最后使用计数器
        const toolId = toolCallEvent.tool || toolCallEvent.tool_call_id || `tool_${toolOrder.length}`;
        // 如果 toolId 为空或只是 call_ 前缀，使用友好的默认名称
        const finalToolId = (!toolId || toolId === 'call_' || toolId.startsWith('tool_')) ? `工具调用${toolOrder.length + 1}` : toolId;
        if (!statuses.has(finalToolId)) {
          statuses.set(finalToolId, 'pending');
          toolOrder.push(finalToolId);
        }
      } else if (event.type === 'tool_result') {
        // 检查结果中是否有错误
        const resultEvent = event as Extract<SSEEvent, { type: 'tool_result' }>;
        const result = resultEvent.result as any;

        // 找到最近的一个pending工具调用，标记为完成
        for (let i = toolOrder.length - 1; i >= 0; i--) {
          const toolId = toolOrder[i];
          if (statuses.get(toolId) === 'pending') {
            // 检查是否失败（结果中包含error字段或状态码不是200）
            const isError = result?.error !== undefined ||
                           result?.statusCode !== undefined ||
                           (result?.status && result.status !== 'success');
            statuses.set(toolId, isError ? 'error' : 'success');
            break;
          }
        }
      }
    }

    return { statuses, toolOrder };
  }, [streamingEvents]);

  console.log('[ChatMessage] Render:', {
    isStreaming,
    streamingEventsCount: streamingEvents.length,
    hasToolCall,
    role: message.role,
    toolCallStatuses,
  });

  // Build content for display
  const displayContent = message.content || '';

  // During streaming, build a mixed content list with both text and tool calls
  // This preserves the order of content and tool calls
  const streamingContentParts = useMemo(() => {
    // Use streaming events if streaming or if there are streaming events but no actual content yet
    // This prevents flicker when stream ends
    const shouldUseStreamEvents = isStreaming || (streamingEvents.length > 0 && !displayContent);

    if (!shouldUseStreamEvents) return [];

    const parts: Array<string | { type: 'tool_call'; id: string }> = [];
    let textBuffer = '';

    for (const event of streamingEvents) {
      if (event.type === 'content') {
        // Accumulate text content to avoid creating multiple paragraphs
        textBuffer += event.content;
      } else if (event.type === 'tool_call') {
        // Flush text buffer before adding tool call
        if (textBuffer) {
          parts.push(textBuffer);
          textBuffer = '';
        }
        const toolCallEvent = event as Extract<SSEEvent, { type: 'tool_call' }>;
        let toolName = toolCallEvent.tool || toolCallEvent.tool_call_id || '';
        // Generate a friendly tool name if needed
        if (!toolName || toolName === 'call_' || toolName.startsWith('tool_')) {
          const currentToolIndex = parts.filter(p => typeof p !== 'string').length;
          toolName = `工具调用${currentToolIndex + 1}`;
        }
        parts.push({ type: 'tool_call', id: toolName });
      }
    }

    // Flush remaining text buffer
    if (textBuffer) {
      parts.push(textBuffer);
    }

    return parts;
  }, [streamingEvents, isStreaming, displayContent]);

  if (isSystem) {
    return null;
  }

  // Markdown components customization
  const markdownComponents: any = {
    p: ({ children }: { children?: React.ReactNode }) => {
      return <p className="mb-3 last:mb-0">{children}</p>;
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      return !inline ? (
        <code className={`${className} block bg-gray-900 text-gray-100 p-3 rounded-lg text-sm overflow-x-auto`} {...props}>
          {children}
        </code>
      ) : (
        <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    pre: ({ children }: { children?: React.ReactNode }) => <div className="my-3">{children}</div>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-xl font-bold mb-3">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-base font-semibold mb-2">{children}</h3>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-600">{children}</blockquote>
    ),
    a: (props: any) => (
      <a {...props} className="text-primary-600 hover:text-primary-700 underline" target="_blank" rel="noopener noreferrer" />
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-gray-300">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-100">{children}</thead>,
    tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
    tr: ({ children }: { children?: React.ReactNode }) => <tr className="border-b border-gray-200">{children}</tr>,
    th: ({ children }: { children?: React.ReactNode }) => <th className="px-4 py-2 text-left font-semibold">{children}</th>,
    td: ({ children }: { children?: React.ReactNode }) => <td className="px-4 py-2">{children}</td>,
  };

  // Check if there's content to display
  // For streaming messages, check streamingContentParts; for loaded messages, check displayContent
  const hasStreamContent = isStreaming && streamingContentParts.length > 0;
  const hasContent = hasStreamContent || displayContent.length > 0 || hasToolCall;

  // 渲染包含工具调用的内容
  const renderContentWithToolCalls = (content: string, useMarkdown: boolean) => {
    // During streaming, use the streamingContentParts which has tool calls in correct positions
    if (isStreaming && streamingContentParts.length > 0) {
      return (
        <div className="space-y-3">
          {streamingContentParts.map((part, index) => {
            if (typeof part === 'string') {
              if (!part.trim()) return null;
              return useMarkdown ? (
                <ReactMarkdown
                  key={index}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {part}
                </ReactMarkdown>
              ) : (
                <p key={index} className="whitespace-pre-wrap break-words">{part}</p>
              );
            } else {
              const status = toolCallStatuses.statuses.get(part.id) || 'pending';
              return (
                <ToolCallIndicator
                  key={index}
                  toolCallId={part.id}
                  status={status}
                  animating={isStreaming}
                />
              );
            }
          })}
        </div>
      );
    }

    // Non-streaming mode: parse tool call placeholders from backend messages
    const parts = parseToolCalls(content);

    // If we found tool call markers in the content, render them with icons
    if (parts.length > 1 || (parts.length === 1 && typeof parts[0] !== 'string')) {
      return (
        <div className="space-y-3">
          {parts.map((part, index) => {
            if (typeof part === 'string') {
              if (!part.trim()) return null;
              return useMarkdown ? (
                <ReactMarkdown
                  key={index}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {part}
                </ReactMarkdown>
              ) : (
                <p key={index} className="whitespace-pre-wrap break-words">{part}</p>
              );
            } else {
              // For loaded messages, show success/error status based on message metadata
              // Since we don't have individual tool status, default to success
              const status: ToolCallStatus = 'success';
              return (
                <ToolCallIndicator
                  key={index}
                  toolCallId={part.id}
                  status={status}
                  animating={false}
                />
              );
            }
          })}
        </div>
      );
    }

    // Non-streaming mode - just render the content as markdown
    // No tool call markers found
    return useMarkdown ? (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    ) : (
      <p className="whitespace-pre-wrap break-words">{content}</p>
    );
  };

  console.log('[ChatMessage] Content check:', {
    displayContentLength: displayContent.length,
    hasContent,
    hasToolCall,
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
          isUser ? 'bg-gradient-primary' : 'bg-surface-200 border border-surface-300'
        }`}
      >
        {isUser ? (
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block max-w-[80%] px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-gradient-primary text-white rounded-tr-sm'
              : 'bg-white text-gray-900 rounded-tl-sm border border-surface-300 shadow-soft'
          }`}
        >
          {hasContent ? (
            <div className="text-sm leading-relaxed markdown-content">
              {renderContentWithToolCalls(displayContent, !isUser)}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p className="mt-1 text-xs text-gray-500">
          {new Date(message.created_at).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// Streaming indicator component
export function StreamingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-surface-200 border border-surface-300 flex items-center justify-center">
        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="inline-block px-4 py-2.5 rounded-2xl rounded-tl-sm bg-white border border-surface-300 shadow-soft">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
