import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({ onSendMessage, disabled = false, placeholder = '输入消息...' }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [hasOverflow, setHasOverflow] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea and detect overflow
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      // Check if content overflows
      setHasOverflow(textarea.scrollHeight > 200);
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSendMessage(trimmed);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-surface-200 bg-white p-4">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={`w-full px-5 py-4 pr-12 rounded-2xl border-2 border-surface-300 bg-surface-50 text-gray-900 resize-none focus:outline-none focus:ring-0 focus:border-primary-400 focus:bg-white disabled:opacity-50 transition-all text-base placeholder:text-gray-500 shadow-sm ${
              hasOverflow ? 'overflow-y-auto' : 'overflow-y-hidden'
            }`}
            style={{ maxHeight: '200px' }}
          />
          {/* Character count indicator (when approaching limit) */}
          {message.length > 400 && (
            <div className={`absolute bottom-3 right-14 text-xs ${
              message.length > 490 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {message.length}/500
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-primary text-white flex items-center justify-center hover:shadow-medium hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200"
        >
          {disabled ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500 text-center">
        按 Enter 发送，Shift + Enter 换行
      </p>
    </form>
  );
}
