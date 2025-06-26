import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Phone, AlertCircle, ArrowLeft, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface BasicInfoForm {
  name: string;
  phone: string;
}

const BasicInfoEdit = () => {
  const [formData, setFormData] = useState<BasicInfoForm>({
    name: '',
    phone: '',
  });
  const [originalData, setOriginalData] = useState<BasicInfoForm>({
    name: '',
    phone: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaveCompleted, setIsSaveCompleted] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const navigate = useNavigate();
  const { updateBasicInfo, getUserData } = useAuth();

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 設定保存完了後の一時的なブラウザバック防止
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isSaveCompleted) {
      const preventBack = () => {
        window.history.pushState(null, null, location.href);
      };
      
      window.addEventListener('popstate', preventBack);
      window.history.pushState(null, null, location.href);
      
      // 3秒後に解除（設定変更は一時的な防止で十分）
      timeoutId = setTimeout(() => {
        window.removeEventListener('popstate', preventBack);
        setIsSaveCompleted(false);
      }, 3000);
      
      return () => {
        window.removeEventListener('popstate', preventBack);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isSaveCompleted]);

  // ユーザーデータを取得して初期値に設定
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsDataLoading(true);
        const userData = await getUserData();
        
        if (userData) {
          const initialData = {
            name: userData.name || '',
            phone: userData.phone || ''
          };
          setFormData(initialData);
          setOriginalData(initialData);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('ユーザーデータの読み込みに失敗しました');
      } finally {
        setIsDataLoading(false);
      }
    };

    loadUserData();
  }, [getUserData]);

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
    setIsLoading(true);

    // Validate required fields
    if (!formData.name.trim()) {
      setError('氏名を入力してください');
      toast.error('氏名を入力してください');
      setIsLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError('電話番号を入力してください');
      toast.error('電話番号を入力してください');
      setIsLoading(false);
      return;
    }

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
      
      // 保存完了状態を設定（ブラウザバック防止を有効化）
      setIsSaveCompleted(true);
      
      toast.success('基本情報を更新しました');
      
      // 少し遅延してから画面遷移
      setTimeout(() => {
        navigate('/profile-settings');
      }, 1500);
    } catch (err) {
      console.error('Update failed:', err);
      
      const errorMessage = err instanceof Error ? err.message : '更新エラーが発生しました';
      setError('情報の更新に失敗しました: ' + errorMessage);
      toast.error('情報の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleCancel = () => {
    navigate('/profile-settings');
  };

  // データが変更されているかチェック
  const hasChanges = () => {
    return formData.name !== originalData.name || formData.phone !== originalData.phone;
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D73C3] mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div>
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
            disabled={isSaveCompleted}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </button>
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            基本情報の編集
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            氏名と電話番号を編集してください
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
                className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                  error && error.includes('氏名') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="山田 太郎"
                value={formData.name}
                onChange={handleChange}
                disabled={isSaveCompleted}
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
                className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#1D73C3] focus:border-[#1D73C3] sm:text-sm ${
                  error && error.includes('電話番号') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="090-1234-5678"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSaveCompleted}
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

          {/* 保存完了メッセージ */}
          {isSaveCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">基本情報を更新しました</p>
                  <p className="text-green-700">
                    まもなく前の画面に戻ります...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Update Button */}
            <button
              type="submit"
              disabled={isLoading || !hasChanges() || isSaveCompleted}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  更新中...
                </div>
              ) : isSaveCompleted ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  画面遷移中...
                </div>
              ) : (
                <div className="flex items-center">
                  <Save className="h-4 w-4 mr-2" />
                  更新する
                </div>
              )}
            </button>

            {/* Cancel Button */}
            {!isSaveCompleted && (
              <button
                type="button"
                onClick={handleCancel}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
              >
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </button>
            )}
          </div>

          {/* Changes Indicator */}
          {hasChanges() && !isSaveCompleted && (
            <div className="text-center">
              <p className="text-xs text-amber-600">
                変更が検出されました。「更新する」ボタンで保存してください。
              </p>
            </div>
          )}
        </form>

        {/* Help Section */}
        {!isSaveCompleted && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">入力について</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• 氏名は漢字・ひらがな・カタカナで入力してください</p>
              <p>• 電話番号は携帯電話・固定電話どちらでも構いません</p>
              <p>• 変更した情報は即座に反映されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasicInfoEdit;