import { useState } from 'react';

export type ToolCallStatus = 'pending' | 'success' | 'error';

interface ToolCallIndicatorProps {
  toolCallId: string;
  status?: ToolCallStatus;
  animating?: boolean;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown> | string | null;
}

/**
 * 格式化工具名称，使其更易读
 */
function formatToolName(toolId: string): string {
  // 如果是 call_ 开头的ID，直接返回"工具"
  if (toolId.startsWith('call_')) {
    return "工具调用";
  }

  // 如果是 unknown，返回更友好的文本
  if (toolId === 'unknown' || toolId === 'tool_') {
    return '工具调用';
  }

  // 处理类似 mcp__weather__get_tomorrow_weather 的格式
  // 提取最后一部分作为名称
  const parts = toolId.split('__');
  const lastPart = parts[parts.length - 1];

  // 如果最后一部分是空字符串，返回"工具调用"
  if (!lastPart) {
    return '工具调用';
  }

  // 将下划线替换为空格，首字母大写
  return lastPart
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * 获取工具调用状态的样式类
 */
function getStatusClasses(status: ToolCallStatus, animating: boolean) {
  if (status === 'error') {
    return {
      container: 'bg-red-100 text-red-700 border-red-200',
      icon: 'text-red-600',
    };
  }
  if (status === 'success') {
    return {
      container: 'bg-green-100 text-green-700 border-green-200',
      icon: 'text-green-600',
    };
  }
  // pending
  return {
    container: 'bg-green-100 text-green-700 border-green-200',
    icon: animating ? 'animate-spin-slow' : '',
  };
}

/**
 * 格式化Python对象字符串为更易读的格式
 */
function formatPythonObjectString(str: string): string {
  // 尝试提取TextContent中的text字段
  const textContentMatch = str.match(/TextContent\([^)]*text='([^']*)'[^)]*\)/);
  if (textContentMatch && textContentMatch[1]) {
    return textContentMatch[1];
  }

  // 尝试提取content=[...]中的内容
  const contentMatch = str.match(/content=\[([^\]]+)\]/);
  if (contentMatch && contentMatch[1]) {
    return contentMatch[1];
  }

  // 如果字符串包含换行符，尝试清理它
  if (str.includes('\\n')) {
    return str.replace(/\\n/g, '\n').replace(/\\t/g, '  ');
  }

  return str;
}

/**
 * 格式化对象为JSON字符串用于显示
 */
function formatValue(value: unknown, indent = 0): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    // 检查是否是Python对象字符串格式
    if (value.includes('TextContent') || value.includes('content=') || value.includes('meta=')) {
      return formatPythonObjectString(value);
    }
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(v => '  '.repeat(indent + 1) + '- ' + formatValue(v, indent + 1));
    return '\n' + items.join('\n');
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const pairs = keys.map(key => {
      const formattedValue = formatValue((value as Record<string, unknown>)[key], indent + 1);
      return '  '.repeat(indent + 1) + `${key}: ${formattedValue}`;
    });
    return '\n' + pairs.join('\n');
  }
  return String(value);
}

/**
 * ToolCallIndicator - 显示工具调用的动画图标组件
 * 用于替换 [TOOL_CALL:call_xxx:status] 格式的文本标记
 */
export default function ToolCallIndicator({
  toolCallId,
  status = 'pending',
  animating = true,
  arguments: args,
  result
}: ToolCallIndicatorProps) {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const displayName = formatToolName(toolCallId);
  const statusClasses = getStatusClasses(status, animating);
  const shouldAnimate = status === 'pending' && animating;

  // 准备tooltip内容
  const hasArguments = args && Object.keys(args).length > 0;
  const hasResult = result !== undefined && result !== null && result !== '';
  const hasTooltipContent = hasArguments || hasResult;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border align-middle mx-1 relative ${statusClasses.container} ${hasTooltipContent ? 'cursor-help' : ''}`}
      onMouseEnter={() => hasTooltipContent && setIsTooltipOpen(true)}
      onMouseLeave={() => setIsTooltipOpen(false)}
      title={hasTooltipContent ? undefined : displayName}
    >
      {/* 齿轮图标 */}
      <svg
        className={`w-3.5 h-3.5 flex-shrink-0 ${shouldAnimate ? 'animate-spin-slow' : ''} ${status === 'error' ? 'text-red-600' : 'text-green-600'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {status === 'error' ? (
          // 错误图标：X
          <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </>
        ) : status === 'success' ? (
          // 成功图标：对勾
          <>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </>
        ) : (
          // 进行中：齿轮
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </>
        )}
      </svg>

      {/* 文本 */}
      <span className="whitespace-nowrap">
        {displayName}
      </span>

      {/* Tooltip */}
      {isTooltipOpen && hasTooltipContent && (
        <div className="absolute left-0 top-full mt-2 z-50 w-96 max-w-md">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-4 border border-gray-700">
            <div className="font-semibold mb-2 text-sm">{displayName}</div>

            {/* 参数部分 */}
            {hasArguments && (
              <div className="mb-3">
                <div className="text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  参数
                </div>
                <pre className="bg-gray-800 rounded p-2 overflow-x-auto text-gray-200 whitespace-pre-wrap">
                  {formatValue(args)}
                </pre>
              </div>
            )}

            {/* 结果部分 */}
            {hasResult && status !== 'pending' && (
              <div>
                <div className="text-gray-400 font-medium mb-1.5 flex items-center gap-1.5">
                  {status === 'error' ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      错误
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      结果
                    </>
                  )}
                </div>
                <pre className={`rounded p-2 overflow-x-auto whitespace-pre-wrap ${status === 'error' ? 'bg-red-900/30 text-red-200' : 'bg-gray-800 text-gray-200'}`}>
                  {typeof result === 'string' ? result : formatValue(result)}
                </pre>
              </div>
            )}

            {/* 调用中提示 */}
            {status === 'pending' && !hasResult && (
              <div className="text-gray-400 italic flex items-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                正在调用中...
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * 解析包含工具调用标记的文本，返回处理后的内容数组
 * 支持混合文本和工具调用标记的渲染
 * 支持格式：[TOOL_CALL:tool_name] 或 [TOOL_CALL:tool_name:status]
 */
export function parseToolCalls(content: string): Array<string | { type: 'tool_call'; id: string; status?: ToolCallStatus }> {
  const parts: Array<string | { type: 'tool_call'; id: string; status?: ToolCallStatus }> = [];
  const toolCallRegex = /\[TOOL_CALL:([a-zA-Z0-9_-]+)(?::(pending|success|error))?\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = toolCallRegex.exec(content)) !== null) {
    // 添加工具调用标记之前的普通文本
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text) {
        parts.push(text);
      }
    }

    // 添加工具调用标记
    const toolName = match[1];
    const status = match[2] as ToolCallStatus | undefined;
    parts.push({
      type: 'tool_call',
      id: toolName,
      status: status || 'pending',
    });

    lastIndex = match.index + match[0].length;
  }

  // 添加剩余的普通文本
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex);
    if (remainingText) {
      parts.push(remainingText);
    }
  }

  // 如果没有找到任何工具调用标记，返回原始内容
  if (parts.length === 0) {
    return [content];
  }

  return parts;
}
