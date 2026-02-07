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

  // Chat Streaming - 改进的流式传输处理
  async *streamChat(data: ChatRequest): AsyncGenerator<SSEEvent> {
    const url = `${this.baseURL}${API_PATH}/chat/stream`;
    let response: Response | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      response = await fetch(url, {
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

      reader = response.body?.getReader() || null;
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let buffer = '';
      let lineNumber = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[API] Stream completed, total lines:', lineNumber);
          break;
        }

        // 解码并追加到缓冲区
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // 保留最后一个不完整的行
        buffer = lines.pop() || '';

        for (const line of lines) {
          lineNumber++;

          // 跳过空行和注释
          if (!line.trim() || line.startsWith(':')) {
            continue;
          }

          // 解析 SSE 格式: data: {json}
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr) {
              try {
                const event: SSEEvent = JSON.parse(jsonStr);

                // 处理错误事件
                if (event.type === 'error') {
                  console.error('[API] Stream error event:', event);
                  yield event;
                  return; // 错误事件后终止流
                }

                // 处理结束事件
                if (event.type === 'end') {
                  console.log('[API] Received end event');
                  yield event;
                  return;
                }

                // 正常事件
                yield event;
              } catch (e) {
                // 记录解析错误但继续处理
                console.warn('[API] Failed to parse SSE event at line', lineNumber, ':', e);
                console.warn('[API] Invalid JSON:', jsonStr);

                // 尝试清理损坏的JSON并重试
                try {
                  const cleaned = jsonStr.replace(/\\n/g, '\\\\n').replace(/\\r/g, '\\\\r');
                  const event: SSEEvent = JSON.parse(cleaned);
                  yield event;
                } catch {
                  // 如果还是失败，跳过这个事件继续处理
                  continue;
                }
              }
            }
          }
        }
      }

      // 处理缓冲区中剩余的内容
      if (buffer.trim()) {
        console.warn('[API] Unprocessed data in buffer:', buffer);
      }
    } catch (error) {
      console.error('[API] Stream error:', error);
      throw error;
    } finally {
      // 确保reader被正确释放，防止内存泄漏
      if (reader) {
        try {
          reader.releaseLock();
        } catch (e) {
          console.warn('[API] Error releasing reader lock:', e);
        }
      }
    }
  }
}

// Export singleton instance
export const api = new API(API_BASE_URL);
