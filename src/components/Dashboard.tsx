import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Upload, 
  FileText, 
  LogOut,
  ArrowRight,
  CreditCard
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserData {
  name?: string;
  email?: string;
  csv_uploaded?: boolean;
  csv_record_count?: number;
  has_eight?: boolean;
  is_eight_premium?: boolean;
}

const Dashboard = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [sharedCardsCount, setSharedCardsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEightPremiumUser, setIsEightPremiumUser] = useState<boolean>(false);
  const [hasUploadedData, setHasUploadedData] = useState<boolean>(false);
  const navigate = useNavigate();
  const { signOut, getUserData, getSharedCardsCount } = useAuth();

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

  // ユーザーデータと累計件数を取得
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // ユーザーデータを取得
        const data = await getUserData();
        
        if (data) {
          setUserData(data);
          
          // Eightプレミアム利用状況を確認
          const hasEight = data.has_eight || false;
          const isEightPremium = data.is_eight_premium || false;
          const isEightPremiumUser = hasEight && isEightPremium;
          
          console.log('Eight Premium status check:', { hasEight, isEightPremium, isEightPremiumUser });
          setIsEightPremiumUser(isEightPremiumUser);

          // Eightプレミアムユーザーの場合のみ、実際のデータ存在をチェック
          if (isEightPremiumUser) {
            // 共有テーブルから累計件数を取得
            const count = await getSharedCardsCount();
            console.log('Dashboard shared cards count:', count);
            setSharedCardsCount(count);
            
            // 実際にデータがあるかどうかを判定
            setHasUploadedData(count > 0);
          }
        }
        
      } catch (error) {
        console.error('Error loading user data:', error);
        // エラー時はトースト通知を表示しない（サイレント処理）
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [getUserData, getSharedCardsCount]);

  const handleEditProfile = () => {
    navigate('/profile-settings');
  };

  const handleViewBusinessCards = () => {
    navigate('/contacts-manager');
  };

  const handleCsvUpload = () => {
    navigate('/csv-upload?from=dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('ログアウトに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D73C3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* User Name at Top */}
        <div className="text-center">
          <h2 className="text-lg font-medium text-gray-900">
            {userData?.name || 'サポーター'}さん
          </h2>
        </div>

        {/* Thank You Message - Direct on background */}
        <div className="text-center space-y-4">
          <div className="space-y-3 text-gray-900 leading-relaxed">
            <h3 className="text-2xl font-bold text-gray-900">
              本登録が完了いたしました。
            </h3>
            
            <p>
              サービスの正式リリースは <strong className="font-bold">2025年12月頃</strong> を予定しています。
            </p>
            
            <p>
              最新情報やご案内は、ご登録のメールアドレスにお送りいたします。
            </p>
            
            <p>
              リリースまでお待ちくださいませ。
            </p>
          </div>
        </div>

        {/* Menu Buttons */}
        <div className="space-y-3">
          {/* 登録情報の確認・編集 */}
          <button
            onClick={handleEditProfile}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
          >
            <User className="h-5 w-5 mr-3" />
            登録情報の確認・編集
          </button>

          {/* アップロードした名刺情報の確認（Eightプレミアムユーザーかつ実際にデータがある場合のみ表示） */}
          {isEightPremiumUser && hasUploadedData && (
            <button
              onClick={handleViewBusinessCards}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00736d] hover:bg-[#005a54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] transition-colors duration-200"
            >
              <CreditCard className="h-5 w-5 mr-3" />
              アップロードした名刺情報の確認
              {sharedCardsCount > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white text-gray-600">
                  {sharedCardsCount}件
                </span>
              )}
            </button>
          )}

          {/* CSVアップロード（Eightプレミアムユーザーのみ表示） */}
          {isEightPremiumUser && (
            <button
              onClick={handleCsvUpload}
              className="w-full flex items-center justify-center py-3 px-4 border border-[#00736d] rounded-md shadow-sm text-sm font-medium text-[#00736d] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d] transition-colors duration-200"
            >
              <Upload className="h-5 w-5 mr-3 text-[#00736d]" />
              {hasUploadedData ? '追加アップロード' : 'CSVファイルをアップロード'}
            </button>
          )}

          {/* ログアウト */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-3 px-4 border border-red-500 rounded-md shadow-sm text-sm font-medium text-red-500 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
          >
            <LogOut className="h-5 w-5 mr-3" />
            ログアウト
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
};

export default Dashboard;