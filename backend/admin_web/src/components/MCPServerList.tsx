import { MCPServersResponse, MCPTool } from '@/types';
import { MCPServerCard } from './MCPServerCard';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MCPServerListProps {
  data: MCPServersResponse;
  onUpdate?: () => void;
}

export function MCPServerList({ data, onUpdate }: MCPServerListProps) {
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedServerTools, setSelectedServerTools] = useState<MCPTool[]>([]);

  const servers = Object.values(data.servers);
  const enabledCount = servers.filter(s => s.enabled).length;

  // Get tools for selected server
  const handleViewTools = (serverName: string) => {
    setSelectedServer(serverName);
    // Get tools from the server object
    const server = data.servers[serverName];
    setSelectedServerTools(server?.tools || []);
  };

  const handleCloseDialog = () => {
    setSelectedServer(null);
    setSelectedServerTools([]);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4 border-accent-l">
          <div className="mono-label mb-2">TOTAL_SERVERS</div>
          <div className="text-3xl font-bold font-mono text-primary">{data.total_servers}</div>
        </div>
        <div className="glass p-4 border-l-2 border-l-secondary">
          <div className="mono-label mb-2">AVAILABLE_TOOLS</div>
          <div className="text-3xl font-bold font-mono text-secondary">{data.total_tools}</div>
        </div>
        <div className="glass p-4 border-l-2 border-l-emerald-500">
          <div className="mono-label mb-2">ENABLED</div>
          <div className="text-3xl font-bold font-mono text-emerald-500">{enabledCount}</div>
        </div>
      </div>

      {/* Server Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {servers.map((server) => (
          <MCPServerCard
            key={server.name}
            server={server}
            onToggle={(name, enabled) => {
              console.log('Toggle server:', name, enabled);
              onUpdate?.();
            }}
            onViewTools={handleViewTools}
          />
        ))}
      </div>

      {servers.length === 0 && (
        <div className="text-center p-12 border border-dashed border-border/60">
          <div className="mono-label mb-3">NO_SERVERS_FOUND</div>
          <p className="text-sm text-muted-foreground">没有配置的MCP服务器</p>
        </div>
      )}

      {/* Tools Dialog */}
      <Dialog open={!!selectedServer} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl border-border/60">
          <div className="h-0.5 w-full bg-primary" />
          <DialogHeader className="pb-4">
            <div className="mono-label mb-2">SERVER_TOOLS</div>
            <DialogTitle className="font-display text-lg flex items-center gap-3">
              <Wrench className="h-5 w-5 text-primary" />
              {selectedServer}
            </DialogTitle>
            <DialogDescription className="text-xs">
              该服务器提供的可用工具列表
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {selectedServerTools.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {selectedServerTools.map((tool) => (
                  <div
                    key={tool.tool_id}
                    className="p-3 bg-black/20 border border-border/60 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                            {tool.name}
                          </Badge>
                          {tool.server_name && (
                            <span className="mono-badge text-[10px]">{tool.server_name}</span>
                          )}
                        </div>
                        {tool.description && (
                          <p className="text-sm text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                        <div className="mono-badge text-[10px] text-muted-foreground/60">
                          ID: {tool.tool_id}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-12 border border-dashed border-border/60">
                <Wrench className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <div className="mono-label mb-2">NO_TOOLS_FOUND</div>
                <p className="text-sm text-muted-foreground">
                  该服务器暂无可用工具
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <div className="mono-label text-xs">
                TOTAL: {selectedServerTools.length} TOOLS
              </div>
              <Button
                onClick={handleCloseDialog}
                variant="outline"
                className="font-mono text-xs"
              >
                <X className="h-4 w-4 mr-2" />
                CLOSE
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
