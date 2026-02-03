import { MCPServer } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Server, Wrench, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface MCPServerCardProps {
  server: MCPServer;
  onToggle?: (name: string, enabled: boolean) => void;
  onViewTools?: (name: string) => void;
}

export function MCPServerCard({ server, onToggle, onViewTools }: MCPServerCardProps) {
  const [enabled, setEnabled] = useState(server.enabled);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    onToggle?.(server.name, checked);
  };

  return (
    <Card className="group card-hover glow overflow-hidden border-border/60">
      {/* Sharp accent line on top */}
      <div className={`h-0.5 w-full ${enabled ? 'bg-primary' : 'bg-muted-foreground/30'} transition-colors`} />

      <CardHeader className="relative pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${enabled ? 'bg-primary/10' : 'bg-muted/30'} transition-colors border ${enabled ? 'border-primary/30' : 'border-border/60'}`}>
              <Server className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <CardTitle className="text-base font-display font-semibold">{server.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <span className={`status-dot ${enabled ? 'status-online' : 'status-offline'}`} />
                <span className="text-xs">{enabled ? 'ONLINE' : 'OFFLINE'}</span>
              </CardDescription>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4 pt-0">
        {server.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 border-l-2 border-border/40 pl-3">
            {server.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{server.tools_count} TOOLS</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewTools?.(server.name)}
            className="text-primary hover:text-primary hover:bg-primary/5 h-7 font-mono text-xs"
          >
            VIEW_TOOLS
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>

        {server.tools && server.tools.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {server.tools.slice(0, 3).map((tool) => (
              <Badge
                key={tool.tool_id}
                variant="secondary"
                className="text-xs font-mono bg-muted/50 border border-border/60"
              >
                {tool.name}
              </Badge>
            ))}
            {server.tools.length > 3 && (
              <Badge variant="outline" className="text-xs font-mono">
                +{server.tools.length - 3}
              </Badge>
            )}
          </div>
        )}

        {server.command && (
          <div className="code-block text-xs text-muted-foreground/80">
            <span className="text-primary/60">$</span> {server.command} {server.args?.join(' ') || ''}
          </div>
        )}

        {/* Corner decoration */}
        <div className="absolute top-0 right-0 w-8 h-8">
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-border/60" />
        </div>
      </CardContent>
    </Card>
  );
}
