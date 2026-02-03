import { CheckCircle2, XCircle, Wrench, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useState } from 'react';
import { parseToolResult } from '@/api/toolResultParser';

interface ToolCallCardProps {
  toolId: string;
  toolName: string;
  arguments: Record<string, any>;
  result?: string;
  error?: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
}

export function ToolCallCard({
  toolId,
  toolName,
  arguments: args,
  result,
  error,
  status,
  duration,
}: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract server name and function name from toolId
  const [server, func] = toolId.split(':');

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      label: '等待中',
    },
    running: {
      icon: Wrench,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      label: '执行中',
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      label: '完成',
    },
    failed: {
      icon: XCircle,
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      label: '失败',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Parse the result for better display
  const parsedResult = result ? parseToolResult(result) : null;

  return (
    <div className={`my-3 overflow-hidden transition-all duration-300 tool-call-enter ${
      status === 'running' ? 'tool-call-pulse' : ''
    }`}>
      {/* Tool Call Header */}
      <div
        onClick={() => result && setIsExpanded(!isExpanded)}
        className={`flex items-center gap-3 p-3 bg-gradient-to-r from-[#0a0a0f] to-[#0f0a0f] border ${config.border} cursor-${
          result ? 'pointer' : 'default'
        } hover:from-[#0f0f1a] hover:to-[#1a0f0f] transition-all duration-200`}
      >
        {/* Status Icon with Glow */}
        <div className={`relative ${config.bg} p-2 border ${config.border} rounded-sm`}>
          <div className={`absolute inset-0 ${config.color} opacity-20 blur-sm animate-pulse`} />
          <StatusIcon className={`h-4 w-4 ${config.color} relative`} />
        </div>

        {/* Tool Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="mono-label text-[10px] text-muted-foreground">
              {server}
            </span>
            <span className="text-muted-foreground/30">→</span>
            <span className="font-mono text-sm font-medium text-foreground/90">
              {func}
            </span>
            {status === 'running' && (
              <span className="ml-auto flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
          <div className={`text-xs ${config.color} mono-label`}>
            {config.label}
            {duration !== undefined && ` (${duration}ms)`}
          </div>
        </div>

        {/* Expand Toggle */}
        {result && (
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && result && (
        <div className="mt-2 p-3 bg-black/40 border border-border/60 border-t-0 space-y-3">
          {/* Arguments Section */}
          <div>
            <div className="mono-label text-[10px] text-muted-foreground mb-2">
              // ARGUMENTS
            </div>
            <div className="space-y-1">
              {Object.entries(args).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs font-mono">
                  <span className="text-primary/70">{key}:</span>
                  <span className="text-foreground/70">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result Section */}
          {parsedResult && (
            <div>
              <div className="mono-label text-[10px] text-muted-foreground mb-2 flex items-center justify-between">
                <span>// RESULT</span>
                <span className="text-[9px] text-muted-foreground/60">
                  {parsedResult.formatted.length} chars
                </span>
              </div>
              <div
                className={`text-xs font-mono p-3 border ${
                  error
                    ? 'bg-rose-500/5 border-rose-500/20 text-rose-300/90'
                    : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300/90'
                } rounded`}
              >
                <pre className="max-h-96 overflow-y-auto overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {parsedResult.formatted}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
