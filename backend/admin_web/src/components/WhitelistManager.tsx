import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, RefreshCw, AlertTriangle, Terminal } from 'lucide-react';
import { WhitelistResponse } from '@/types';
import { localWhitelistApi } from '@/api/localApi';

export function WhitelistManager() {
  const [whitelistData, setWhitelistData] = useState<WhitelistResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedMcpServers, setSelectedMcpServers] = useState<Set<string>>(new Set());
  const [selectedAdminAgents, setSelectedAdminAgents] = useState<Set<string>>(new Set());

  const loadWhitelist = async () => {
    setIsLoading(true);
    try {
      const data = await localWhitelistApi.getConfig();
      setWhitelistData(data);
      setSelectedAgents(new Set(data.config.public_agents));
      setSelectedMcpServers(new Set(data.config.public_mcp_servers));
      setSelectedAdminAgents(new Set(data.config.admin_agents));
    } catch (error) {
      console.error('Failed to load whitelist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  const handleToggleAgent = (agentName: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentName)) {
      newSelected.delete(agentName);
    } else {
      newSelected.add(agentName);
    }
    setSelectedAgents(newSelected);
  };

  const handleToggleMcpServer = (serverName: string) => {
    const newSelected = new Set(selectedMcpServers);
    if (newSelected.has(serverName)) {
      newSelected.delete(serverName);
    } else {
      newSelected.add(serverName);
    }
    setSelectedMcpServers(newSelected);
  };

  const handleToggleAdminAgent = (agentName: string) => {
    const newSelected = new Set(selectedAdminAgents);
    if (newSelected.has(agentName)) {
      newSelected.delete(agentName);
    } else {
      newSelected.add(agentName);
    }
    setSelectedAdminAgents(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await localWhitelistApi.updateConfig({
        public_agents: Array.from(selectedAgents),
        public_mcp_servers: Array.from(selectedMcpServers),
        admin_agents: Array.from(selectedAdminAgents),
      });
      alert('白名单配置已保存！注意：更改需要在后端服务重启后才能完全生效。');
      await loadWhitelist();
    } catch (error) {
      console.error('Failed to save whitelist:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !whitelistData) {
    return (
      <div className="flex items-center justify-center p-12 gap-3">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="font-mono text-sm text-muted-foreground">LOADING_CONFIG...</span>
      </div>
    );
  }

  const unlistedAgents = whitelistData.available_agents.filter(
    agent => !selectedAgents.has(agent) && !selectedAdminAgents.has(agent)
  );
  const unlistedMcpServers = whitelistData.available_mcp_servers.filter(
    server => !selectedMcpServers.has(server) && server !== 'config-admin'
  );

  return (
    <div className="space-y-6">
      {/* 警告信息 */}
      <Card className="border-accent-l">
        <div className="h-0.5 w-full bg-amber-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm font-mono">SYSTEM_NOTICE</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="mono-label mb-3">READ_BEFORE_PROCEEDING</div>
          <ul className="space-y-1 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-mono">▸</span>
              <span>白名单控制哪些Agent和MCP服务器在前端可见</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-mono">▸</span>
              <span>Admin Agent具有完整权限，可以访问所有配置</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-mono">▸</span>
              <span>config-admin服务器自动排除在公开列表外</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-500 font-mono">▸</span>
              <span>修改后需要<strong>重启后端服务</strong>才能完全生效</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 公开Agent */}
      <Card className="glow border-border/60">
        <div className="h-0.5 w-full bg-primary" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 border border-primary/30">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display text-base">公开Agent列表</CardTitle>
                <div className="mono-label mt-1">PUBLIC_AGENTS</div>
              </div>
            </div>
            <div className="mono-badge text-primary">
              {selectedAgents.size} / {whitelistData.available_agents.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {whitelistData.available_agents.map((agent) => (
              <Badge
                key={agent}
                variant="outline"
                className={`cursor-pointer transition-all font-mono text-xs ${
                  selectedAgents.has(agent)
                    ? 'bg-primary/20 border-primary text-primary hover:bg-primary/30'
                    : 'bg-muted/30 border-border/60 hover:bg-primary/10 hover:border-primary/30'
                }`}
                onClick={() => handleToggleAgent(agent)}
              >
                <span className="mr-1.5">{agent}</span>
                {selectedAgents.has(agent) && <Check className="h-3 w-3 inline" />}
              </Badge>
            ))}
          </div>
          {unlistedAgents.length > 0 && (
            <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20">
              <div className="mono-label mb-2 text-amber-500">UNLISTED_AGENTS</div>
              <p className="text-sm font-mono text-amber-400">
                {unlistedAgents.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">既不在公开列表，也不在管理员列表中</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 公开MCP服务器 */}
      <Card className="glow border-border/60">
        <div className="h-0.5 w-full bg-secondary" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 border border-secondary/30">
                <Terminal className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <CardTitle className="font-display text-base">公开MCP服务器列表</CardTitle>
                <div className="mono-label mt-1">PUBLIC_MCP_SERVERS</div>
              </div>
            </div>
            <div className="mono-badge text-secondary">
              {selectedMcpServers.size} / {whitelistData.available_mcp_servers.length - 1}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {whitelistData.available_mcp_servers
              .filter(server => server !== 'config-admin')
              .map((server) => (
                <Badge
                  key={server}
                  variant="outline"
                  className={`cursor-pointer transition-all font-mono text-xs ${
                    selectedMcpServers.has(server)
                      ? 'bg-secondary/20 border-secondary text-secondary hover:bg-secondary/30'
                      : 'bg-muted/30 border-border/60 hover:bg-secondary/10 hover:border-secondary/30'
                  }`}
                  onClick={() => handleToggleMcpServer(server)}
                >
                  <span className="mr-1.5">{server}</span>
                  {selectedMcpServers.has(server) && <Check className="h-3 w-3 inline" />}
                </Badge>
              ))}
          </div>
          {unlistedMcpServers.length > 0 && (
            <div className="mt-4 p-3 bg-secondary/5 border border-secondary/20">
              <div className="mono-label mb-2 text-secondary">UNLISTED_SERVERS</div>
              <p className="text-sm font-mono text-secondary">
                {unlistedMcpServers.join(', ')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">这些服务器对前端用户不可见</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Agent */}
      <Card className="border-destructive/60">
        <div className="h-0.5 w-full bg-destructive" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 border border-destructive/30">
                <Shield className="h-4 w-4 text-destructive" />
              </div>
              <div>
                <CardTitle className="font-display text-base">Admin Agent列表</CardTitle>
                <div className="mono-label mt-1">ADMIN_AGENTS [FULL_ACCESS]</div>
              </div>
            </div>
            <div className="mono-badge text-destructive">
              {selectedAdminAgents.size}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {whitelistData.available_agents.map((agent) => (
              <Badge
                key={agent}
                variant="outline"
                className={`cursor-pointer transition-all font-mono text-xs ${
                  selectedAdminAgents.has(agent)
                    ? 'bg-destructive/20 border-destructive text-destructive hover:bg-destructive/30'
                    : 'bg-muted/30 border-border/60 hover:bg-destructive/10 hover:border-destructive/30'
                }`}
                onClick={() => handleToggleAdminAgent(agent)}
              >
                <span className="mr-1.5">{agent}</span>
                {selectedAdminAgents.has(agent) && <Check className="h-3 w-3 inline" />}
              </Badge>
            ))}
          </div>
          <div className="mt-4 p-3 bg-destructive/5 border border-destructive/20">
            <div className="mono-label mb-2 text-destructive">⚠ SECURITY_WARNING</div>
            <p className="text-sm font-mono text-destructive">
              Admin Agent可以访问config-admin服务，拥有完整的配置管理权限
            </p>
            <p className="text-xs text-muted-foreground mt-1">请谨慎选择，只将此权限授予受信任的Agent</p>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
        <Button
          variant="outline"
          onClick={loadWhitelist}
          className="font-mono text-xs"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          RESET
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="font-mono text-xs bg-primary hover:bg-primary/90"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              SAVING...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              SAVE_CONFIG
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
