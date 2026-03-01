import type {
  AgentsResponse,
  MCPServersResponse,
  MCPToolsResponse,
  WhitelistConfig,
  WhitelistResponse,
  MCPServer,
} from '@/types';

async function localRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/local-api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Local API request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

type LocalMcpServersFile = {
  mcpServers?: Record<
    string,
    {
      command: string;
      args?: string[];
      description?: string;
      env?: Record<string, string>;
      enabled?: boolean;
    }
  >;
};

type LocalMcpServerConfig = NonNullable<LocalMcpServersFile['mcpServers']>[string];

async function getServersFile(): Promise<LocalMcpServersFile> {
  return localRequest<LocalMcpServersFile>('/mcp-servers');
}

async function saveServersFile(file: LocalMcpServersFile): Promise<void> {
  await localRequest('/mcp-servers', {
    method: 'POST',
    body: JSON.stringify(file),
  });
}

function toMcpServersResponse(file: LocalMcpServersFile): MCPServersResponse {
  const raw = file.mcpServers ?? {};
  const servers: Record<string, MCPServer> = {};

  for (const [name, cfg] of Object.entries(raw)) {
    const enabled = cfg.enabled ?? true;
    servers[name] = {
      name,
      description: cfg.description ?? '',
      running: false,
      tools: [],
      tools_count: 0,
      enabled,
      command: cfg.command,
      args: cfg.args ?? [],
    };
  }

  return {
    servers,
    total_servers: Object.keys(servers).length,
    total_tools: 0,
  };
}

export const localMcpApi = {
  async getServers(): Promise<MCPServersResponse> {
    const file = await getServersFile();
    return toMcpServersResponse(file);
  },

  async getTools(): Promise<MCPToolsResponse> {
    return { tools: [], total: 0 };
  },

  async setEnabled(serverName: string, enabled: boolean): Promise<void> {
    const file = await getServersFile();
    file.mcpServers ??= {};
    if (!file.mcpServers[serverName]) return;
    file.mcpServers[serverName] = { ...file.mcpServers[serverName], enabled };
    await saveServersFile(file);
  },

  async upsertServer(name: string, config: LocalMcpServerConfig): Promise<void> {
    const file = await getServersFile();
    file.mcpServers ??= {};
    file.mcpServers[name] = config;
    await saveServersFile(file);
  },

  async importServersFromJson(json: unknown, options: { overwrite?: boolean } = {}): Promise<void> {
    const overwrite = options.overwrite ?? true;
    const file = await getServersFile();
    file.mcpServers ??= {};

    if (typeof json === 'object' && json !== null && 'mcpServers' in json) {
      const mcpServers = (json as any).mcpServers;
      if (typeof mcpServers !== 'object' || mcpServers === null) {
        throw new Error('Invalid JSON: mcpServers must be an object');
      }
      for (const [name, cfg] of Object.entries(mcpServers as Record<string, any>)) {
        if (!overwrite && file.mcpServers[name]) continue;
        if (!cfg || typeof cfg !== 'object') continue;
        if (typeof (cfg as any).command !== 'string') continue;
        file.mcpServers[name] = {
          command: (cfg as any).command,
          args: Array.isArray((cfg as any).args) ? (cfg as any).args : undefined,
          description: typeof (cfg as any).description === 'string' ? (cfg as any).description : undefined,
          env: typeof (cfg as any).env === 'object' && (cfg as any).env !== null ? (cfg as any).env : undefined,
          enabled: typeof (cfg as any).enabled === 'boolean' ? (cfg as any).enabled : undefined,
        };
      }
      await saveServersFile(file);
      return;
    }

    if (typeof json === 'object' && json !== null && 'name' in json) {
      const obj = json as any;
      if (typeof obj.name !== 'string' || !obj.name.trim()) throw new Error('Invalid JSON: missing name');
      if (typeof obj.command !== 'string' || !obj.command.trim()) throw new Error('Invalid JSON: missing command');
      const name = obj.name.trim();
      if (!overwrite && file.mcpServers[name]) return;
      file.mcpServers[name] = {
        command: obj.command,
        args: Array.isArray(obj.args) ? obj.args : undefined,
        description: typeof obj.description === 'string' ? obj.description : undefined,
        env: typeof obj.env === 'object' && obj.env !== null ? obj.env : undefined,
        enabled: typeof obj.enabled === 'boolean' ? obj.enabled : undefined,
      };
      await saveServersFile(file);
      return;
    }

    throw new Error('Unsupported JSON format');
  },
};

export const localAgentApi = {
  async getAgents(): Promise<AgentsResponse> {
    return localRequest<AgentsResponse>('/agents');
  },

  async updateAgents(next: AgentsResponse): Promise<void> {
    await localRequest('/agents', { method: 'POST', body: JSON.stringify(next) });
  },
};

export const localWhitelistApi = {
  async getConfig(): Promise<WhitelistResponse> {
    return localRequest<WhitelistResponse>('/whitelist');
  },

  async updateConfig(next: WhitelistConfig): Promise<void> {
    await localRequest('/whitelist', { method: 'POST', body: JSON.stringify(next) });
  },
};



