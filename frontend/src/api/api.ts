import type {
  LoginPasswordRequest,
  LoginCodeRequest,
  RegisterRequest,
  SendVerificationRequest,
  AuthResponse,
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationsResponse,
  Message,
  AgentsResponse,
  MCPServer,
  Agent,
  ChatRequest,
  SSEEvent,
  APIError,
} from '../types/api';

// API base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_PATH = '/api/v1';

class API {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${API_PATH}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth APIs
  async loginWithPassword(data: LoginPasswordRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/user/login/password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async loginWithCode(data: LoginCodeRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/user/login/code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/user/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async verifyToken(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/verify');
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/refresh-token');
    this.setToken(response.access_token);
    return response;
  }

  async sendVerificationCode(
    type: 'register' | 'reset',
    data: SendVerificationRequest
  ): Promise<void> {
    await this.request(`/auth/send-verification/${type}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyVerificationCode(
    email: string,
    code: string
  ): Promise<{ message: string; valid: boolean }> {
    return this.request<{ message: string; valid: boolean }>('/auth/verify-verification', {
      method: 'POST',
      body: JSON.stringify({ email, verification_code: code }),
    });
  }

  // User APIs
  async updateUser(data: { password?: string }): Promise<{ message: string }> {
    return this.request('/user/update', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(): Promise<{ message: string }> {
    return this.request('/user/delete', {
      method: 'DELETE',
    });
  }

  // Helper method to parse tool_arguments from JSON string to object
  private parseToolArguments(toolArguments: string | null): Record<string, unknown> | null {
    if (!toolArguments) return null;
    try {
      return JSON.parse(toolArguments);
    } catch {
      return null;
    }
  }

  // Conversation APIs
  async createConversation(data: CreateConversationRequest): Promise<Conversation> {
    return this.request('/conversation', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getConversations(page = 1, pageSize = 20): Promise<ConversationsResponse> {
    return this.request(`/conversation?page=${page}&page_size=${pageSize}`);
  }

  async getConversation(conversationId: string): Promise<Conversation> {
    const conversation = await this.request<Conversation>(`/conversation/${conversationId}`);
    // Parse tool_arguments in messages if they exist
    if (conversation.messages) {
      conversation.messages = conversation.messages.map(msg => ({
        ...msg,
        tool_arguments: this.parseToolArguments(msg.tool_arguments as string | null),
      }));
    }
    return conversation;
  }

  async updateConversation(
    conversationId: string,
    data: UpdateConversationRequest
  ): Promise<Conversation> {
    return this.request(`/conversation/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteConversation(conversationId: string): Promise<{ message: string }> {
    return this.request(`/conversation/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    const messages = await this.request<Message[]>(`/conversation/${conversationId}/messages`);
    // Parse tool_arguments from JSON string to object
    return messages.map(msg => ({
      ...msg,
      tool_arguments: this.parseToolArguments(msg.tool_arguments as string | null),
    }));
  }

  // Agent APIs
  async getAgents(): Promise<AgentsResponse> {
    return this.request('/agent');
  }

  async getAgent(name: string): Promise<Agent> {
    return this.request(`/agent/${name}`);
  }

  // MCP APIs
  async getMCPServers(): Promise<MCPServer[]> {
    return this.request<MCPServer[]>('/mcp/servers');
  }

  async getMCPServer(name: string): Promise<MCPServer> {
    return this.request(`/mcp/servers/${name}`);
  }

  // Chat Streaming
  async *streamChat(data: ChatRequest): AsyncGenerator<SSEEvent> {
    const url = `${this.baseURL}${API_PATH}/chat/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: APIError = await response.json();
      throw new Error(error.detail || 'Request failed');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Response body is null');
    }

    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const event: SSEEvent = JSON.parse(jsonStr);
                yield event;
              } catch (e) {
                console.error('Failed to parse SSE event:', e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Export singleton instance
export const api = new API(API_BASE_URL);
