import { create } from 'zustand';
import type { Conversation, Message, SSEEvent } from '../types/api';
import { api } from '../api/api';

interface ChatState {
  // State
  conversations: Conversation[];
  messages: Message[];
  currentConversationId: string | null;
  isStreaming: boolean;
  streamingEvents: SSEEvent[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // Actions - Conversations
  loadConversations: () => Promise<void>;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  setCurrentConversation: (id: string | null) => void;

  // Actions - Messages
  loadMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  clearMessages: () => void;

  // Actions - Streaming
  startStreaming: () => void;
  stopStreaming: () => void;
  addStreamingEvent: (event: SSEEvent) => void;
  clearStreamingEvents: () => void;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  conversations: [],
  messages: [],
  currentConversationId: null,
  isStreaming: false,
  streamingEvents: [],
  isLoadingConversations: false,
  isLoadingMessages: false,
};

export const useChatStore = create<ChatState>((set) => ({
  ...initialState,

  // Conversations
  loadConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const response = await api.getConversations(1, 50);
      set({ conversations: response.items });
    } catch (error) {
      console.error('Failed to load conversations:', error);
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
      // Clear messages if current conversation is deleted
      messages: state.currentConversationId === id ? [] : state.messages,
      currentConversationId:
        state.currentConversationId === id ? null : state.currentConversationId,
    }));
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id });
  },

  // Messages
  loadMessages: async (conversationId) => {
    set({ isLoadingMessages: true });
    try {
      const messages = await api.getConversationMessages(conversationId);
      console.log('[ChatStore] Loaded', messages.length, 'messages');
      console.log(messages)
      set({ messages });
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ messages: [] });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  // Streaming
  startStreaming: () => {
    set({ isStreaming: true, streamingEvents: [] });
  },

  stopStreaming: () => {
    set({ isStreaming: false, streamingEvents: [] });
  },

  addStreamingEvent: (event) => {
    set((state) => ({
      streamingEvents: [...state.streamingEvents, event],
    }));
  },

  clearStreamingEvents: () => {
    set({ streamingEvents: [] });
  },

  // Reset
  reset: () => {
    set(initialState);
  },
}));
