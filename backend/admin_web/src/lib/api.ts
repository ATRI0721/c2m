import type { LoginRequest, LoginResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_PREFIX = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

export interface Conversation {
  id: string;
  title: string;
  model?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationsResponse {
  items: Conversation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ConversationMessage {
  id: string;
  created_at: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return request<LoginResponse>('/user/login/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verify(): Promise<LoginResponse> {
    return request<LoginResponse>('/auth/verify');
  },
};

export const conversationApi = {
  async createConversation(title: string, model?: string): Promise<Conversation> {
    return request<Conversation>('/conversation', {
      method: 'POST',
      body: JSON.stringify({ title, model }),
    });
  },

  async getConversations(page = 1, pageSize = 20): Promise<ConversationsResponse> {
    return request<ConversationsResponse>(`/conversation?page=${page}&page_size=${pageSize}`);
  },

  async getMessages(conversationId: string): Promise<ConversationMessage[]> {
    return request<ConversationMessage[]>(`/conversation/${conversationId}/messages`);
  },

  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/conversation/${conversationId}`, {
      method: 'DELETE',
    });
  },
};



