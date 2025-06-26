import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Users,
  AlertCircle,
  Loader,
  RefreshCw,
  ChevronDown,
  Upload,
  User,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SharedBusinessCard {
  id: string;
  contributor_id: string;
  shared_by_user_id: string;
  name: string;
  company: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  address: string;
  last_name: string;
  first_name: string;
  postal_code: string;
  company_phone: string;
  department_phone: string;
  direct_phone: string;
  fax: string;
  mobile: string;
  url: string;
  exchange_date: string;
  registration_date: string;
  update_date: string;
  raw_data: any;
  shared_at: string;
  is_active: boolean;
  created_at: string;
  // 貢献者情報
  contribution_type?: string;
  contributor_created_at?: string;
  is_own_contribution?: boolean;
}

const ContactsManager = () => {
  const [contacts, setContacts] = useState<SharedBusinessCard[]>([]);
  const [displayedContacts, setDisplayedContacts] = useState<SharedBusinessCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoadingStatus, setDataLoadingStatus] = useState<string>('初期化中...');
  const [isEightPremiumUser, setIsEightPremiumUser] = useState<boolean>(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 100;
  const INITIAL_DISPLAY = 10;

  const navigate = useNavigate();
  const { getUserData } = useAuth();

  // 名刺データ確認画面でのブラウザバック防止
  useEffect(() => {
    if (contacts.length > 0) {
      const preventBack = () => {
        window.history.pushState(null, null, location.href);
      };
      
      window.addEventListener('popstate', preventBack);
      window.history.pushState(null, null, location.href);
      
      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [contacts.length]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    loadContacts();
  }, []);

  useEffect(() => {
    if (contacts.length > 0) {
      const itemsToShow = currentPage === 1 ? INITIAL_DISPLAY : currentPage * ITEMS_PER_PAGE;
      setDisplayedContacts(contacts.slice(0, itemsToShow));
    }
  }, [contacts, currentPage]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setDataLoadingStatus('認証確認中...');

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw new Error(`認証エラー: ${authError.message}`);
      }

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      setDataLoadingStatus('サポーター情報確認中...');

      const { data: supporterData, error: supporterError } = await supabase
        .from('supporters')
        .select('id, email, csv_uploaded, csv_record_count, has_eight, is_eight_premium')
        .eq('email', user.email)
        .maybeSingle();

      if (supporterError) {
        throw new Error(`サポーター情報取得エラー: ${supporterError.message}`);
      }
      
      if (supporterData) {
        const hasEight = supporterData.has_eight || false;
        const isEightPremium = supporterData.is_eight_premium || false;
        const isEightPremiumUser = hasEight && isEightPremium;
        
        setIsEightPremiumUser(isEightPremiumUser);
      }
      
      setDataLoadingStatus('名刺データ取得中...');

      // 共有テーブルから自分が関与したデータを取得
      const { data: sharedContactsData, error: sharedContactsError } = await supabase
        .from('business_cards_shared')
        .select(`
          *,
          business_card_contributors!inner (
            contribution_type,
            created_at,
            contributor_user_id
          )
        `)
        .eq('business_card_contributors.contributor_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false });

      if (sharedContactsError) {
        console.error('Shared contacts error details:', {
          message: sharedContactsError.message,
          details: sharedContactsError.details,
          hint: sharedContactsError.hint,
          code: sharedContactsError.code
        });
        
        let errorMessage = `名刺データ取得エラー: ${sharedContactsError.message}`;
        if (sharedContactsError.details) {
          errorMessage += ` (詳細: ${sharedContactsError.details})`;
        }
        if (sharedContactsError.hint) {
          errorMessage += ` (ヒント: ${sharedContactsError.hint})`;
        }
        
        throw new Error(errorMessage);
      }

      setDataLoadingStatus('データ処理中...');

      // データを整形
      const processedContacts: SharedBusinessCard[] = (sharedContactsData || []).map(contact => {
        const contributor = contact.business_card_contributors[0];
        return {
          ...contact,
          contribution_type: contributor.contribution_type,
          contributor_created_at: contributor.created_at,
          is_own_contribution: contributor.contributor_user_id === user.id
        };
      });

      setContacts(processedContacts);
      setCurrentPage(1);

      if (processedContacts.length === 0) {
        if (supporterData?.csv_uploaded) {
          toast('CSVはアップロード済みですが、名刺データが見つかりません', {
            icon: '⚠️',
            style: {
              background: '#FEF3C7',
              color: '#D97706',
              border: '1px solid #F59E0B',
            },
            duration: 4000,
          });
        } else {
          toast('まだ名刺データがアップロードされていません', {
            icon: 'ℹ️',
            style: {
              background: '#EBF8FF',
              color: '#2B6CB0',
              border: '1px solid #3182CE',
            },
            duration: 3000,
          });
        }
      }
      // 成功時のトースト通知を削除

    } catch (err) {
      console.error('Load contacts error:', err);
      const errorMessage = err instanceof Error ? err.message : '名刺データの読み込みに失敗しました';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setDataLoadingStatus('完了');
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      const newItemsCount = Math.min(ITEMS_PER_PAGE, contacts.length - displayedContacts.length);
      toast.success(`${newItemsCount}件の追加データを読み込みました`);
      
    } catch (error) {
      toast.error('追加データの読み込みに失敗しました');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  // 追加アップロードボタンのスクロール機能を追加
  const handleAdditionalUpload = () => {
    // ページ最上部までスムーズスクロール
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // 既存のアップロード処理
    navigate('/csv-upload?from=dashboard');
  };

  const getDisplayName = (contact: SharedBusinessCard) => {
    return contact.name || `${contact.last_name || ''} ${contact.first_name || ''}`.trim() || '-';
  };

  const getDisplayPhone = (contact: SharedBusinessCard) => {
    return contact.phone || contact.company_phone || contact.direct_phone || contact.mobile || '-';
  };

  const getRemainingCount = () => {
    return contacts.length - displayedContacts.length;
  };

  const isAllDataDisplayed = () => {
    return displayedContacts.length >= contacts.length;
  };

  // マイタグを取得する関数
  const getMyTags = (contact: SharedBusinessCard): string[] => {
    if (!contact.raw_data || !contact.raw_data.myTags) {
      return [];
    }
    
    return Object.entries(contact.raw_data.myTags)
      .filter(([_, value]) => value && value.toString().trim() !== '')
      .map(([key, _]) => key);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <Loader className="animate-spin h-8 w-8 text-[#1D73C3] mx-auto" />
          <p className="mt-4 text-sm text-gray-600">{dataLoadingStatus}</p>
          <p className="mt-2 text-xs text-gray-500">データベース接続を確認中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full text-center space-y-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-medium text-gray-900">データ読み込みエラー</h2>
          <div className="text-sm text-gray-600 max-w-lg mx-auto">
            <p className="mb-2">{error}</p>
            <details className="text-xs text-gray-500 mt-4">
              <summary className="cursor-pointer hover:text-gray-700">技術的な詳細を表示</summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-left">
                <p>• テーブル構造の確認が必要な可能性があります</p>
                <p>• business_cards_shared テーブルが存在するか確認してください</p>
                <p>• business_card_contributors テーブルが存在するか確認してください</p>
                <p>• 必要なマイグレーションが適用されているか確認してください</p>
              </div>
            </details>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={loadContacts}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </button>
            <button
              onClick={handleBack}
              className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <User className="h-8 w-8 mr-3 text-[#1D73C3]" />
                名刺データ確認
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                アップロードした名刺データを確認できます
              </p>
            </div>
          </div>
        </div>

        {contacts.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              名刺データがありません
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              CSVファイルをアップロードして名刺データを追加してください
            </p>
            {isEightPremiumUser && (
              <div className="mt-6">
                <button
                  onClick={handleAdditionalUpload}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
                >
                  CSVアップロードページへ
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h4 className="text-sm font-medium text-gray-900">
                  名刺データ（{contacts.length}件）
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        氏名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        会社名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        部署名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        役職
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        メール
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        電話番号
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        マイタグ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedContacts.map((contact, index) => (
                      <tr key={contact.id || index} className={contact.is_own_contribution ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {getDisplayName(contact)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {contact.company || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {contact.department || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {contact.position || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {contact.email || '-'}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                          {getDisplayPhone(contact)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900 max-w-xs">
                          <div 
                            className="flex items-center gap-1 overflow-x-auto scrollbar-hide"
                            style={{ 
                              whiteSpace: 'nowrap',
                              minHeight: '1.5rem'
                            }}
                          >
                            {getMyTags(contact).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#00736d] text-white flex-shrink-0"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </span>
                            ))}
                            {getMyTags(contact).length === 0 && (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    
                    {!isAllDataDisplayed() && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-3 text-sm text-gray-500 text-center bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                        >
                          <button
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="flex items-center justify-center w-full text-[#1D73C3] hover:text-[#155a9a] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader className="animate-spin h-4 w-4 mr-2" />
                                読み込み中...
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                ...他 {getRemainingCount()} 件を表示
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {isEightPremiumUser && (
              <div className="mt-6">
                <button
                  onClick={handleAdditionalUpload}
                  className="w-full flex items-center justify-center py-3 px-4 border border-[#00736d] rounded-md shadow-sm text-sm font-medium text-[#00736d] bg-teal-50 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] transition-colors duration-200"
                >
                  <Upload className="h-5 w-5 mr-3" />
                  追加アップロード
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            名刺データについて
          </h3>
          <div className="text-xs text-blue-700 space-y-2">
            <p>• 名刺データはデータベースに安全に保存されています</p>
            <p>• データは暗号化され、適切なアクセス制御が設定されています</p>
            <p>• 名刺データは適宜AIによってデータを補完・更新しています</p>
            <p>• 青色の背景は自分がアップロードしたデータを示します</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactsManager;