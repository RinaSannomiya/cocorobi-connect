import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Phone, 
  Building, 
  CreditCard, 
  Smartphone, 
  Users, 
  ExternalLink,
  ArrowLeft,
  Save,
  AlertCircle,
  Loader,
  Plus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PastCompany {
  id: string;
  name: string;
  position: string;
}

const SurveyEdit = () => {
  // 基本情報
  const [cardCount, setCardCount] = useState('');
  
  // 名刺管理アプリ関連
  const [usesCardApp, setUsesCardApp] = useState<boolean | null>(null);
  const [cardAppType, setCardAppType] = useState<string[]>([]);
  const [otherCardApp, setOtherCardApp] = useState(''); // その他のアプリ名
  const [isEightPremium, setIsEightPremium] = useState<boolean | null>(null);
  const [registeredCardCount, setRegisteredCardCount] = useState('');
  
  // 企業・役職関連
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentPosition, setCurrentPosition] = useState('');
  const [isIndividualBusiness, setIsIndividualBusiness] = useState(false);
  
  // 過去の企業（動的配列）
  const [pastCompanies, setPastCompanies] = useState<PastCompany[]>([]);
  
  // SNS関連
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  
  // UI状態
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const navigate = useNavigate();
  const { saveComprehensiveSurveyData, getUserData } = useAuth();

  const MAX_PAST_COMPANIES = 10;

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ユーザーデータを取得して初期値に設定
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsDataLoading(true);
        const userData = await getUserData();
        
        if (userData) {
          // 基本情報
          setCardCount(userData.card_count || '');
          
          // 名刺管理アプリ関連
          setUsesCardApp(userData.uses_card_app || false);
          if (userData.card_app_type) {
            const apps = userData.card_app_type.split(',').map((app: string) => app.trim());
            setCardAppType(apps);
            
            // その他のアプリ名を抽出
            const otherApp = apps.find((app: string) => app.startsWith('other:'));
            if (otherApp) {
              setOtherCardApp(otherApp.replace('other:', ''));
            }
          }
          setIsEightPremium(userData.is_eight_premium || false);
          setRegisteredCardCount(userData.registered_card_count || '');
          
          // 企業・役職関連
          setCurrentCompany(userData.current_company || '');
          setCurrentPosition(userData.current_position || '');
          
          // 過去の企業データを変換
          if (userData.past_companies && userData.past_companies.length > 0) {
            const pastCompaniesData = userData.past_companies.map((company: string, index: number) => {
              const [name, position] = company.split(':');
              return {
                id: `existing_${index}`,
                name: name || company,
                position: position || ''
              };
            });
            setPastCompanies(pastCompaniesData);
          }
          
          // SNS関連
          if (userData.survey_data) {
            setLinkedinUrl(userData.survey_data.linkedinUrl || '');
            setFacebookUrl(userData.survey_data.facebookUrl || '');
          }
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

  // 名刺管理アプリの選択処理
  const handleCardAppChange = (app: string, checked: boolean) => {
    if (checked) {
      setCardAppType(prev => [...prev, app]);
    } else {
      setCardAppType(prev => prev.filter(item => item !== app));
      
      // Eightのチェックを外した場合、Eightプレミアム設定もリセット
      if (app === 'eight') {
        setIsEightPremium(null);
      }
      
      // その他のチェックを外した場合、入力欄をクリア
      if (app === 'other') {
        setOtherCardApp('');
      }
    }
  };

  // 過去の企業を追加
  const addPastCompany = () => {
    if (pastCompanies.length >= MAX_PAST_COMPANIES) return;
    
    const newCompany: PastCompany = {
      id: Date.now().toString(),
      name: '',
      position: ''
    };
    setPastCompanies(prev => [...prev, newCompany]);
  };

  // 過去の企業を削除
  const removePastCompany = (id: string) => {
    setPastCompanies(prev => prev.filter(company => company.id !== id));
    // 該当する企業のバリデーションエラーもクリア
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`pastCompany_${id}_name`];
      delete newErrors[`pastCompany_${id}_position`];
      return newErrors;
    });
  };

  // 過去の企業情報を更新
  const updatePastCompany = (id: string, field: 'name' | 'position', value: string) => {
    setPastCompanies(prev => 
      prev.map(company => 
        company.id === id ? { ...company, [field]: value } : company
      )
    );
    
    // バリデーションエラーをクリア
    const errorKey = `pastCompany_${id}_${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  // バリデーション関数
  const validateForm = () => {
    const errors: {[key: string]: string} = {};

    if (!cardCount) {
      errors.cardCount = '所有名刺枚数を選択してください';
    }

    if (usesCardApp === null) {
      errors.usesCardApp = '名刺管理アプリの利用状況を選択してください';
    }

    if (usesCardApp && cardAppType.length === 0) {
      errors.cardAppType = '利用している名刺管理アプリを選択してください';
    }

    if (usesCardApp && cardAppType.includes('eight') && isEightPremium === null) {
      errors.isEightPremium = 'Eightプレミアムの利用状況を選択してください';
    }

    if (usesCardApp && !registeredCardCount) {
      errors.registeredCardCount = '名刺管理アプリへの登録状況を選択してください';
    }

    // 個人事業主でない場合は企業名必須
    if (!isIndividualBusiness && !currentCompany.trim()) {
      errors.currentCompany = '現在の所属企業を入力してください';
    }

    // 現在の役職は必須
    if (!currentPosition.trim()) {
      errors.currentPosition = '現在の役職を入力してください';
    }

    // その他のアプリが選択されているが名前が入力されていない場合
    if (cardAppType.includes('other') && !otherCardApp.trim()) {
      errors.otherCardApp = 'その他の名刺管理アプリ名を入力してください';
    }

    // 過去の所属企業のバリデーション（企業名が入力されている場合、最終役職も必須）
    pastCompanies.forEach(company => {
      if (company.name.trim() && !company.position.trim()) {
        errors[`pastCompany_${company.id}_position`] = '最終役職を入力してください';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // バリデーション
    if (!validateForm()) {
      const firstError = Object.values(validationErrors)[0];
      if (firstError) {
        setError(firstError);
        toast.error(firstError);
      }
      setIsLoading(false);
      return;
    }

    try {
      // 過去の所属企業データを文字列配列に変換（空でない企業のみ）
      const pastCompaniesData = pastCompanies
        .filter(company => company.name.trim())
        .map(company => 
          company.position.trim() 
            ? `${company.name.trim()}:${company.position.trim()}` 
            : company.name.trim()
        );

      // カードアプリタイプの処理（その他の場合は実際の名前を含める）
      const finalCardAppType = cardAppType.map(app => 
        app === 'other' ? `other:${otherCardApp}` : app
      ).join(',');

      const surveyData = {
        cardCount,
        usesCardApp,
        cardAppType: finalCardAppType,
        hasEight: cardAppType.includes('eight'), // Eightが選択されているかどうか
        eightCardCount: '', // 削除：Eightに登録している名刺枚数項目を削除
        isEightPremium: cardAppType.includes('eight') ? isEightPremium : false,
        registeredCardCount: usesCardApp ? registeredCardCount : '',
        currentCompany: currentCompany.trim(),
        currentPosition: currentPosition.trim(),
        isIndividualBusiness,
        pastCompanies: pastCompaniesData,
        phoneNumber: '', // 削除：電話番号は基本情報で登録済み
        linkedinUrl: linkedinUrl.trim(),
        facebookUrl: facebookUrl.trim()
      };

      console.log('Updating survey data:', surveyData);

      await saveComprehensiveSurveyData(surveyData);
      toast.success('その他登録情報を更新しました');
      navigate('/profile-settings');
    } catch (err) {
      console.error('Survey update error:', err);
      const errorMessage = err instanceof Error ? err.message : 'その他登録情報の更新に失敗しました';
      setError(errorMessage);
      toast.error('その他登録情報の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile-settings');
  };

  if (isDataLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Loader className="animate-spin h-8 w-8 text-[#1D73C3] mx-auto" />
          <p className="mt-4 text-sm text-gray-600">データを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">その他登録情報の編集</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 名刺管理状況セクション */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <CreditCard className="mr-3 h-5 w-5 text-[#1D73C3]" />
              名刺管理状況
            </h2>

            {/* 所有名刺枚数 */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">所有名刺枚数</h3>
              <div className="space-y-3">
                {[
                  { value: '~100', label: '〜100枚' },
                  { value: '101-500', label: '101〜500枚' },
                  { value: '501-1000', label: '501〜1000枚' },
                  { value: '1001-3000', label: '1001〜3000枚' },
                  { value: '3001-5000', label: '3001〜5000枚' },
                  { value: '5001+', label: '5001枚以上' }
                ].map((option) => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="radio"
                      name="cardCount"
                      value={option.value}
                      checked={cardCount === option.value}
                      onChange={(e) => setCardCount(e.target.value)}
                      className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300"
                    />
                    <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {validationErrors.cardCount && (
                <p className="mt-2 text-sm text-red-500">{validationErrors.cardCount}</p>
              )}
            </div>

            {/* 名刺管理アプリ利用状況 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Smartphone className="mr-2 h-5 w-5 text-[#1D73C3]" />
                名刺管理アプリの利用状況
              </h3>
              
              {/* 利用有無 */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">名刺管理アプリを利用していますか？</p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="usesCardApp"
                      value="yes"
                      checked={usesCardApp === true}
                      onChange={() => setUsesCardApp(true)}
                      className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300"
                    />
                    <span className="ml-3 text-sm text-gray-700">はい</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="usesCardApp"
                      value="no"
                      checked={usesCardApp === false}
                      onChange={() => setUsesCardApp(false)}
                      className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300"
                    />
                    <span className="ml-3 text-sm text-gray-700">いいえ</span>
                  </label>
                </div>
                {validationErrors.usesCardApp && (
                  <p className="mt-2 text-sm text-red-500">{validationErrors.usesCardApp}</p>
                )}
              </div>

              {/* アプリ選択 - 青枠で囲む（細い枠線） */}
              {usesCardApp && (
                <div className="border border-[#1D73C3] bg-[#1D73C3]/10 rounded-lg p-4 space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">利用している名刺管理アプリをすべて選択してください（複数選択可）</p>
                    <div className="space-y-3">
                      {[
                        { value: 'eight', label: 'Eight（エイト）' },
                        { value: 'sansan', label: 'Sansan' },
                        { value: 'wantedly', label: 'Wantedly People' },
                        { value: 'mybridge', label: 'myBridge' },
                        { value: 'camcard', label: 'CamCard' },
                        { value: 'other', label: 'その他' }
                      ].map((app) => (
                        <div key={app.value}>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              value={app.value}
                              checked={cardAppType.includes(app.value)}
                              onChange={(e) => handleCardAppChange(app.value, e.target.checked)}
                              className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 rounded"
                            />
                            <span className="ml-3 text-sm text-gray-700">{app.label}</span>
                          </label>
                          
                          {/* その他選択時の入力欄 */}
                          {app.value === 'other' && cardAppType.includes('other') && (
                            <div className="mt-2 ml-7">
                              <input
                                type="text"
                                placeholder="アプリ名を入力してください"
                                value={otherCardApp}
                                onChange={(e) => setOtherCardApp(e.target.value)}
                                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] text-sm"
                              />
                              {validationErrors.otherCardApp && (
                                <p className="mt-1 text-sm text-red-500">{validationErrors.otherCardApp}</p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {validationErrors.cardAppType && (
                      <p className="mt-2 text-sm text-red-500">{validationErrors.cardAppType}</p>
                    )}
                  </div>

                  {/* Eightプレミアム設定 - 緑枠で囲む（細い枠線） */}
                  {cardAppType.includes('eight') && (
                    <div className="border border-[#00736d] bg-white rounded-lg p-4 space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Eightプレミアムを利用していますか？</p>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="isEightPremium"
                              value="yes"
                              checked={isEightPremium === true}
                              onChange={() => setIsEightPremium(true)}
                              className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300"
                            />
                            <span className="ml-3 text-sm text-gray-700">はい</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name="isEightPremium"
                              value="no"
                              checked={isEightPremium === false}
                              onChange={() => setIsEightPremium(false)}
                              className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300"
                            />
                            <span className="ml-3 text-sm text-gray-700">いいえ</span>
                          </label>
                        </div>
                        {validationErrors.isEightPremium && (
                          <p className="mt-2 text-sm text-red-500">{validationErrors.isEightPremium}</p>
                        )}
                        
                        {/* Eightプレミアム利用時のメッセージ */}
                        {isEightPremium === true && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-5 w-5 text-[#00736d] mt-0.5 flex-shrink-0" />
                              <p className="text-sm text-green-800">
                                EightからダウンロードしたCSVデータをアップロードしてサービスにご活用いただけます
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 名刺管理アプリへの登録状況 */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      所有している名刺のうち、名刺管理アプリに登録している割合はどの程度ですか？
                    </p>
                    <div className="space-y-2">
                      {[
                        { value: 'mostly_all', label: '基本的にすべて登録している（だいたい80～100％）' },
                        { value: 'mostly', label: 'ほとんど登録している（だいたい60～80％）' },
                        { value: 'half', label: '半分程度登録している（だいたい40～60％）' },
                        { value: 'some', label: 'あまり登録していない（だいたい20～40％）' },
                        { value: 'few', label: 'ほとんど登録していない（だいたい0～20％）' }
                      ].map((option) => (
                        <label key={option.value} className="flex items-start">
                          <input
                            type="radio"
                            name="registeredCardCount"
                            value={option.value}
                            checked={registeredCardCount === option.value}
                            onChange={(e) => setRegisteredCardCount(e.target.value)}
                            className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 mt-0.5"
                          />
                          <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                    {validationErrors.registeredCardCount && (
                      <p className="mt-2 text-sm text-red-500">{validationErrors.registeredCardCount}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 所属企業の設定セクション */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="mr-3 h-5 w-5 text-[#1D73C3]" />
              所属企業の設定
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              登録しておくと、営業メッセージを送信しないようNG設定することができます
            </p>

            {/* 現在の所属企業 */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">現在の所属企業</h3>
              
              <div className="space-y-4">
                {/* 企業名入力 */}
                <div>
                  <label htmlFor="currentCompany" className="block text-sm font-medium text-gray-700 mb-1">
                    企業名 {!isIndividualBusiness && <span className="text-red-500">*</span>}
                    {isIndividualBusiness && (
                      <span className="text-red-500 text-sm ml-2">屋号を入力してください（任意）</span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="currentCompany"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] ${
                      validationErrors.currentCompany ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder={isIndividualBusiness ? "屋号を入力してください" : "企業名を入力してください"}
                  />
                  {validationErrors.currentCompany && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.currentCompany}</p>
                  )}
                </div>

                {/* 役職 */}
                <div>
                  <label htmlFor="currentPosition" className="block text-sm font-medium text-gray-700 mb-1">
                    現在の役職 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="currentPosition"
                    value={currentPosition}
                    onChange={(e) => setCurrentPosition(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] ${
                      validationErrors.currentPosition ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="例：営業部長、エンジニア、マネージャーなど"
                  />
                  <p className="text-sm text-gray-500 mt-1">役職がない場合は「役職なし」と入力</p>
                  {validationErrors.currentPosition && (
                    <p className="mt-1 text-sm text-red-500">{validationErrors.currentPosition}</p>
                  )}
                </div>

                {/* 個人事業主チェックボックス */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isIndividualBusiness}
                      onChange={(e) => setIsIndividualBusiness(e.target.checked)}
                      className="h-4 w-4 text-[#1D73C3] focus:ring-[#1D73C3] border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-700">個人事業主</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 過去の所属企業 */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5 text-[#1D73C3]" />
                過去の所属企業
              </h3>
              
              <div className="space-y-6">
                {/* 動的に追加された過去の企業 */}
                {pastCompanies.map((company, index) => (
                  <div key={company.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-md font-medium text-gray-800">
                        過去の所属企業{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removePastCompany(company.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          企業名 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={company.name}
                          onChange={(e) => updatePastCompany(company.id, 'name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] ${
                            validationErrors[`pastCompany_${company.id}_name`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="企業名を入力してください"
                        />
                        {validationErrors[`pastCompany_${company.id}_name`] && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors[`pastCompany_${company.id}_name`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          最終役職 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={company.position}
                          onChange={(e) => updatePastCompany(company.id, 'position', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3] ${
                            validationErrors[`pastCompany_${company.id}_position`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          placeholder="例：営業部長、エンジニアなど"
                        />
                        <p className="text-sm text-gray-500 mt-1">役職がない場合は「役職なし」と入力</p>
                        {validationErrors[`pastCompany_${company.id}_position`] && (
                          <p className="mt-1 text-sm text-red-500">{validationErrors[`pastCompany_${company.id}_position`]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 追加ボタン */}
                {pastCompanies.length < MAX_PAST_COMPANIES && (
                  <div>
                    <button
                      type="button"
                      onClick={addPastCompany}
                      className="flex items-center text-sm font-medium text-[#00736d] hover:text-[#005a54] transition-colors duration-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      過去の所属企業を追加
                    </button>
                  </div>
                )}

                {pastCompanies.length >= MAX_PAST_COMPANIES && (
                  <p className="text-sm text-gray-500">
                    過去の所属企業は最大{MAX_PAST_COMPANIES}社まで登録できます
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* SNSプロフィールURLセクション */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <ExternalLink className="mr-3 h-5 w-5 text-[#1D73C3]" />
              SNSプロフィールURL
            </h2>
            
            <div className="space-y-6">
              {/* LinkedIn */}
              <div>
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  LinkedIn プロフィールURL（任意）
                </label>
                <input
                  type="url"
                  id="linkedinUrl"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3]"
                  placeholder="https://www.linkedin.com/in/yourprofile"
                />
              </div>

              {/* Facebook */}
              <div>
                <label htmlFor="facebookUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  Facebook プロフィールURL（任意）
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D73C3] focus:border-[#1D73C3]"
                  placeholder="https://www.facebook.com/yourprofile"
                />
              </div>

              <p className="text-sm text-gray-500">
                SNSプロフィールを登録すると、より詳細なマッチングが可能になります
              </p>
            </div>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">入力エラー</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  更新中...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  更新する
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full flex items-center justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
            >
              キャンセル
            </button>
          </div>
        </form>

        {/* ヘルプセクション */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">入力について</h3>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• 変更した情報は即座に反映されます</p>
            <p>• 個人事業主の場合は企業名の代わりに屋号を入力してください</p>
            <p>• 役職がない場合は「役職なし」と入力してください</p>
            <p>• 過去の所属企業は最大10社まで登録できます</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyEdit;