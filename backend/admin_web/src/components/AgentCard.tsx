import { Agent } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, Trash2, Edit } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  return (
    <Card className="group card-hover glow overflow-hidden border-border/60">
      {/* Sharp accent line on top */}
      <div className="h-0.5 w-full bg-secondary" />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 border border-secondary/30">
              <Bot className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-base font-display font-semibold">{agent.name}</CardTitle>
              <CardDescription className="text-xs mt-1">{agent.description}</CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(agent.name)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/30"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(agent.name)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4 pt-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="mono-badge">{agent.model}</span>
          {agent.enable_tool_calling && (
            <Badge variant="secondary" className="text-xs font-mono bg-primary/10 text-primary border border-primary/30">
              TOOL_CALLING
            </Badge>
          )}
        </div>

        <div>
          <div className="mono-label mb-2">MCP_SERVICES</div>
          <div className="flex flex-wrap gap-1.5">
            {agent.mcp_services.length > 0 ? (
              agent.mcp_services.map((service) => (
                <Badge
                  key={service}
                  variant="outline"
                  className="text-xs font-mono bg-muted/30 border-border/60"
                >
                  {service}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground/60 font-mono text-xs">NO_SERVICES</span>
            )}
          </div>
        </div>

        {/* Corner decoration */}
        <div className="absolute bottom-0 right-0 w-8 h-8">
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-border/60" />
        </div>
      </CardContent>
    </Card>
  );
}
