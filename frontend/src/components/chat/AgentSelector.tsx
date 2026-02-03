import { useState } from 'react';
import type { Agent } from '../../types/api';

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: string;
  onSelectAgent: (agentName: string) => void;
  compact?: boolean;
}

// Agent icon mapping
const AGENT_ICONS: Record<string, React.ReactNode> = {
  chat: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  weather: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  code: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  city: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

// Agent color mapping - Light theme
const AGENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  chat: {
    bg: 'bg-primary-50',
    text: 'text-primary-700',
    border: 'border-primary-300',
  },
  weather: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-300',
  },
  code: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
  },
  city: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
};

export default function AgentSelector({ agents, selectedAgent, onSelectAgent, compact = false }: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedAgentData = agents.find(a => a.name === selectedAgent);

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-surface-300 px-4 py-2.5 rounded-xl flex items-center justify-between hover:border-primary-400 transition-all duration-200"
          type="button"
        >
          <div className="flex items-center gap-3">
            <div className="text-primary-600">
              {AGENT_ICONS[selectedAgent] || AGENT_ICONS.chat}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900 capitalize">{selectedAgent}</p>
              <p className="text-xs text-gray-500 truncate max-w-[200px]">{selectedAgentData?.description}</p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-card border border-surface-300 z-50 animate-slide-down max-h-96 overflow-y-auto">
            <div className="p-2 space-y-1">
              {agents.map((agent) => {
                const colors = AGENT_COLORS[agent.name] || AGENT_COLORS.chat;
                const isSelected = selectedAgent === agent.name;

                return (
                  <button
                    key={agent.name}
                    onClick={() => {
                      onSelectAgent(agent.name);
                      setIsOpen(false);
                    }}
                    className={`
                      w-full p-3 rounded-lg transition-all duration-200 text-left flex items-center gap-3
                      ${isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text}`
                        : 'hover:bg-surface-100 text-gray-700'
                      }
                    `}
                    type="button"
                  >
                    <div className={isSelected ? colors.text : 'text-gray-500'}>
                      {AGENT_ICONS[agent.name] || AGENT_ICONS.chat}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold capitalize ${isSelected ? colors.text : 'text-gray-700'}`}>
                        {agent.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{agent.description}</p>
                    </div>
                    {agent.mcp_services.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? colors.bg + ' ' + colors.text : 'bg-surface-200 text-gray-600'}`}>
                        {agent.mcp_services.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">选择助手</h3>
      <div className="grid grid-cols-2 gap-3">
        {agents.map((agent) => {
          const colors = AGENT_COLORS[agent.name] || AGENT_COLORS.chat;
          const isSelected = selectedAgent === agent.name;

          return (
            <button
              key={agent.name}
              onClick={() => onSelectAgent(agent.name)}
              className={`
                relative p-4 rounded-2xl border-2 transition-all duration-200 text-left card card-hover
                ${isSelected
                  ? `${colors.border} ${colors.bg}`
                  : 'border-surface-300 hover:border-primary-300'
                }
              `}
              type="button"
            >
              <div className="flex items-start gap-3">
                <div className={`${isSelected ? colors.text : 'text-gray-500'}`}>
                  {AGENT_ICONS[agent.name] || AGENT_ICONS.chat}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold capitalize mb-1 ${
                    isSelected ? colors.text : 'text-gray-900'
                  }`}>
                    {agent.name}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {agent.description}
                  </p>
                  {agent.mcp_services.length > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <span className={`text-xs ${isSelected ? colors.text : 'text-gray-500'}`}>
                        {agent.mcp_services.length} 个工具
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center`}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
