import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, Mail, Clock, LogIn } from 'lucide-react';

const EmailRegistration = () => {
  const [email, setEmail] = useState('');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    privacy: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const navigate = useNavigate();
  const { registerEmail } = useAuth();

  // Check for existing cooldown on component mount
  useEffect(() => {
    const lastAttempt = localStorage.getItem('emailRegistrationLastAttempt');
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
            localStorage.removeItem('emailRegistrationLastAttempt');
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
    if (!emailRegex.test(email)) {
      return '有効なメールアドレスを入力してください';
    }
    return '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
  };

  // メールアドレス重複チェック関数
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('supporters')
        .select('email')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = "The result contains 0 rows" (データが見つからない)
        console.error('Email check error:', error);
        return false;
      }
      
      return data !== null;
    } catch (error) {
      console.error('Email existence check failed:', error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', privacy: '' });
    setShowLoginButton(false);
    setIsLoading(true);

    // Check if still in cooldown
    if (cooldownTime > 0) {
      toast.error(`${cooldownTime}秒後に再試行してください`);
      setIsLoading(false);
      return;
    }

    // バリデーション
    const newErrors = {
      email: '',
      privacy: ''
    };

    if (!email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else {
      const emailError = validateEmail(email);
      if (emailError) {
        newErrors.email = emailError;
      }
    }

    if (!agreedToPrivacy) {
      newErrors.privacy = 'プライバシーポリシーに同意してください';
    }

    setErrors(newErrors);

    // エラーがある場合は送信しない
    if (newErrors.email || newErrors.privacy) {
      setIsLoading(false);
      return;
    }

    try {
      // 事前にメールアドレスの重複チェック
      const emailExists = await checkEmailExists(email);
      
      if (emailExists) {
        // 重複検出時の処理（トースト通知を削除）
        setErrors(prev => ({ ...prev, email: 'このメールアドレスは既に登録されています' }));
        
        // ログインボタンを表示
        setShowLoginButton(true);
        setIsLoading(false);
        return;
      }

      // 新規登録処理を続行
      const { isTestAccount } = await registerEmail(email);
      
      if (isTestAccount) {
        toast.success('テストアカウントでログインしました');
        navigate('/basic-info');
      } else {
        navigate('/verify', { state: { email } });
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('rate limit') || err.message.includes('over_email_send_rate_limit')) {
          // Set cooldown when rate limit is hit
          localStorage.setItem('emailRegistrationLastAttempt', Date.now().toString());
          setCooldownTime(60); // 1 minute cooldown
          toast.error('リクエストが多すぎます。1分後に再試行してください。');
        } else if (err.message.includes('User already registered') || 
            err.message.includes('already exists') ||
            err.message.includes('duplicate')) {
          setErrors(prev => ({ ...prev, email: 'このメールアドレスは既に登録されています' }));
          // トースト通知を削除
          setShowLoginButton(true);
        } else if (err.message.includes('Invalid email')) {
          setErrors(prev => ({ ...prev, email: '無効なメールアドレスです' }));
          toast.error('無効なメールアドレスです');
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          toast.error('ネットワークエラーが発生しました');
        } else {
          toast.error('アカウント登録に失敗しました');
        }
      } else {
        toast.error('予期しないエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleChange = (value: string) => {
    setEmail(value);
    
    // エラーをクリア
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
    
    // ログインボタンを非表示
    if (showLoginButton) {
      setShowLoginButton(false);
    }
  };

  const handlePrivacyChange = (checked: boolean) => {
    setAgreedToPrivacy(checked);
    
    // エラーをクリア
    if (errors.privacy) {
      setErrors(prev => ({ ...prev, privacy: '' }));
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
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
              className={`appearance-none rounded-md relative block w-full pl-10 pr-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
              value={email}
              onChange={(e) => handleChange(e.target.value)}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Privacy Policy Agreement */}
        <div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="privacy-agreement"
                name="privacy-agreement"
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => handlePrivacyChange(e.target.checked)}
                className={`h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 rounded ${
                  errors.privacy ? 'border-red-300' : ''
                }`}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="privacy-agreement" className="text-gray-700">
                <a 
                  href="https://cocorobi.co.jp/privacy-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#1D73C3] hover:text-[#155a9a] underline"
                >
                  プライバシーポリシー
                </a>
                に同意します <span className="text-red-500">*</span>
              </label>
            </div>
          </div>
          {errors.privacy && (
            <p className="mt-1 text-sm text-red-500">{errors.privacy}</p>
          )}
        </div>
      </div>

      {/* 重複検出時のログインボタン */}
      {showLoginButton && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <LogIn className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 mb-2">
                既に登録済みの場合はこちら
              </p>
              <p className="text-xs text-blue-700 mb-3">
                このメールアドレスで既にアカウントが作成されています。ログインしてサービスをご利用ください。
              </p>
              <button 
                type="button"
                onClick={handleLoginClick}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 text-sm font-medium"
              >
                ログインページへ
              </button>
            </div>
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

      <div className="text-center">
        <button
          type="submit"
          disabled={isLoading || cooldownTime > 0}
          className="inline-flex justify-center py-3 px-8 border border-transparent text-base font-medium rounded-full text-white bg-[#00736d] hover:bg-[#00736d]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              登録中...
            </div>
          ) : cooldownTime > 0 ? (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {formatTime(cooldownTime)}後に再試行
            </div>
          ) : (
            'サポーター登録する'
          )}
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          既にアカウントをお持ちの方は{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-medium text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
          >
            ログイン
          </button>
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">開発者向け情報</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• テスト用: test@test.com でテストアカウントを使用できます</p>
            <p>• メールが届かない場合は、Supabaseの設定を確認してください</p>
            <p>• 迷惑メールフォルダもご確認ください</p>
            <p>• 送信制限がある場合は、しばらく待ってから再試行してください</p>
          </div>
        </div>
      )}
    </form>
  );
};

export default EmailRegistration;