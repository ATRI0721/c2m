import { useState } from 'react';
import { Agent } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (agent: Omit<Agent, 'name'> & { name?: string }) => void;
  agent?: Agent;
  availableServices: string[];
}

export function AgentForm({ open, onClose, onSubmit, agent, availableServices }: AgentFormProps) {
  const [name, setName] = useState(agent?.name || '');
  const [description, setDescription] = useState(agent?.description || '');
  const [model, setModel] = useState(agent?.model || 'deepseek-chat');
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt || '');
  const [mcpServices, setMcpServices] = useState<string[]>(agent?.mcp_services || []);
  const [enableToolCalling, setEnableToolCalling] = useState(agent?.enable_tool_calling ?? true);
  const [newService, setNewService] = useState('');

  const isEditing = !!agent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 验证名称
    if (!isEditing && !name.trim()) {
      alert('请输入Agent名称');
      return;
    }

    onSubmit({
      name: isEditing ? name : name.trim(),
      description,
      model,
      system_prompt: systemPrompt,
      mcp_services: mcpServices,
      enable_tool_calling: enableToolCalling,
    });
  };

  const addService = () => {
    if (newService && !mcpServices.includes(newService)) {
      setMcpServices([...mcpServices, newService]);
      setNewService('');
    }
  };

  const removeService = (service: string) => {
    setMcpServices(mcpServices.filter(s => s !== service));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-border/60">
        <div className="h-0.5 w-full bg-gradient-to-r from-primary to-secondary" />
        <DialogHeader className="pb-4">
          <div className="mono-label mb-2">
            {isEditing ? 'EDIT_AGENT_CONFIG' : 'NEW_AGENT_CONFIG'}
          </div>
          <DialogTitle className="font-display text-lg">
            {isEditing ? '编辑 Agent' : '创建 Agent'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing ? '修改现有 Agent 的配置参数' : '配置新的 AI 助手'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="mono-label text-xs">AGENT_NAME</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-agent"
              disabled={isEditing}
              required
              className="font-mono text-sm bg-black/20 border-border/60"
            />
            {!isEditing && (
              <p className="text-xs text-muted-foreground font-mono">
                [创建后名称将无法修改]
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="mono-label text-xs">DESCRIPTION</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="这是一个专业的助手..."
              required
              className="text-sm bg-black/20 border-border/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model" className="mono-label text-xs">MODEL_ID</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="deepseek-chat"
              required
              className="font-mono text-sm bg-black/20 border-border/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt" className="mono-label text-xs">SYSTEM_PROMPT</Label>
            <Textarea
              id="prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="你是一个..."
              rows={6}
              className="font-mono text-sm bg-black/20 border-border/60 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="mono-label text-xs">MCP_SERVICES</Label>
            {availableServices.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 p-3 bg-black/20 border border-border/60">
                  {availableServices.map((service) => (
                    <Badge
                      key={service}
                      variant="outline"
                      className={`cursor-pointer transition-all font-mono text-xs ${
                        mcpServices.includes(service)
                          ? 'bg-secondary/20 border-secondary text-secondary hover:bg-secondary/30'
                          : 'bg-muted/30 border-border/60 hover:bg-secondary/10 hover:border-secondary/30'
                      }`}
                      onClick={() => {
                        if (mcpServices.includes(service)) {
                          removeService(service);
                        } else {
                          setMcpServices([...mcpServices, service]);
                        }
                      }}
                    >
                      <span className="mr-1">{service}</span>
                      {mcpServices.includes(service) && (
                        <X className="h-3 w-3 inline" />
                      )}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  [{mcpServices.length} services selected]
                </p>
              </>
            ) : (
              <div className="p-4 bg-black/20 border border-dashed border-border/60">
                <p className="text-sm text-muted-foreground text-center font-mono">
                  [NO_SERVICES_AVAILABLE]
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 bg-black/20 border border-border/60">
            <input
              type="checkbox"
              id="tool-calling"
              checked={enableToolCalling}
              onChange={(e) => setEnableToolCalling(e.target.checked)}
              className="w-4 h-4 rounded-sm border-border"
            />
            <div className="flex-1">
              <Label htmlFor="tool-calling" className="cursor-pointer font-mono text-xs">
                ENABLE_TOOL_CALLING
              </Label>
              <p className="text-xs text-muted-foreground">
                允许Agent调用MCP工具
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="font-mono text-xs"
            >
              CANCEL
            </Button>
            <Button
              type="submit"
              className="font-mono text-xs bg-primary hover:bg-primary/90"
            >
              {isEditing ? 'SAVE_CONFIG' : 'CREATE_AGENT'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
