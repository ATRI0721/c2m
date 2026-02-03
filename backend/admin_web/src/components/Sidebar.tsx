import { LayoutDashboard, Server, Bot, Sparkles, Settings, LogOut } from 'lucide-react';
import { cn } from '@/api/utils';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'mcp', label: 'MCP 服务', icon: Server },
    { id: 'agents', label: 'Agent 管理', icon: Bot },
    { id: 'ai-assist', label: 'AI 辅助', icon: Sparkles },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <aside className="w-64 glass border-r border-border/50 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold font-display text-lg gradient-text">Code2MCP</h1>
            <p className="text-xs text-muted-foreground">管理控制台</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-accent/20 text-foreground border border-primary/30 shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">退出登录</span>
        </button>
      </div>
    </aside>
  );
}
