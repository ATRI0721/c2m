import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 全局错误处理 - 防止未捕获的 Promise rejection 导致应用崩溃
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled Promise rejection:', event.reason);

  // 阻止默认的控制台错误输出（我们已经处理了）
  // event.preventDefault();

  // 可选：显示用户友好的错误提示
  // 这里我们只是记录，让 ErrorBoundary 处理 UI 部分
});

// 全局错误处理 - 捕获同步错误
window.addEventListener('error', (event) => {
  console.error('[Global] Unhandled error:', event.error);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
