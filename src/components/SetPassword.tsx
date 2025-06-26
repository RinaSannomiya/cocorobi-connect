import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const SetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    passwordConfirm: ''
  });
  const [errors, setErrors] = useState({
    password: '',
    passwordConfirm: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { setUserPassword } = useAuth();

  const email = location.state?.email;

  // ブラウザバック防止
  useEffect(() => {
    // ブラウザバックを防止
    const preventBack = () => {
      window.history.pushState(null, null, location.href);
    };
    
    window.addEventListener('popstate', preventBack);
    
    // 初回ロード時も履歴を追加
    window.history.pushState(null, null, location.href);
    
    return () => {
      window.removeEventListener('popstate', preventBack);
    };
  }, []);

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // If no email in state, redirect to registration
  useEffect(() => {
    if (!email) {
      navigate('/');
    }
  }, [email, navigate]);

  const validatePassword = (password: string) => {
    const errors = [];
    let strength = 0;

    if (password.length < 8) {
      errors.push('8文字以上');
    } else {
      strength += 1;
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('大文字を含む');
    } else {
      strength += 1;
    }

    if (!/[a-z]/.test(password)) {
      errors.push('小文字を含む');
    } else {
      strength += 1;
    }

    if (!/[0-9]/.test(password)) {
      errors.push('数字を含む');
    } else {
      strength += 1;
    }

    setPasswordStrength(strength);

    if (errors.length > 0) {
      return `パスワードは以下の条件を満たす必要があります: ${errors.join('、')}`;
    }
    return '';
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-yellow-500';
    if (passwordStrength <= 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return '弱い';
    if (passwordStrength <= 2) return '普通';
    if (passwordStrength <= 3) return '良い';
    return '強い';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ password: '', passwordConfirm: '' });
    setIsLoading(true);

    // バリデーション
    const newErrors = {
      password: '',
      passwordConfirm: ''
    };

    if (!formData.password.trim()) {
      newErrors.password = 'パスワードを入力してください';
    } else {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      }
    }

    if (!formData.passwordConfirm.trim()) {
      newErrors.passwordConfirm = 'パスワード（確認）を入力してください';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'パスワードが一致しません';
    }

    setErrors(newErrors);

    // エラーがある場合は送信しない
    if (newErrors.password || newErrors.passwordConfirm) {
      setIsLoading(false);
      return;
    }

    try {
      await setUserPassword(formData.password);
      toast.success('パスワードを設定しました');
      navigate('/basic-info');
    } catch (err) {
      console.error('Password setting error:', err);
      if (err instanceof Error) {
        // Check for specific "same password" error
        if (err.message.includes('New password should be different from the old password') ||
            err.message.includes('same_password')) {
          setErrors(prev => ({ ...prev, password: '新しいパスワードは現在のパスワードと異なるものを設定してください' }));
          toast.error('新しいパスワードは現在のパスワードと異なるものを設定してください');
        } else if (err.message.includes('Password')) {
          setErrors(prev => ({ ...prev, password: 'パスワードが要件を満たしていません' }));
          toast.error('パスワードが要件を満たしていません');
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          toast.error('ネットワークエラーが発生しました');
        } else {
          toast.error('パスワード設定に失敗しました');
        }
      } else {
        toast.error('予期しないエラーが発生しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // エラーをクリア
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // パスワード強度チェック
    if (field === 'password') {
      validatePassword(value);
    }
  };

  const handleBackToVerify = () => {
    navigate('/verify', { state: { email } });
  };

  if (!email) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Lock className="h-12 w-12 text-[#1D73C3]" />
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            パスワードを設定
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            アカウントのパスワードを設定してください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                  autoComplete="new-password"
                  className={`appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                    errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="パスワード"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
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
              
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{getPasswordStrengthText()}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    8文字以上、大文字・小文字・数字を含むことを推奨
                  </p>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Password Confirm Field */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700">
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none rounded-md relative block w-full pl-10 pr-10 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                    errors.passwordConfirm ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="パスワード（確認）"
                  value={formData.passwordConfirm}
                  onChange={(e) => handleChange('passwordConfirm', e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                >
                  {showPasswordConfirm ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              
              {formData.passwordConfirm && (
                <div className="mt-1 flex items-center space-x-1">
                  {formData.password === formData.passwordConfirm ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-600">パスワードが一致しています</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-600">パスワードが一致しません</span>
                    </>
                  )}
                </div>
              )}
              
              {errors.passwordConfirm && (
                <p className="mt-1 text-sm text-red-500">{errors.passwordConfirm}</p>
              )}
            </div>
          </div>

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
                  設定中...
                </div>
              ) : (
                '次へ進む'
              )}
            </button>
          </div>

          {/* Back to Verify */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleBackToVerify}
              className="flex items-center text-sm text-[#1D73C3] hover:text-[#155a9a] transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              認証コード入力に戻る
            </button>
          </div>
        </form>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">パスワード設定について</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• パスワードは8文字以上で設定してください</p>
            <p>• 大文字・小文字・数字を含むことを推奨します</p>
            <p>• 安全性の高いパスワードを設定してください</p>
            <p>• 設定したパスワードは安全に保護されます</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPassword;