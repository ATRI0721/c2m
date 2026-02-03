import { MCPServerList } from '@/components/MCPServerList';
import { AgentList } from '@/components/AgentList';
import { AIAssistant } from '@/components/AIAssistant';
import { WhitelistManager } from '@/components/WhitelistManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MCPServersResponse, AgentsResponse } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { mcpApi } from '@/api/api';
import { localMcpApi, localAgentApi } from '@/api/localApi';
import { AgentForm } from '@/components/AgentForm';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Activity, Zap, Shield } from 'lucide-react';

export function Dashboard({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agentFormOpen, setAgentFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  const { data: mcpData, refetch: refetchMcp, isLoading: mcpLoading } = useQuery<MCPServersResponse>({
    queryKey: ['mcp-servers'],
    queryFn: async () => {
      // 从后端 API 获取真实的 MCP 服务器列表（包含 tools 信息）
      const backendServers = await mcpApi.getServers();
      // 从本地 API 获取配置数据
      const localConfig = await localMcpApi.getServers();

      // 合并数据：后端数据为主，本地配置为辅
      const servers: any = {};
      let totalTools = 0;

      // 使用后端返回的服务器数据（包含真实的 tools 信息）
      backendServers.forEach((server: any) => {
        servers[server.name] = {
          ...server,
          enabled: localConfig.servers?.[server.name]?.enabled ?? true,
        };
        totalTools += server.tools?.length || 0;
      });

      return {
        servers,
        total_servers: Object.keys(servers).length,
        total_tools: totalTools,
      };
    },
  });

  const { data: agentsData, refetch: refetchAgents, isLoading: agentsLoading } = useQuery<AgentsResponse>({
    queryKey: ['agents'],
    queryFn: () => localAgentApi.getAgents(),
  });

  const handleAgentSubmit = async (agent: any) => {
    try {
      // Get current agents
      const currentData = await localAgentApi.getAgents();

      if (editingAgent) {
        // Update existing agent
        currentData.agents[editingAgent] = {
          ...agent,
          name: editingAgent,  // 保持原有名称作为key
        };
      } else {
        // Create new agent
        const newAgentName = agent.name.trim();  // 使用用户输入的名称
        if (!newAgentName) {
          alert('Agent名称不能为空');
          return;
        }
        if (currentData.agents[newAgentName]) {
          alert(`Agent "${newAgentName}" 已存在`);
          return;
        }
        currentData.agents[newAgentName] = {
          ...agent,
          name: newAgentName,
        };
      }

      // Save updated agents
      await localAgentApi.updateAgents(currentData);

      setAgentFormOpen(false);
      setEditingAgent(null);
      refetchAgents();
    } catch (error) {
      console.error('Failed to save agent:', error);
      alert('保存Agent失败，请重试');
    }
  };

  const handleDeleteAgent = async (name: string) => {
    try {
      // Get current agents
      const currentData = await localAgentApi.getAgents();

      // Delete agent
      delete currentData.agents[name];

      // Save updated agents
      await localAgentApi.updateAgents(currentData);

      refetchAgents();
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('删除Agent失败，请重试');
    }
  };

  const renderDashboard = () => {
    const serverCount = mcpData?.total_servers || 0;
    const agentCount = Object.keys(agentsData?.agents || {}).length;
    const toolCount = mcpData?.total_tools || 0;

    return (
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="glass border-accent-l p-6 scanline">
          <div className="flex items-start justify-between">
            <div>
              <div className="mono-label mb-2">// ADMIN_CONSOLE_V1.0</div>
              <h2 className="text-3xl font-bold font-display gradient-text mb-2">Code2MCP</h2>
              <p className="text-muted-foreground">
                统一管理 MCP 服务和 AI 助手
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="status-dot status-online" />
              <span className="text-xs text-muted-foreground font-mono">SYSTEM_ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass p-5 border-accent-l">
            <div className="flex items-start justify-between">
              <div className="mono-label">MCP_SERVERS</div>
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div className="text-4xl font-bold font-mono mt-3 text-primary">
              {mcpLoading ? '—' : serverCount}
            </div>
            <div className="text-sm text-muted-foreground mt-1">已注册服务</div>
          </div>

          <div className="glass p-5 border-l-2 border-l-secondary">
            <div className="flex items-start justify-between">
              <div className="mono-label">AI_AGENTS</div>
              <Activity className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-4xl font-bold font-mono mt-3 text-secondary">
              {agentsLoading ? '—' : agentCount}
            </div>
            <div className="text-sm text-muted-foreground mt-1">活动助手</div>
          </div>

          <div className="glass p-5 border-l-2 border-l-emerald-500">
            <div className="flex items-start justify-between">
              <div className="mono-label">TOOLS</div>
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-4xl font-bold font-mono mt-3 text-emerald-500">
              {mcpLoading ? '—' : toolCount}
            </div>
            <div className="text-sm text-muted-foreground mt-1">可用工具</div>
          </div>

          <div className="glass p-5 border-l-2 border-l-amber-500">
            <div className="flex items-start justify-between">
              <div className="mono-label">STATUS</div>
              <Activity className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono mt-3 text-amber-500 flex items-center gap-2">
              <span className="status-dot status-online" />
              ACTIVE
            </div>
            <div className="text-sm text-muted-foreground mt-1">系统状态</div>
          </div>
        </div>

        {/* AI Assistant */}
        <AIAssistant />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-grid-pattern">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-background/95 backdrop-blur-sm border-r border-border/60">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="font-bold font-display text-lg">Code2MCP</h1>
                <div className="mono-label text-[10px]">v1.0.0</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {[
              { id: 'dashboard', label: '仪表盘', icon: '┌─┐' },
              { id: 'mcp', label: 'MCP 服务', icon: '┌╴┐' },
              { id: 'agents', label: 'Agent 管理', icon: '◈' },
              { id: 'whitelist', label: '白名单', icon: '▣' },
              { id: 'ai', label: 'AI 辅助', icon: '✦' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-all duration-150 ${
                  activeTab === item.id
                    ? 'bg-primary/10 text-primary border-l-2 border-l-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border-l-2 border-l-transparent'
                }`}
              >
                <span className="font-mono text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border/60">
            <div className="mono-label text-[10px] text-muted-foreground/60">
              <div>BUILD: 2024.01</div>
              <div>MODE: PRODUCTION</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        <div className="max-w-7xl mx-auto p-8">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'mcp' && (
            <div className="space-y-6">
              <div className="section-header">
                <div className="mono-label">01</div>
                <h2 className="section-title gradient-text">MCP 服务管理</h2>
                <div className="flex-1" />
              </div>
              <p className="text-sm text-muted-foreground -mt-4 mb-6">
                管理和配置您的 Model Context Protocol 服务
              </p>
              {mcpData && <MCPServerList data={mcpData} onUpdate={() => refetchMcp()} />}
            </div>
          )}
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between section-header">
                <div className="flex items-center gap-3">
                  <div className="mono-label">02</div>
                  <h2 className="section-title gradient-text">Agent 管理</h2>
                </div>
                <Button onClick={() => setAgentFormOpen(true)} className="font-mono text-xs">
                  <Plus className="h-4 w-4 mr-2" />
                  NEW_AGENT
                </Button>
              </div>
              <p className="text-sm text-muted-foreground -mt-4 mb-6">
                创建和管理您的 AI 助手
              </p>
              {agentsData && (
                <AgentList
                  data={agentsData}
                  onEdit={(name) => {
                    setEditingAgent(name);
                    setAgentFormOpen(true);
                  }}
                  onDelete={handleDeleteAgent}
                />
              )}
              <AgentForm
                open={agentFormOpen}
                onClose={() => {
                  setAgentFormOpen(false);
                  setEditingAgent(null);
                }}
                onSubmit={handleAgentSubmit}
                agent={editingAgent ? agentsData?.agents[editingAgent] : undefined}
                availableServices={Object.keys(mcpData?.servers || {})}
              />
            </div>
          )}
          {activeTab === 'whitelist' && (
            <div className="space-y-6">
              <div className="section-header">
                <div className="mono-label">03</div>
                <h2 className="section-title gradient-text">白名单管理</h2>
              </div>
              <p className="text-sm text-muted-foreground -mt-4 mb-6">
                控制前端可见的 Agent 和 MCP 服务器
              </p>
              <WhitelistManager />
            </div>
          )}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="section-header">
                <div className="mono-label">04</div>
                <h2 className="section-title gradient-text">AI 配置助手</h2>
              </div>
              <AIAssistant />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
