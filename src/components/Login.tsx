import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertCircle, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();
  const { loginEmail, getRedirectPath } = useAuth();

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginEmail(email, password);
      toast.success('ログインしました');
      
      // Get user status and redirect to appropriate page
      const redirectPath = getRedirectPath(result.userStatus);
      console.log('Redirecting to:', redirectPath);
      navigate(redirectPath);
    } catch (err) {
      setAttemptCount(prev => prev + 1);
      
      if (err instanceof Error) {
        if (err.message === 'EMAIL_NOT_CONFIRMED') {
          toast.success('認証コードを送信しました');
          navigate('/verify', { state: { email } });
        } else if (err.message === 'メールまたはパスワードが正しくありません') {
          setError(err.message);
          if (attemptCount >= 2) {
            toast.error('ログインに複数回失敗しました。パスワードリセットをお試しください。');
          }
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
          toast.error('ネットワークエラーが発生しました');
        } else if (err.message.includes('rate limit')) {
          setError('ログイン試行回数が上限に達しました。しばらく待ってから再試行してください。');
          toast.error('ログイン試行回数が上限に達しました');
        } else {
          setError(err.message);
          toast.error('ログインに失敗しました');
        }
      } else {
        setError('ログインに失敗しました');
        toast.error('予期しないエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/reset-password', { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <LogIn className="h-12 w-12 text-[#1D73C3]" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            アカウントにログイン
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            メールアドレスとパスワードを入力してください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                    error && error.includes('メール') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                パスワード <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                    error && error.includes('パスワード') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-medium text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
              >
                パスワードをお忘れですか？
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">ログインエラー</p>
                <p>{error}</p>
                {attemptCount >= 2 && error.includes('正しくありません') && (
                  <p className="mt-1 text-xs">
                    複数回失敗している場合は、
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="underline hover:no-underline"
                    >
                      パスワードリセット
                    </button>
                    をお試しください。
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ログイン中...
                </div>
              ) : (
                'ログイン'
              )}
            </button>
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link
                to="/"
                className="font-medium text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
              >
                新規登録
              </Link>
            </p>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">ログインでお困りの場合</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• メールアドレスとパスワードを正確に入力してください</p>
            <p>• パスワードを忘れた場合は「パスワードをお忘れですか？」をクリック</p>
            <p>• アカウントが見つからない場合は新規登録をお試しください</p>
            <p>• 問題が続く場合はサポートまでお問い合わせください</p>
          </div>
        </div>

        {/* Test Account Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-xs font-medium text-yellow-800 mb-2">開発者向け情報:</h4>
            <div className="text-xs text-yellow-700">
              <p>テストアカウント: test@test.com / testTest00</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;