import type { Conversation } from '../../types/api';
import { useNavigate } from 'react-router-dom';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onLoadConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onCreateNew: () => void;
  isLoading: boolean;
}

export default function ConversationList({
  conversations,
  currentConversationId,
  onLoadConversation,
  onDeleteConversation,
  onCreateNew,
  isLoading,
}: ConversationListProps) {
  const navigate = useNavigate();

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      await onDeleteConversation(id);
      if (currentConversationId === id) {
        navigate('/chat');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-100 border-r border-surface-300">
      {/* Header */}
      <div className="p-4 border-b border-surface-300">
        <button
          onClick={onCreateNew}
          className="btn btn-primary w-full"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            暂无对话
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onLoadConversation(conv.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLoadConversation(conv.id);
                  }
                }}
                className={`w-full text-left p-3 rounded-xl transition-all group cursor-pointer ${
                  currentConversationId === conv.id
                    ? 'bg-primary-50 border border-primary-300 shadow-soft'
                    : 'hover:bg-white border border-transparent'
                }`}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-medium truncate ${
                      currentConversationId === conv.id ? 'text-primary-700' : 'text-gray-700'
                    }`}>
                      {conv.title || '新对话'}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conv.updated_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded-lg transition-all"
                    type="button"
                    title="删除对话"
                  >
                    <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
