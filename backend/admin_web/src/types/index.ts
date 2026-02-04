// API Types
export interface MCPServer {
  name: string;
  description: string;
  running: boolean;
  tools: MCPTool[];
  tools_count: number;
  enabled: boolean;
  command: string;
  args: string[];
  enabled?: boolean;  // For local API only
  tools_count?: number;  // For local API only
  env?: Record<string, string>;  // For local API only
}

export interface MCPTool {
  tool_id: string;
  server_name: string;
  name: string;
  description: string;
}

// MCP servers list is returned as an array directly
export type MCPServersResponse = MCPServer[];

// Removed - this endpoint doesn't exist in API.md
// Use mcpApi.getServer(name) instead to get tools for a specific server

export interface Agent {
  name: string;
  description: string;
  model: string;
  mcp_services: string[];
  system_prompt?: string;  // Only included in detailed agent response
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
