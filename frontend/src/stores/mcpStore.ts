import { create } from 'zustand';
import type { Agent, MCPServer } from '../types/api';
import { api } from '../api/api';

interface MCPState {
  // State
  agents: Agent[];
  mcpServers: MCPServer[];
  selectedAgent: string;
  enabledServices: string[];

  // Actions
  loadAgents: () => Promise<void>;
  loadMcpServers: () => Promise<void>;
  setSelectedAgent: (agentName: string) => void;
  toggleService: (serviceName: string) => void;
  updateEnabledServices: (services: string[]) => void;

  // Getters
  getCurrentAgent: () => Agent | undefined;
  getRequiredServices: () => string[];
  getOptionalServices: () => string[];
  getAvailableServices: () => string[];

  // Reset
  reset: () => void;
}

const initialState = {
  agents: [],
  mcpServers: [],
  selectedAgent: 'chat',
  enabledServices: [],
};

export const useMcpStore = create<MCPState>((set, get) => ({
  ...initialState,

  // Loaders
  loadAgents: async () => {
    try {
      const response = await api.getAgents();
      const agentList = Object.values(response.agents) as Agent[];
      set({ agents: agentList });
      // Initialize enabled services for default agent
      const defaultAgent = agentList.find((a) => a.name === 'chat');
      if (defaultAgent) {
        set({ enabledServices: defaultAgent.mcp_services });
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  },

  loadMcpServers: async () => {
    try {
      const servers = await api.getMCPServers();
      set({ mcpServers: servers });
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  },

  // Agent selection
  setSelectedAgent: (agentName) => {
    set({ selectedAgent: agentName });
    // Update enabled services when agent changes
    const { agents } = get();
    const agent = agents.find((a) => a.name === agentName);
    if (agent) {
      set({ enabledServices: agent.mcp_services });
    }
  },

  // Service management
  toggleService: (serviceName) => {
    const { enabledServices, agents, selectedAgent } = get();
    const currentAgent = agents.find((a) => a.name === selectedAgent);
    const requiredServices = currentAgent?.mcp_services || [];

    // Prevent toggling required services
    if (requiredServices.includes(serviceName)) {
      return;
    }

    set({
      enabledServices: enabledServices.includes(serviceName)
        ? enabledServices.filter((s) => s !== serviceName)
        : [...enabledServices, serviceName],
    });
  },

  updateEnabledServices: (services) => {
    set({ enabledServices: services });
  },

  // Getters
  getCurrentAgent: () => {
    const { agents, selectedAgent } = get();
    return agents.find((a) => a.name === selectedAgent);
  },

  getRequiredServices: () => {
    const agent = get().getCurrentAgent();
    return agent?.mcp_services || [];
  },

  getOptionalServices: () => {
    const { enabledServices } = get();
    const requiredServices = get().getRequiredServices();
    return enabledServices.filter((s) => !requiredServices.includes(s));
  },

  getAvailableServices: () => {
    const { mcpServers, enabledServices } = get();
    return mcpServers
      .filter((server) => !enabledServices.includes(server.name))
      .map((server) => server.name);
  },

  // Reset
  reset: () => {
    set(initialState);
  },
}));
