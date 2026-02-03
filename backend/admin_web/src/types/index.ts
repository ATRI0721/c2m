// API Types
export interface MCPServer {
  name: string;
  description: string;
  running: boolean;
  tools: MCPTool[];
  command: string;
  args: string[];
}

export interface MCPTool {
  tool_id: string;
  server_name: string;
  name: string;
  description: string;
}

export interface MCPServersResponse {
  servers: Record<string, MCPServer>;
  total_servers: number;
  total_tools: number;
}

export interface MCPToolsResponse {
  tools: MCPTool[];
  total: number;
}

export interface Agent {
  name: string;
  description: string;
  model: string;
  mcp_services: string[];
  enable_tool_calling: boolean;
  system_prompt?: string;
}

export interface AgentsResponse {
  agents: Record<string, Agent>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

// Whitelist Types
export interface WhitelistConfig {
  public_agents: string[];
  public_mcp_servers: string[];
  admin_agents: string[];
}

export interface WhitelistResponse {
  config: WhitelistConfig;
  available_agents: string[];
  available_mcp_servers: string[];
}
