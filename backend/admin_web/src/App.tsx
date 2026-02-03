import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Dashboard } from './pages/Dashboard';
import { authService } from './lib/auth';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 加载组件
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center animated-bg grid-pattern">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/25 animate-pulse-glow">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display gradient-text">Code2MCP</h2>
          <p className="text-muted-foreground">正在连接管理控制台...</p>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 自动使用管理员账号登录
    const initializeAuth = async () => {
      console.log('🔐 正在初始化认证...');
      const success = await authService.autoLogin();

      if (success) {
        console.log('✅ 认证成功');
        setIsAuthenticated(true);
      } else {
        console.warn('⚠️ 自动认证失败，可能需要手动登录');
      }

      // 无论成功与否，都显示管理界面
      // 如果认证失败，某些功能可能受限
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard isAuthenticated={isAuthenticated} />
    </QueryClientProvider>
  );
}

export default App;
