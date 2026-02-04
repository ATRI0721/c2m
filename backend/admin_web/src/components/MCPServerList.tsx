import { MCPServersResponse, MCPTool } from '@/types';
import { MCPServerCard } from './MCPServerCard';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Upload, Wrench, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { localMcpApi } from '@/lib/localApi';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface MCPServerListProps {
  data: MCPServersResponse;
  onUpdate?: () => void;
}

export function MCPServerList({ data, onUpdate }: MCPServerListProps) {
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [selectedServerTools, setSelectedServerTools] = useState<MCPTool[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importOverwrite, setImportOverwrite] = useState(true);

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newArgs, setNewArgs] = useState('[]');
  const [newEnv, setNewEnv] = useState('{}');
  const [newEnabled, setNewEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servers = Object.values(data.servers);
  const enabledCount = servers.filter(s => s.enabled).length;
  // Local-file mode can't reliably compute tools yet; temporarily fall back to "total"
  const availableToolsDisplay = data.total_tools > 0 ? data.total_tools : data.total_servers;

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

  const resetAddForm = () => {
    setNewName('');
    setNewDescription('');
    setNewCommand('');
    setNewArgs('[]');
    setNewEnv('{}');
    setNewEnabled(true);
    setError(null);
  };

  const handleAddServer = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = newName.trim();
      if (!name) throw new Error('Name 不能为空');
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name)) {
        throw new Error('Name 仅允许字母/数字/.-_，且必须以字母或数字开头');
      }
      if (!newCommand.trim()) throw new Error('Command 不能为空');

      let args: string[] | undefined;
      try {
        const parsed = JSON.parse(newArgs || '[]');
        if (!Array.isArray(parsed)) throw new Error('Args 必须是 JSON 数组');
        args = parsed.map(String);
      } catch (e) {
        throw new Error(`Args 解析失败：${e instanceof Error ? e.message : String(e)}`);
      }

      let env: Record<string, string> | undefined;
      try {
        const parsed = JSON.parse(newEnv || '{}');
        if (parsed && typeof parsed !== 'object') throw new Error('Env 必须是 JSON 对象');
        if (parsed && typeof parsed === 'object') {
          env = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [k, String(v)]));
        }
      } catch (e) {
        throw new Error(`Env 解析失败：${e instanceof Error ? e.message : String(e)}`);
      }

      await localMcpApi.upsertServer(name, {
        command: newCommand.trim(),
        args,
        description: newDescription.trim() || undefined,
        env,
        enabled: newEnabled,
      });

      setAddOpen(false);
      resetAddForm();
      onUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await localMcpApi.importServersFromJson(json, { overwrite: importOverwrite });
      setImportOpen(false);
      onUpdate?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Actions (user-facing) */}
      <div className="flex items-center justify-between section-header">
        <div className="flex items-center gap-3">
          <div className="mono-label">01</div>
          <h2 className="section-title gradient-text">MCP 服务管理</h2>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              resetAddForm();
              setAddOpen(true);
            }}
            className="font-mono text-xs"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setImportOpen(true);
            }}
            className="font-mono text-xs"
          >
            <Upload className="h-4 w-4 mr-2" />
            导入 JSON
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive border border-destructive/30 bg-destructive/5 p-3">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-4 border-accent-l">
          <div className="mono-label mb-2">TOTAL_SERVERS</div>
          <div className="text-3xl font-bold font-mono text-primary">{data.total_servers}</div>
        </div>
        <div className="glass p-4 border-l-2 border-l-secondary">
          <div className="mono-label mb-2">AVAILABLE_TOOLS</div>
          <div className="text-3xl font-bold font-mono text-secondary">{availableToolsDisplay}</div>
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
            onToggle={async (name, enabled) => {
              try {
                await localMcpApi.setEnabled(name, enabled);
              } catch (e) {
                console.error('Failed to update server enabled status:', e);
              } finally {
                onUpdate?.();
              }
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

      {/* Add Server Dialog */}
      <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) resetAddForm(); }}>
        <DialogContent className="max-w-2xl border-border/60">
          <div className="h-0.5 w-full bg-primary" />
          <DialogHeader className="pb-4">
            <div className="mono-label mb-2">NEW_MCP_SERVER</div>
            <DialogTitle className="font-display text-lg flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              新增 MCP 服务
            </DialogTitle>
            <DialogDescription className="text-xs">
              填写启动配置（command/args/env）。保存后会写入 servers.json 并自动出现在列表中。
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>名称 (name)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. my-server" />
            </div>
            <div className="space-y-2">
              <Label>是否启用</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newEnabled}
                  onChange={(e) => setNewEnabled(e.target.checked)}
                />
                <span className="text-sm text-muted-foreground font-mono">{newEnabled ? 'ENABLED' : 'DISABLED'}</span>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>描述 (description)</Label>
              <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="可选" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>命令 (command)</Label>
              <Input value={newCommand} onChange={(e) => setNewCommand(e.target.value)} placeholder="e.g. python / node / npx" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>参数 (args) - JSON 数组</Label>
              <Textarea value={newArgs} onChange={(e) => setNewArgs(e.target.value)} rows={3} className="font-mono text-xs" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>环境变量 (env) - JSON 对象</Label>
              <Textarea value={newEnv} onChange={(e) => setNewEnv(e.target.value)} rows={3} className="font-mono text-xs" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button variant="outline" className="font-mono text-xs" onClick={() => setAddOpen(false)} disabled={busy}>
              取消
            </Button>
            <Button className="font-mono text-xs" onClick={handleAddServer} disabled={busy}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl border-border/60">
          <div className="h-0.5 w-full bg-secondary" />
          <DialogHeader className="pb-4">
            <div className="mono-label mb-2">IMPORT_JSON</div>
            <DialogTitle className="font-display text-lg flex items-center gap-3">
              <Upload className="h-5 w-5 text-secondary" />
              导入 MCP 配置 JSON
            </DialogTitle>
            <DialogDescription className="text-xs">
              支持导入 <span className="font-mono">{`{ "mcpServers": { ... } }`}</span> 或单个 server 对象（包含 name/command）。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={importOverwrite}
                onChange={(e) => setImportOverwrite(e.target.checked)}
              />
              <span className="text-sm text-muted-foreground">覆盖同名服务</span>
            </div>
            <Input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleImportFile(file);
                // reset so selecting the same file again still triggers change
                e.currentTarget.value = '';
              }}
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button variant="outline" className="font-mono text-xs" onClick={() => setImportOpen(false)} disabled={busy}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
