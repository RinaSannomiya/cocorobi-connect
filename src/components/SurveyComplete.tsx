import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Settings, ArrowRight, Building, Plus, Save, Upload, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

interface WorkplaceSettings {
  [companyName: string]: boolean; // true = OK（送る）, false = NG（送らない）
}

interface PastCompany {
  name: string;
  position: string;
}

const SurveyComplete = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, getUserData, saveExcludedCompanies } = useAuth();
  const [currentCompany, setCurrentCompany] = useState<string>('');
  const [pastCompanies, setPastCompanies] = useState<PastCompany[]>([]);
  const [workplaceSettings, setWorkplaceSettings] = useState<WorkplaceSettings>({});
  const [newPastCompany, setNewPastCompany] = useState({ name: '', position: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEightPremiumUser, setIsEightPremiumUser] = useState<boolean | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Check if this is a completion from CSV upload
  const isCompleted = searchParams.get('completed') === 'true';

  // 過去の職場の制限数
  const MAX_PAST_COMPANIES = 10;

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ユーザーデータを取得
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const userData = await getUserData();
        
        if (userData) {
          const current = userData.current_company || '';
          const past = userData.past_companies || [];
          const hasEight = userData.has_eight || false;
          const isEightPremium = userData.is_eight_premium || false;
          
          setCurrentCompany(current);
          setPastCompanies(past.map((company: string) => {
            const [name, position] = company.split(':');
            return { name: name || company, position: position || '' };
          }));
          setIsEightPremiumUser(hasEight && isEightPremium);

          // デフォルト設定（全て「NG」）
          const defaultSettings: WorkplaceSettings = {};
          if (current) {
            defaultSettings[current] = false; // false = NG
          }
          past.forEach((company: string) => {
            const [name] = company.split(':');
            if (name) {
              defaultSettings[name] = false; // false = NG
            }
          });
          
          setWorkplaceSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        toast.error('ユーザーデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [getUserData]);

  const handleToggleWorkplace = (companyName: string, value: boolean) => {
    setWorkplaceSettings(prev => ({
      ...prev,
      [companyName]: value
    }));
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

    const updatedPastCompanies = [...pastCompanies, newPastCompany];
    setPastCompanies(updatedPastCompanies);
    
    // デフォルトで「NG」に設定
    setWorkplaceSettings(prev => ({
      ...prev,
      [newPastCompany.name]: false
    }));
    
    setNewPastCompany({ name: '', position: '' });
    setShowAddForm(false);
    setValidationErrors({});
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      // 「NG」に設定された会社のリストを作成
      const excludedCompanies = Object.entries(workplaceSettings)
        .filter(([_, isOK]) => !isOK) // false（NG）の会社を除外対象とする
        .map(([companyName, _]) => companyName);

      await saveExcludedCompanies(excludedCompanies);
      toast.success('営業NG企業設定を保存しました');
      
      // Eightプレミアム利用状況に応じて遷移先を変更
      if (isEightPremiumUser) {
        navigate('/csv-upload');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('設定の保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditProfile = () => {
    navigate('/basic-info');
  };

  const handleEditSurvey = () => {
    navigate('/survey');
  };

  const handleCsvUpload = () => {
    navigate('/csv-upload');
  };

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  // 過去の職場追加制限チェック
  // 本登録で登録した過去職場 + この画面で追加した過去職場の合計
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D73C3]"></div>
      </div>
    );
  }

  // CSV完了後の簡単な完了画面
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleEditProfile}
              className="w-full flex items-center justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
            >
              <Edit className="h-4 w-4 mr-2" />
              登録情報の確認・修正
            </button>

            {/* CSV追加アップロード（Eightプレミアムユーザーのみ） */}
            {isEightPremiumUser && (
              <button
                onClick={handleCsvUpload}
                className="w-full flex items-center justify-center py-3 px-4 border border-[#1D73C3] rounded-md shadow-sm text-sm font-medium text-[#1D73C3] bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                CSVの追加アップロード
              </button>
            )}

            <button
              onClick={handleDashboard}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
            >
              ダッシュボードへ
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>

          {/* Contact Information */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              ご質問やお困りのことがございましたら、
              <br />
              サポートまでお気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 通常の営業NG企業設定画面
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
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
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{currentCompany}</p>
                      <p className="text-sm text-gray-500">現在の所属企業</p>
                    </div>
                    <div className="flex items-center">
                      <ToggleSwitch
                        companyName={currentCompany}
                        value={workplaceSettings[currentCompany] || false}
                        onChange={(value) => handleToggleWorkplace(currentCompany, value)}
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
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
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
                            onChange={(value) => handleToggleWorkplace(company.name, value)}
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
                    disabled={isAddPastCompanyDisabled}
                    className={`flex items-center text-sm font-medium transition-colors duration-200 ${
                      isAddPastCompanyDisabled
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
                      />
                      {validationErrors.position && (
                        <p className="mt-1 text-sm text-red-500">{validationErrors.position}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={handleAddPastCompany}
                      disabled={isAddPastCompanyDisabled}
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
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 注意事項 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                ※設定内容はログイン後にいつでもご変更いただけます。
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSaveAndContinue}
            disabled={isSaving}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEightPremiumUser ? '設定を保存してCSVアップロードに進む' : '設定を保存する'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>

        {/* Contact Information */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ご質問やお困りのことがございましたら、
            <br />
            サポートまでお気軽にお問い合わせください。
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#00736d] rounded-full"></div>
              <span className="ml-1">基本情報</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#00736d] rounded-full"></div>
              <span className="ml-1">本登録</span>
            </div>
            <div className="w-4 h-px bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-[#1D73C3] rounded-full"></div>
              <span className="ml-1">NG企業設定</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyComplete;