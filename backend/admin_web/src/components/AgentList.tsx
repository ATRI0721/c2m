import { AgentsResponse } from '@/types';
import { AgentCard } from './AgentCard';

interface AgentListProps {
  data: AgentsResponse;
  onEdit?: (name: string) => void;
  onDelete?: (name: string) => void;
  onCreate?: () => void;
}

export function AgentList({ data, onEdit, onDelete, onCreate }: AgentListProps) {
  const agents = Object.values(data.agents);

  return (
    <div className="space-y-6">
      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center p-12 border border-dashed border-border/60">
          <div className="mono-label mb-3">NO_AGENTS_FOUND</div>
          <p className="text-sm text-muted-foreground">没有配置的AI Agent</p>
          <button
            onClick={onCreate}
            className="mt-4 text-sm font-mono text-primary hover:underline"
          >
            [CREATE_AGENT]
          </button>
        </div>
      )}
    </div>
  );
}
