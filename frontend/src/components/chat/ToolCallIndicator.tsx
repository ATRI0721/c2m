export type ToolCallStatus = 'pending' | 'success' | 'error';

interface ToolCallIndicatorProps {
  toolCallId: string;
  status?: ToolCallStatus;
  animating?: boolean;
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
 * ToolCallIndicator - 显示工具调用的动画图标组件
 * 用于替换 [TOOL_CALL:call_xxx:status] 格式的文本标记
 */
export default function ToolCallIndicator({
  toolCallId,
  status = 'pending',
  animating = true
}: ToolCallIndicatorProps) {
  const displayName = formatToolName(toolCallId);
  const statusClasses = getStatusClasses(status, animating);
  const shouldAnimate = status === 'pending' && animating;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border align-middle mx-1 ${statusClasses.container}`}>
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
