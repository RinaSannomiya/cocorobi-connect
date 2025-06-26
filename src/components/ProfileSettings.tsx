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
  Edit,
  AlertCircle,
  Loader,
  Shield,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  name?: string;
  phone?: string;
  email?: string;
  card_count?: string;
  uses_card_app?: boolean;
  card_app_type?: string;
  is_eight_premium?: boolean;
  registered_card_count?: string;
  current_company?: string;
  current_position?: string;
  past_companies?: string[];
  survey_data?: {
    linkedinUrl?: string;
    facebookUrl?: string;
    [key: string]: any;
  };
  basic_info?: {
    excluded_companies?: string[];
    [key: string]: any;
  };
}

const ProfileSettings = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myTags, setMyTags] = useState<string[]>([]);
  const navigate = useNavigate();
  const { getUserData, getUserMyTags } = useAuth();

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ユーザーデータとマイタグを取得
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // ユーザーデータを取得
        const data = await getUserData();
        if (data) {
          setUserData(data);
        } else {
          setError('ユーザーデータが見つかりません');
        }

        // マイタグを取得
        const userMyTags = await getUserMyTags();
        setMyTags(userMyTags);
        
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('ユーザーデータの読み込みに失敗しました');
        toast.error('ユーザーデータの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [getUserData, getUserMyTags]);

  // 編集画面への遷移
  const handleEditBasicInfo = () => {
    navigate('/basic-info-edit');
  };

  const handleEditSurvey = () => {
    navigate('/survey-edit');
  };

  const handleEditWorkplaceExclusion = () => {
    navigate('/workplace-exclusion-edit');
  };

  const handleEditMyTagSettings = () => {
    navigate('/mytag-sales-settings');
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // データ表示用のヘルパー関数
  const formatCardAppInfo = () => {
    if (!userData?.uses_card_app) {
      return '利用していない';
    }

    const apps = userData.card_app_type?.split(',') || [];
    const appNames = apps.map(app => {
      switch (app.trim()) {
        case 'eight':
          return userData.is_eight_premium ? 'Eight（プレミアム）' : 'Eight';
        case 'sansan':
          return 'Sansan';
        case 'wantedly':
          return 'Wantedly People';
        case 'mybridge':
          return 'myBridge';
        case 'camcard':
          return 'CamCard';
        case 'other':
          return 'その他';
        default:
          return app;
      }
    });

    return appNames.join(', ') || '不明';
  };

  const formatCardUsageStatus = () => {
    const status = userData?.registered_card_count;
    switch (status) {
      case 'mostly_all':
        return '基本的にすべて登録している（だいたい80～100％）';
      case 'mostly':
        return 'ほとんど登録している（だいたい60～80％）';
      case 'half':
        return '半分程度登録している（だいたい40～60％）';
      case 'some':
        return 'あまり登録していない（だいたい20～40％）';
      case 'few':
        return 'ほとんど登録していない（だいたい0～20％）';
      default:
        return status || '未設定';
    }
  };

  const formatCardCount = () => {
    const count = userData?.card_count;
    switch (count) {
      case '~100':
        return '〜100枚';
      case '101-500':
        return '101〜500枚';
      case '501-1000':
        return '501〜1000枚';
      case '1001-3000':
        return '1001〜3000枚';
      case '3001-5000':
        return '3001〜5000枚';
      case '5001+':
        return '5001枚以上';
      default:
        return count || '未設定';
    }
  };

  const formatPastCompanies = () => {
    if (!userData?.past_companies || userData.past_companies.length === 0) {
      return '0社';
    }

    return `${userData.past_companies.length}社`;
  };

  const formatSNSContacts = () => {
    const linkedin = userData?.survey_data?.linkedinUrl;
    const facebook = userData?.survey_data?.facebookUrl;
    
    const contacts = [];
    if (linkedin) contacts.push('LinkedIn');
    if (facebook) contacts.push('Facebook');
    
    return contacts.length > 0 ? contacts.join(', ') : 'なし';
  };

  const formatExcludedCompanies = () => {
    const excludedCompanies = userData?.basic_info?.excluded_companies || [];
    return `${excludedCompanies.length}社をNG設定`;
  };

  const formatMyTagsInfo = () => {
    if (myTags.length === 0) {
      return 'マイタグなし';
    }
    return `${myTags.length}個のマイタグ`;
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
            onClick={handleBack}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </button>
          <h1 className="text-3xl font-bold text-gray-900">登録情報の確認・編集</h1>
          <p className="mt-2 text-sm text-gray-600">
            登録済みの情報を確認し、必要に応じて編集してください
          </p>
        </div>

        <div className="space-y-8">
          {/* 基本情報セクション */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-[#1D73C3] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <User className="mr-3 h-5 w-5" />
                基本情報
              </h2>
              <button
                onClick={handleEditBasicInfo}
                className="inline-flex items-center px-3 py-2 border border-white shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
              >
                <Edit className="h-4 w-4 mr-1" />
                編集する
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 氏名 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">氏名</p>
                    <p className="text-lg text-gray-900">{userData?.name || '未設定'}</p>
                  </div>
                </div>
              </div>

              {/* 電話番号 */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">電話番号</p>
                    <p className="text-lg text-gray-900">{userData?.phone || '未設定'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* その他登録情報セクション */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-[#1D73C3] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <CreditCard className="mr-3 h-5 w-5" />
                その他登録情報
              </h2>
              <button
                onClick={handleEditSurvey}
                className="inline-flex items-center px-3 py-2 border border-white shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
              >
                <Edit className="h-4 w-4 mr-1" />
                編集する
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 所有名刺枚数 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">所有名刺枚数</p>
                    <p className="text-lg text-gray-900">{formatCardCount()}</p>
                  </div>
                </div>
              </div>

              {/* 名刺アプリ利用状況 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Smartphone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">名刺アプリ利用状況</p>
                    <p className="text-lg text-gray-900">{formatCardAppInfo()}</p>
                    {userData?.uses_card_app && (
                      <p className="text-sm text-gray-500 mt-1">
                        登録状況: {formatCardUsageStatus()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 現在の所属企業 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">現在の所属企業</p>
                    <p className="text-lg text-gray-900">{userData?.current_company || '未設定'}</p>
                    {userData?.current_position && (
                      <p className="text-sm text-gray-500 mt-1">役職: {userData.current_position}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 過去の所属企業 */}
              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">過去の所属企業</p>
                    <p className="text-lg text-gray-900">{formatPastCompanies()}</p>
                    {userData?.past_companies && userData.past_companies.length > 0 && (
                      <div className="text-sm text-gray-500 mt-1 max-w-md">
                        {userData.past_companies.slice(0, 3).map((company, index) => {
                          const [name, position] = company.split(':');
                          return (
                            <div key={index}>
                              {position ? `${name}（${position}）` : name}
                            </div>
                          );
                        })}
                        {userData.past_companies.length > 3 && (
                          <div className="text-xs text-gray-400">
                            ...他 {userData.past_companies.length - 3} 社
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SNS連絡先 */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                  <ExternalLink className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">SNS連絡先</p>
                    <p className="text-lg text-gray-900">{formatSNSContacts()}</p>
                    {userData?.survey_data?.linkedinUrl && (
                      <p className="text-sm text-gray-500 mt-1 break-all">
                        LinkedIn: {userData.survey_data.linkedinUrl}
                      </p>
                    )}
                    {userData?.survey_data?.facebookUrl && (
                      <p className="text-sm text-gray-500 mt-1 break-all">
                        Facebook: {userData.survey_data.facebookUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* マイタグ営業設定セクション - マイタグがある場合のみ表示 */}
          {myTags.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="bg-[#1D73C3] px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white flex items-center">
                  <Tag className="mr-3 h-5 w-5" />
                  マイタグ営業設定
                </h2>
                <button
                  onClick={handleEditMyTagSettings}
                  className="inline-flex items-center px-3 py-2 border border-white shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  編集する
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between py-4">
                  <div className="flex items-center space-x-3">
                    <Tag className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-lg text-gray-900">{formatMyTagsInfo()}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        CSVから検出されたマイタグの営業可否を設定
                      </p>
                      {myTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {myTags.slice(0, 5).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[#00736d] text-white"
                            >
                              {tag}
                            </span>
                          ))}
                          {myTags.length > 5 && (
                            <span className="text-xs text-gray-400">
                              ...他 {myTags.length - 5} 個
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 営業NG企業設定セクション */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-[#1D73C3] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Shield className="mr-3 h-5 w-5" />
                営業NG企業設定
              </h2>
              <button
                onClick={handleEditWorkplaceExclusion}
                className="inline-flex items-center px-3 py-2 border border-white shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-transparent hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
              >
                <Edit className="h-4 w-4 mr-1" />
                編集する
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-lg text-gray-900">{formatExcludedCompanies()}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      営業メッセージの送信をNG設定する企業の設定
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <h4 className="font-medium mb-1">登録情報の編集について</h4>
                <div className="text-blue-700 space-y-1">
                  <p>• 各セクションの「編集する」ボタンから該当する編集画面に移動できます</p>
                  <p>• 変更した情報は即座に反映されます</p>
                  <p>• 営業NG企業設定は営業メッセージの送信制御に使用されます</p>
                  {myTags.length > 0 && (
                    <p>• マイタグ営業設定では、CSVから検出されたマイタグごとに営業可否を設定できます</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;