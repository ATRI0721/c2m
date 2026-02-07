import { create } from 'zustand';
import type { Conversation, Message } from '../types/api';
import { api } from '../api/api';

// 临时消息ID前缀，用于标识未持久化的消息
const TEMP_ID_PREFIX = 'temp_';

// 判断是否为临时ID
export const isTempId = (id: string): boolean => id.startsWith(TEMP_ID_PREFIX);

// 生成临时消息ID
export const generateTempId = (): string => `${TEMP_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

interface ChatState {
  // State
  conversations: Conversation[];
  messages: Message[];
  currentConversationId: string | null;
  isStreaming: boolean;
  streamingContent: string; // 实时累积的流式内容
  streamingMessageId: string | null; // ID of the message currently being streamed
  streamingError: string | null; // 流式传输错误信息
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // Actions - Conversations
  loadConversations: () => Promise<void>;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;
  updateConversationTimestamp: (id: string) => void;

  // Actions - Messages
  loadMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  updateMessagesConversationId: (oldConversationId: string, newConversationId: string) => void;
  clearMessages: () => void;

  // Actions - Streaming (改进的流式管理)
  startStreaming: (messageId: string) => void;
  stopStreaming: (preserveContent?: boolean) => void;
  appendStreamingContent: (content: string) => void;
  setStreamingError: (error: string | null) => void;
  finalizeStreamingMessage: (messageId: string, realId?: string) => void;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  conversations: [],
  messages: [],
  currentConversationId: null,
  isStreaming: false,
  streamingContent: '',
  streamingMessageId: null,
  streamingError: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
};

export const useChatStore = create<ChatState>((set, get) => ({
  ...initialState,

  // Conversations
  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const response = await api.getConversations(1, 50);
      set({ conversations: response.items });
    } catch (error) {
      console.error('[ChatStore] Failed to load conversations:', error);
    } finally {
      set({ isLoadingConversations: false });
    }
  },

  addConversation: (conversation) => {
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));
  },

  removeConversation: (id) => {
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      messages: state.currentConversationId === id ? [] : state.messages,
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    }));
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
  },

  updateConversationTimestamp: (id) => {
    set((state) => {
      const convIndex = state.conversations.findIndex((c) => c.id === id);
      if (convIndex === -1) return state;

      const updatedConv = {
        ...state.conversations[convIndex],
        updated_at: new Date().toISOString(),
      };

      const newConversations = [
        updatedConv,
        ...state.conversations.filter((c) => c.id !== id),
      ];

      return { conversations: newConversations };
    });
  },

  // Messages
  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await api.getConversationMessages(conversationId);
      console.log('[ChatStore] Loaded', messages.length, 'messages for conversation', conversationId);
      set({ messages, isLoadingMessages: false });
    } catch (error) {
      console.error('[ChatStore] Failed to load messages:', error);
      set({ messages: [], isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  // Update all messages' conversation_id (used after creating a new conversation)
  updateMessagesConversationId: (oldConversationId: string, newConversationId: string) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.conversation_id === oldConversationId
          ? { ...msg, conversation_id: newConversationId }
          : msg
      ),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  // Streaming - 改进的流式状态管理
  startStreaming: (messageId) => {
    console.log('[ChatStore] Starting streaming for message:', messageId);
    set({
      isStreaming: true,
      streamingContent: '',
      streamingMessageId: messageId,
      streamingError: null,
    });
  },

  stopStreaming: (preserveContent = false) => {
    console.log('[ChatStore] Stopping streaming, preserveContent:', preserveContent);
    set((state) => ({
      isStreaming: false,
      streamingMessageId: null,
      // 保留内容用于显示，直到下次发送
      streamingContent: preserveContent ? state.streamingContent : '',
      streamingError: null,
    }));
  },

  appendStreamingContent: (content: string) => {
    set((state) => ({
      streamingContent: state.streamingContent + content,
    }));
  },

  setStreamingError: (error: string | null) => {
    set({ streamingError: error });
  },

  finalizeStreamingMessage: (messageId: string, realId?: string) => {
    console.log('[ChatStore] Finalizing streaming message:', messageId, 'realId:', realId);
    const state = get();
    const { streamingContent } = state;

    // 如果提供了真实ID，更新消息的ID（用于替换临时ID）
    // 同时更新消息内容为流式累积的内容
    set((state) => ({
      messages: state.messages.map((msg) => {
        if (msg.id === messageId) {
          const updatedMsg: Message = {
            ...msg,
            content: streamingContent,
          };
          // 如果提供了真实ID，替换临时ID
          if (realId && isTempId(msg.id)) {
            updatedMsg.id = realId;
          }
          return updatedMsg;
        }
        return msg;
      }),
    }));

    // 清空流式内容
    set({ streamingContent: '' });
  },

  // Reset
  reset: () => {
    set(initialState);
  },
}));
