import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Phone, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface BasicInfoForm {
  name: string;
  phone: string;
}

const BasicInfo = () => {
  const [formData, setFormData] = useState<BasicInfoForm>({
    name: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isDuplicateEmail, setIsDuplicateEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmissionCompleted, setIsSubmissionCompleted] = useState(false);
  const navigate = useNavigate();
  const { updateBasicInfo } = useAuth();

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 基本情報送信完了後のブラウザバック防止
  useEffect(() => {
    if (isSubmissionCompleted) {
      const preventBack = () => {
        window.history.pushState(null, null, location.href);
      };
      
      window.addEventListener('popstate', preventBack);
      window.history.pushState(null, null, location.href);
      
      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [isSubmissionCompleted]);

  const validatePhone = (phone: string) => {
    // Basic phone validation - allows various formats
    const phoneRegex = /^[\d\-\+\(\)\s]+$/;
    if (!phoneRegex.test(phone)) {
      return '有効な電話番号を入力してください';
    }
    if (phone.replace(/[\-\+\(\)\s]/g, '').length < 10) {
      return '電話番号は10桁以上で入力してください';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsDuplicateEmail(false);
    setIsLoading(true);

    // Validate phone number
    const phoneError = validatePhone(formData.phone);
    if (phoneError) {
      setError(phoneError);
      toast.error(phoneError);
      setIsLoading(false);
      return;
    }

    try {
      await updateBasicInfo(formData);
      
      // 送信完了状態を設定（ブラウザバック防止を有効化）
      setIsSubmissionCompleted(true);
      
      // 少し遅延してから画面遷移（ブラウザバック防止が確実に有効になるように）
      setTimeout(() => {
        navigate('/survey');
      }, 100);
    } catch (err) {
      console.error('Insert failed:', err);
      
      // Check if it's a duplicate email error
      if (err instanceof Error && (
        err.message.includes('duplicate') || 
        err.message.includes('already exists') ||
        err.message.includes('unique constraint') ||
        err.message.includes('violates unique constraint')
      )) {
        setError('すでに登録済みのメールアドレスです');
        setIsDuplicateEmail(true);
        toast.error('すでに登録済みのメールアドレスです');
      } else {
        const errorMessage = err instanceof Error ? err.message : '登録エラーが発生しました';
        setError('情報の登録に失敗しました: ' + errorMessage);
        toast.error('情報の登録に失敗しました');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            基本情報を入力
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            氏名と電話番号を入力してください
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                <User className="inline h-4 w-4 mr-1" />
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm"
                placeholder="山田 太郎"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmissionCompleted}
              />
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                <Phone className="inline h-4 w-4 mr-1" />
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm"
                placeholder="090-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmissionCompleted}
              />
              <p className="mt-1 text-xs text-gray-500">
                ハイフンありなしどちらでも入力可能です
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">エラー</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || isSubmissionCompleted}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  保存中...
                </div>
              ) : isSubmissionCompleted ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  画面遷移中...
                </div>
              ) : (
                '次へ進む'
              )}
            </button>
          </div>

          {/* Duplicate Email Actions */}
          {isDuplicateEmail && !isSubmissionCompleted && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleLoginClick}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
              >
                ログインする
              </button>
            </div>
          )}
        </form>

        {/* Progress Indicator */}
        {!isSubmissionCompleted && (
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-[#1D73C3] rounded-full"></div>
                <span className="ml-1">基本情報</span>
              </div>
              <div className="w-4 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="ml-1">アンケート</span>
              </div>
              <div className="w-4 h-px bg-gray-300"></div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="ml-1">完了</span>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        {!isSubmissionCompleted && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">入力について</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• 氏名は漢字・ひらがな・カタカナで入力してください</p>
              <p>• 電話番号は携帯電話・固定電話どちらでも構いません</p>
              <p>• 入力した情報は安全に保護されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInfo;