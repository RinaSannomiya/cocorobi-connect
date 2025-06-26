import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, Mail, ArrowLeft, RefreshCw, Clock } from 'lucide-react';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();

  // Pre-fill email if passed from login page
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  // Check for existing cooldown on component mount
  useEffect(() => {
    const lastAttempt = localStorage.getItem('resetPasswordLastAttempt');
    if (lastAttempt) {
      const timeSinceLastAttempt = Date.now() - parseInt(lastAttempt);
      const cooldownDuration = 60000; // 1 minute cooldown
      
      if (timeSinceLastAttempt < cooldownDuration) {
        const remainingTime = Math.ceil((cooldownDuration - timeSinceLastAttempt) / 1000);
        setCooldownTime(remainingTime);
      }
    }
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('resetPasswordLastAttempt');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [cooldownTime]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    // Check if still in cooldown
    if (cooldownTime > 0) {
      setError(`リクエストが多すぎます。${cooldownTime}秒後に再試行してください。`);
      toast.error(`${cooldownTime}秒後に再試行してください`);
      setIsLoading(false);
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setError('有効なメールアドレスを入力してください');
      toast.error('有効なメールアドレスを入力してください');
      setIsLoading(false);
      return;
    }

    try {
      await resetPassword(email);
      setSuccess(true);
      toast.success('パスワードリセットメールを送信しました');
      
      // Auto redirect after 5 seconds
      setTimeout(() => {
        navigate('/login');
      }, 5000);
    } catch (err) {
      console.error('Password reset error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('rate limit') || err.message.includes('over_email_send_rate_limit')) {
          // Set cooldown when rate limit is hit
          localStorage.setItem('resetPasswordLastAttempt', Date.now().toString());
          setCooldownTime(60); // 1 minute cooldown
          setError('リクエストが多すぎます。1分後に再試行してください。');
          toast.error('リクエストが多すぎます。しばらく待ってください。');
        } else if (err.message.includes('User not found') || err.message.includes('not found')) {
          setError('このメールアドレスは登録されていません。新規登録をお試しください。');
          toast.error('メールアドレスが見つかりません');
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
          toast.error('ネットワークエラーが発生しました');
        } else {
          setError('パスワードリセットメールの送信に失敗しました: ' + err.message);
          toast.error('メール送信に失敗しました');
        }
      } else {
        setError('予期しないエラーが発生しました');
        toast.error('予期しないエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/', { state: { email } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <RefreshCw className="h-12 w-12 text-[#1D73C3]" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            パスワードをリセット
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </p>
        </div>

        {!success ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
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

            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">エラー</p>
                  <p>{error}</p>
                  {error.includes('登録されていません') && (
                    <button
                      type="button"
                      onClick={handleRegister}
                      className="mt-2 text-xs underline hover:no-underline"
                    >
                      新規登録はこちら
                    </button>
                  )}
                </div>
              </div>
            )}

            {cooldownTime > 0 && (
              <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">送信制限中</p>
                  <p>メール送信の制限により、{formatTime(cooldownTime)}後に再試行できます。</p>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || cooldownTime > 0}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    送信中...
                  </div>
                ) : cooldownTime > 0 ? (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(cooldownTime)}後に再試行
                  </div>
                ) : (
                  'リセットメールを送信'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 space-y-6">
            <div className="flex items-start space-x-2 p-4 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-6 w-6 text-[#00736d] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-medium">メール送信完了</p>
                <p className="mt-1">
                  <strong>{email}</strong> にパスワードリセット用のメールを送信しました。
                </p>
                <p className="mt-2">
                  メールの指示に従ってパスワードを再設定してください。
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleBackToLogin}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
              >
                ログインページに戻る
              </button>
              
              <p className="text-center text-xs text-gray-500">
                5秒後に自動的にログインページに移動します
              </p>
            </div>
          </div>
        )}

        {/* Back to Login */}
        {!success && (
          <div className="flex items-center justify-center">
            <button
              onClick={handleBackToLogin}
              className="flex items-center text-sm text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              ログインページに戻る
            </button>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">メールが届かない場合</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• 迷惑メールフォルダをご確認ください</p>
            <p>• メールアドレスが正しく入力されているか確認してください</p>
            <p>• 数分待ってから再度お試しください</p>
            <p>• 送信制限がある場合は、しばらく待ってから再試行してください</p>
            <p>• 問題が続く場合はサポートまでお問い合わせください</p>
          </div>
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
      </div>
    </div>
  );
};

export default ResetPassword;