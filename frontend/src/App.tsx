import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ChatPage from './components/chat/ChatPage';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // Check authentication on app mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[App] Unhandled error:', error);
        console.error('[App] Component stack:', errorInfo.componentStack);
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ChatPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <ChatPage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
