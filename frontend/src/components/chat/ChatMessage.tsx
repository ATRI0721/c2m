import type { Message } from '../../types/api';
import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import ToolCallIndicator, { parseToolCalls, type ToolCallStatus } from './ToolCallIndicator';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const hasToolCall = message.tool_call_id !== null;

  // 解析消息内容中的工具调用占位符
  // 这个函数从已保存的消息中解析工具调用标记
  const parsedContent = useMemo(() => {
    return parseToolCalls(message.content || '');
  }, [message.content]);

  // 创建 tool_calls 映射，用于显示工具调用详情
  const toolCallsMap = useMemo(() => {
    const map = new Map<string, {
      arguments?: Record<string, unknown>;
      result?: Record<string, unknown> | string;
      error?: boolean;
    }>();
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        map.set(tc.tool_call_id, {
          arguments: tc.arguments,
          result: tc.result,
          error: tc.error
        });
      }
    }
    return map;
  }, [message.tool_calls]);

  if (isSystem) {
    return null;
  }

  // Markdown 组件自定义渲染
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

  // 渲染内容，包括文本和工具调用
  const renderContent = () => {
    const content = message.content || '';
    const hasContent = content.length > 0 || hasToolCall;

    // 检查是否有内容显示
    if (!hasContent && isStreaming) {
      // 流式传输中的占位符
      return (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft [animation-delay:300ms]" />
          </div>
        </div>
      );
    }

    if (!hasContent) {
      return null;
    }

    // 使用解析后的内容进行渲染
    const parts = parsedContent;

    // 如果找到了工具调用标记，渲染它们
    if (parts.length > 1 || (parts.length === 1 && typeof parts[0] !== 'string')) {
      return (
        <div className="space-y-3">
          {parts.map((part, index) => {
            if (typeof part === 'string') {
              if (!part.trim()) return null;
              return isUser ? (
                <p key={index} className="whitespace-pre-wrap break-words">{part}</p>
              ) : (
                <ReactMarkdown
                  key={index}
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={markdownComponents}
                >
                  {part}
                </ReactMarkdown>
              );
            } else {
              // 这是一个工具调用标记
              const toolCallDetails = toolCallsMap.get(part.id);

              // 根据详情确定状态
              let status: ToolCallStatus = 'success';
              if (toolCallDetails?.error) {
                status = 'error';
              } else if (!toolCallDetails) {
                status = 'pending';
              }

              return (
                <ToolCallIndicator
                  key={index}
                  toolCallId={part.id}
                  status={status}
                  animating={false}
                  arguments={toolCallDetails?.arguments}
                  result={toolCallDetails?.result}
                />
              );
            }
          })}
        </div>
      );
    }

    // 没有工具调用标记，直接渲染内容
    return isUser ? (
      <p className="whitespace-pre-wrap break-words">{content}</p>
    ) : (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    );
  };

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
          {renderContent()}
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
