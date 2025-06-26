import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building, 
  Save, 
  AlertCircle, 
  ArrowLeft,
  X,
  Loader,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkplaceSettings {
  [companyName: string]: boolean; // true = OK（送る）, false = NG（送らない）
}

interface PastCompany {
  name: string;
  position: string;
}

const WorkplaceExclusionEdit = () => {
  const { getUserData, saveExcludedCompanies } = useAuth();
  const navigate = useNavigate();
  
  const [currentCompany, setCurrentCompany] = useState<string>('');
  const [currentPosition, setCurrentPosition] = useState<string>('');
  const [pastCompanies, setPastCompanies] = useState<PastCompany[]>([]);
  const [workplaceSettings, setWorkplaceSettings] = useState<WorkplaceSettings>({});
  const [originalSettings, setOriginalSettings] = useState<WorkplaceSettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveCompleted, setIsSaveCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPastCompany, setNewPastCompany] = useState({ name: '', position: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const MAX_PAST_COMPANIES = 10;

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

  // ユーザーデータを取得
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const userData = await getUserData();
        
        if (userData) {
          const current = userData.current_company || '';
          const currentPos = userData.current_position || '';
          const past = userData.past_companies || [];
          
          setCurrentCompany(current);
          setCurrentPosition(currentPos);
          
          // 過去の所属企業データを変換
          const pastCompaniesData = past.map((company: string) => {
            const [name, position] = company.split(':');
            return { name: name || company, position: position || '' };
          });
          setPastCompanies(pastCompaniesData);

          // 既存のNG設定を取得
          const existingExcluded = userData.basic_info?.excluded_companies || [];
          
          // デフォルト設定（全て「NG」）を作成
          const defaultSettings: WorkplaceSettings = {};
          if (current) {
            defaultSettings[current] = !existingExcluded.includes(current); // 除外リストにあればNG（false）
          }
          pastCompaniesData.forEach((company: PastCompany) => {
            if (company.name) {
              defaultSettings[company.name] = !existingExcluded.includes(company.name); // 除外リストにあればNG（false）
            }
          });
          
          setWorkplaceSettings(defaultSettings);
          setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings))); // Deep copy
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('ユーザーデータの読み込みに失敗しました');
        toast.error('ユーザーデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [getUserData]);

  // 全ての会社のリストを作成（重複除去）
  const allCompanies = [
    ...(currentCompany ? [{ name: currentCompany, position: currentPosition, isCurrent: true }] : []),
    ...pastCompanies.filter(company => company.name && company.name !== currentCompany)
      .map(company => ({ ...company, isCurrent: false }))
  ].filter(company => company.name);

  // チェックボックスの状態変更ハンドラー
  const handleCompanyToggle = (companyName: string, value: boolean) => {
    setWorkplaceSettings(prev => ({
      ...prev,
      [companyName]: value
    }));
  };

  // 過去の企業を追加
  const addPastCompany = () => {
    if (pastCompanies.length >= MAX_PAST_COMPANIES) return;
    
    const newCompany: PastCompany = {
      name: newPastCompany.name,
      position: newPastCompany.position
    };
    setPastCompanies(prev => [...prev, newCompany]);
    
    // デフォルトで「NG」に設定
    setWorkplaceSettings(prev => ({
      ...prev,
      [newPastCompany.name]: false
    }));
    
    setNewPastCompany({ name: '', position: '' });
    setShowAddForm(false);
    setValidationErrors({});
  };

  const validateAddForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newPastCompany.name.trim()) {
      errors.name = '企業名を入力してください';
    }
    
    if (!newPastCompany.position.trim()) {
      errors.position = '最終役職を入力してください';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddPastCompany = () => {
    if (!validateAddForm() || isAddPastCompanyDisabled) {
      return;
    }
    addPastCompany();
  };

  // 保存ハンドラー
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 「NG」に設定された会社のリストを作成
      const excludedCompanies = Object.entries(workplaceSettings)
        .filter(([_, isOK]) => !isOK) // false（NG）の会社を除外対象とする
        .map(([companyName, _]) => companyName);

      await saveExcludedCompanies(excludedCompanies);
      
      // 保存完了状態を設定（ブラウザバック防止を有効化）
      setIsSaveCompleted(true);
      
      toast.success('営業NG企業設定を更新しました');
      
      // 少し遅延してから画面遷移
      setTimeout(() => {
        navigate('/profile-settings');
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // キャンセルハンドラー
  const handleCancel = () => {
    navigate('/profile-settings');
  };

  // 変更があるかチェック
  const hasChanges = () => {
    return JSON.stringify(workplaceSettings) !== JSON.stringify(originalSettings);
  };

  // 過去の職場追加制限チェック
  const registeredPastCompaniesCount = pastCompanies.length;
  const isAddPastCompanyDisabled = registeredPastCompaniesCount >= MAX_PAST_COMPANIES;

  // トグルスイッチコンポーネント
  const ToggleSwitch = ({ companyName, value, onChange }: { 
    companyName: string; 
    value: boolean; 
    onChange: (value: boolean) => void; 
  }) => {
    const handleClick = () => {
      onChange(!value);
    };

    return (
      <div className="flex items-center space-x-3">
        <span className={`text-sm font-medium ${!value ? 'text-red-600' : 'text-gray-400'}`}>
          NG
        </span>
        <button
          type="button"
          onClick={handleClick}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            value 
              ? 'bg-[#34C759] focus:ring-[#34C759]' 
              : 'bg-red-400 focus:ring-red-500'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${value ? 'text-[#34C759]' : 'text-gray-400'}`}>
          OK
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Loader className="animate-spin h-8 w-8 text-[#1D73C3] mx-auto" />
          <p className="mt-4 text-sm text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">エラーが発生しました</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={handleCancel}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (allCompanies.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </button>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                企業情報が見つかりません
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                現在の所属企業または過去の所属企業情報を登録してから、NG設定を行ってください。
              </p>
              <button
                onClick={handleCancel}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
            disabled={isSaveCompleted}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">営業NG企業設定の編集</h1>
          <p className="mt-2 text-sm text-gray-600">
            営業メッセージの送信をNG設定する企業を設定してください
          </p>
        </div>

        {/* 営業NG企業設定 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-[#1D73C3] px-6 py-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Building className="mr-2 h-5 w-5" />
              営業NG企業設定
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              企業への営業メッセージ送信を設定してください
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* 現在の所属企業 */}
            {currentCompany && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Building className="mr-2 h-4 w-4 text-gray-500" />
                    現在の所属企業
                  </h4>
                  <span className="text-sm font-medium text-gray-700">営業メッセージ送信NG</span>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{currentCompany}</p>
                      {currentPosition && (
                        <p className="text-sm text-gray-500">現在の役職：{currentPosition}</p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <ToggleSwitch
                        companyName={currentCompany}
                        value={workplaceSettings[currentCompany] || false}
                        onChange={(value) => handleCompanyToggle(currentCompany, value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 過去の所属企業 */}
            {pastCompanies.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900 flex items-center">
                    <Building className="mr-2 h-4 w-4 text-gray-500" />
                    過去の所属企業
                  </h4>
                  <span className="text-sm font-medium text-gray-700">営業メッセージ送信NG</span>
                </div>
                <div className="space-y-3">
                  {pastCompanies.map((company, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{company.name}</p>
                          {company.position && (
                            <p className="text-sm text-gray-500">最終役職: {company.position}</p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <ToggleSwitch
                            companyName={company.name}
                            value={workplaceSettings[company.name] || false}
                            onChange={(value) => handleCompanyToggle(company.name, value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 過去の所属企業を追加 */}
            <div className="space-y-3">
              {!showAddForm ? (
                <div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    disabled={isAddPastCompanyDisabled || isSaveCompleted}
                    className={`flex items-center text-sm font-medium transition-colors duration-200 ${
                      isAddPastCompanyDisabled || isSaveCompleted
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-[#00736d] hover:text-[#005a54]'
                    }`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    過去の所属企業を追加
                  </button>
                  {isAddPastCompanyDisabled && (
                    <p className="mt-1 text-xs text-gray-500">
                      過去の所属企業は最大{MAX_PAST_COMPANIES}社まで登録できます（現在{registeredPastCompaniesCount}社登録済み）
                    </p>
                  )}
                </div>
              ) : (
                <div className="border border-gray-200 bg-gray-50 rounded-lg p-4 space-y-3">
                  <h5 className="font-medium text-gray-700">過去の所属企業を追加</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        企業名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newPastCompany.name}
                        onChange={(e) => setNewPastCompany(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00736d] focus:border-[#00736d] text-sm ${
                          validationErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="株式会社○○"
                        disabled={isSaveCompleted}
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        最終役職 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newPastCompany.position}
                        onChange={(e) => setNewPastCompany(prev => ({ ...prev, position: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00736d] focus:border-[#00736d] text-sm ${
                          validationErrors.position ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="営業部長、エンジニアなど"
                        disabled={isSaveCompleted}
                      />
                      {validationErrors.position && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.position}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleAddPastCompany}
                      disabled={isAddPastCompanyDisabled || isSaveCompleted}
                      className="px-3 py-2 text-sm font-medium text-white bg-[#00736d] hover:bg-[#005a54] rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => {
                        setShowAddForm(false);
                        setNewPastCompany({ name: '', position: '' });
                        setValidationErrors({});
                      }}
                      disabled={isSaveCompleted}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 変更インジケーター */}
            {hasChanges() && !isSaveCompleted && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">変更が検出されました</p>
                    <p className="text-amber-700">
                      「更新する」ボタンで設定を保存してください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 保存完了メッセージ */}
            {isSaveCompleted && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">設定を保存しました</p>
                    <p className="text-green-700">
                      まもなく前の画面に戻ります...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges() || isSaveCompleted}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    更新中...
                  </>
                ) : isSaveCompleted ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    画面遷移中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    更新する
                  </>
                )}
              </button>

              {!isSaveCompleted && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  キャンセル
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 注意事項 */}
        {!isSaveCompleted && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p className="text-sm text-blue-800">
              ※設定内容はログイン後にいつでもご変更いただけます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkplaceExclusionEdit;