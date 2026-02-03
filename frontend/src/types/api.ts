// User Types
export interface User {
  id: string;
  email: string;
}

// Auth Types
export interface LoginPasswordRequest {
  email: string;
  password: string;
}

export interface LoginCodeRequest {
  email: string;
  verification_code: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  verification_code: string;
}

export interface SendVerificationRequest {
  email: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// Conversation Types
export interface Conversation {
  id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface CreateConversationRequest {
  title: string;
  model?: string;
}

export interface UpdateConversationRequest {
  title?: string;
}

export interface ConversationsResponse {
  items: Conversation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Message Types
export type MessageType = 'message';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  conversation_id: string;
  message_type: MessageType;
  tool_call_id: string | null;
  tool_name: string | null;
  tool_arguments: Record<string, unknown> | null;
  tool_error: boolean;
}

// Agent Types
export interface Agent {
  name: string;
  description: string;
  model: string;
  system_prompt?: string;
  mcp_services: string[];
}

export interface AgentsResponse {
  agents: Record<string, Agent>;
}

// MCP Types
export interface MCPTool {
  tool_id: string;
  server_name: string;
  name: string;
  description: string;
}

export interface MCPServer {
  name: string;
  description: string;
  running: boolean;
  tools: MCPTool[];
  command: string;
  args: string[];
}

// Chat Types
export interface ChatRequest {
  conversation_id: string | null;
  message: string;
  agent: string;
  mcp_services?: string[];
}

// SSE Event Types
export type SSEEventType = 'content' | 'tool_call' | 'tool_result' | 'end' | 'error';

export interface SSEContentEvent {
  type: 'content';
  content: string;
}

export interface SSEToolCallEvent {
  type: 'tool_call';
  tool?: string;
  tool_call_id?: string;
  args?: Record<string, unknown>;
}

export interface SSEToolResultEvent {
  type: 'tool_result';
  result: Record<string, unknown>;
}

export interface SSEEndEvent {
  type: 'end';
}

export interface SSEErrorEvent {
  type: 'error';
  message: string;
}

export type SSEEvent = SSEContentEvent | SSEToolCallEvent | SSEToolResultEvent | SSEEndEvent | SSEErrorEvent;

// Error Type
export interface APIError {
  detail: string;
}
