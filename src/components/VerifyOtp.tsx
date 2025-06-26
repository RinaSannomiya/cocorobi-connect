import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';

const VerifyOtp = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [codeError, setCodeError] = useState('');
  const [attemptCount, setAttemptCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyCode, signIn } = useAuth();
  
  const email = location.state?.email;
  const COOLDOWN_DURATION = 120; // 120 seconds - increased to provide larger buffer over Supabase's rate limit
  const STORAGE_KEY = `otp_cooldown_${email}`;

  // Initialize cooldown time directly from localStorage to prevent rate limit issues
  const [cooldownTime, setCooldownTime] = useState(() => {
    if (!email) return 0;
    
    const storedTimestamp = localStorage.getItem(STORAGE_KEY);
    if (storedTimestamp) {
      const lastResendTime = parseInt(storedTimestamp, 10);
      const now = Date.now();
      const timeDiff = Math.floor((now - lastResendTime) / 1000);
      
      if (timeDiff < COOLDOWN_DURATION) {
        return COOLDOWN_DURATION - timeDiff;
      } else {
        // Cooldown has expired, remove from localStorage
        localStorage.removeItem(STORAGE_KEY);
        return 0;
      }
    }
    return 0;
  });

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Cooldown timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldownTime > 0) {
      interval = setInterval(() => {
        setCooldownTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            // Cooldown finished, remove from localStorage
            localStorage.removeItem(STORAGE_KEY);
          }
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cooldownTime, STORAGE_KEY]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setCodeError('');
    
    // Check if code is entered
    if (!code.trim()) {
      setCodeError('入力してください');
      return;
    }
    
    if (code.length !== 6) {
      setCodeError('6桁のコードを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      await verifyCode(code);
      toast.success('認証が完了しました');
      
      // Navigate to password setting page
      navigate('/set-password', { state: { email } });
    } catch (err) {
      setAttemptCount(prev => prev + 1);
      console.error('OTP verification error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid OTP') || 
            err.message.includes('expired') ||
            err.message.includes('invalid') ||
            err.message.includes('正しくない') ||
            err.message.includes('期限切れ')) {
          const errorMsg = '認証コードが正しくないか、期限切れです';
          setError(errorMsg);
          toast.error(errorMsg);
          
          if (attemptCount >= 2) {
            toast.error('複数回失敗しました。新しいコードを送信してください。');
          }
        } else if (err.message.includes('rate_limit')) {
          const errorMsg = 'リクエストが多すぎます。しばらく待ってから再試行してください。';
          setError(errorMsg);
          toast.error(errorMsg);
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          const errorMsg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          setError(errorMsg);
          toast.error(errorMsg);
        } else {
          setError(err.message);
          toast.error('認証に失敗しました: ' + err.message);
        }
      } else {
        const errorMsg = '認証に失敗しました';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || isResending) return;

    // Check localStorage for cooldown even if state cooldown is 0
    const storedTimestamp = localStorage.getItem(STORAGE_KEY);
    if (storedTimestamp) {
      const lastResendTime = parseInt(storedTimestamp, 10);
      const now = Date.now();
      const timeDiff = Math.floor((now - lastResendTime) / 1000);
      
      if (timeDiff < COOLDOWN_DURATION) {
        const remainingTime = COOLDOWN_DURATION - timeDiff;
        setCooldownTime(remainingTime);
        toast.error(`セキュリティのため、${formatCooldownTime(remainingTime)}後に再送信できます`);
        return;
      }
    }

    if (cooldownTime > 0) {
      toast.error(`セキュリティのため、${formatCooldownTime(cooldownTime)}後に再送信できます`);
      return;
    }

    setIsResending(true);
    setError('');
    setCodeError('');

    // Store timestamp immediately before making the request
    const currentTimestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, currentTimestamp.toString());
    setCooldownTime(COOLDOWN_DURATION);

    try {
      await signIn(email);
      toast.success('新しい認証コードを送信しました');
      setAttemptCount(0); // Reset attempt count
      setCode(''); // Clear current code
    } catch (err) {
      console.error('Resend code error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('rate_limit') || err.message.includes('over_email_send_rate_limit')) {
          const errorMsg = 'メール送信の制限に達しました。2分後に再試行してください。';
          setError(errorMsg);
          toast.error(errorMsg);
          // Keep the cooldown for rate limit errors
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          const errorMsg = 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
          setError(errorMsg);
          toast.error(errorMsg);
          // Clear cooldown for network errors to allow immediate retry
          localStorage.removeItem(STORAGE_KEY);
          setCooldownTime(0);
        } else {
          setError('認証コードの再送信に失敗しました');
          toast.error('認証コードの再送信に失敗しました: ' + err.message);
          // Clear cooldown for other errors to allow immediate retry
          localStorage.removeItem(STORAGE_KEY);
          setCooldownTime(0);
        }
      } else {
        setError('認証コードの再送信に失敗しました');
        toast.error('予期しないエラーが発生しました');
        // Clear cooldown for unknown errors to allow immediate retry
        localStorage.removeItem(STORAGE_KEY);
        setCooldownTime(0);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Format cooldown time display
  const formatCooldownTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  // If no email in state, redirect to login
  if (!email) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Main Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <Mail className="h-12 w-12 text-[#1D73C3]" />
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              認証コードを入力
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              <strong>{email}</strong> に送信された6桁のコードを入力してください
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  認証コード <span className="text-red-500">*</span>
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                    (error || codeError) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(value);
                    setError('');
                    setCodeError('');
                  }}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="mt-1 text-xs text-gray-500">
                  6桁の数字を入力してください
                </p>
                
                {/* Code Error Message */}
                {codeError && (
                  <p className="mt-1 text-sm text-red-500">
                    {codeError}
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <p className="font-medium">認証エラー</p>
                  <p>{error}</p>
                  {attemptCount >= 2 && (
                    <p className="mt-1 text-xs">
                      複数回失敗している場合は、新しいコードを送信してください。
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    認証中...
                  </div>
                ) : (
                  '認証する'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || cooldownTime > 0}
                  className="flex items-center justify-center text-sm text-[#1D73C3] hover:text-[#155a9a] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isResending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#1D73C3] mr-2"></div>
                      送信中...
                    </>
                  ) : cooldownTime > 0 ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      認証コードを再送信 ({formatCooldownTime(cooldownTime)})
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      認証コードを再送信
                    </>
                  )}
                </button>
                {cooldownTime > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    セキュリティのため、{formatCooldownTime(cooldownTime)}後に再送信できます
                  </p>
                )}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="flex items-center justify-center text-sm text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  登録フォームに戻る
                </button>
              </div>
            </div>
          </form>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">認証コードが届かない場合</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• 迷惑メールフォルダをご確認ください</p>
              <p>• メールアドレスが正しく入力されているか確認してください</p>
              <p>• 「認証コードを再送信」ボタンをクリックしてください</p>
              <p>• 数分待ってから再度お試しください</p>
              <p>• 問題が続く場合はサポートまでお問い合わせください</p>
            </div>
          </div>

          {/* Attempt Counter */}
          {attemptCount > 0 && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                認証試行回数: {attemptCount}/5
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;