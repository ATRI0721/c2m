import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores';
import { api } from '../../api/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const { login, loginWithCode } = useAuthStore();
  const navigate = useNavigate();

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await api.sendVerificationCode('reset', { email });
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    if (loginMethod === 'password' && !password) {
      setError('请输入密码');
      return;
    }

    if (loginMethod === 'code' && !verificationCode) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);

    try {
      if (loginMethod === 'password') {
        await login(email, password);
      } else {
        await loginWithCode(email, verificationCode);
      }
      navigate('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-white to-primary-50 px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-gray-900 mb-2">
            CityLive
          </h1>
          <p className="text-gray-500">智能对话 · MCP 工具集成</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="font-display text-2xl font-semibold text-gray-900 mb-6">
            欢迎回来
          </h2>

          {/* Login Method Toggle */}
          <div className="flex gap-2 p-1 bg-surface-200 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'password'
                  ? 'bg-white text-gray-900 shadow-soft'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              密码登录
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('code')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'code'
                  ? 'bg-white text-gray-900 shadow-soft'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              验证码登录
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                disabled={isLoading}
              />
            </div>

            {loginMethod === 'password' ? (
              /* Password Input */
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                  disabled={isLoading}
                />
              </div>
            ) : (
              /* Verification Code Input */
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  验证码
                </label>
                <div className="flex gap-2">
                  <input
                    id="code"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    className="input flex-1"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={isLoading || !email || codeSent}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    {codeSent ? '已发送' : '发送验证码'}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  登录中...
                </span>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            还没有账号？{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium transition-colors">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
