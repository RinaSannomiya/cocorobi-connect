import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Tag, 
  Save, 
  AlertCircle, 
  ArrowLeft,
  X,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MyTagSettings {
  [tagName: string]: boolean; // true = OK（営業可能）, false = NG（営業停止）
}

const MyTagSalesSettings = () => {
  const { getUserMyTags } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [myTags, setMyTags] = useState<string[]>([]);
  const [tagSettings, setTagSettings] = useState<MyTagSettings>({});
  const [originalSettings, setOriginalSettings] = useState<MyTagSettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveCompleted, setIsSaveCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 遷移元を判定
  const fromCsvUpload = searchParams.get('from') === 'csv-upload';

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

  // マイタグと設定を取得
  useEffect(() => {
    const loadMyTagsAndSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // ユーザーのマイタグを取得
        const userMyTags = await getUserMyTags();
        setMyTags(userMyTags);

        if (userMyTags.length === 0) {
          setIsLoading(false);
          return;
        }

        // 現在のユーザーを取得
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw new Error(`認証エラー: ${userError.message}`);
        }
        
        if (!user) {
          throw new Error('ユーザーが見つかりません');
        }

        // 既存の設定を取得
        const { data: existingSettings, error: settingsError } = await supabase
          .from('mytag_settings')
          .select('tag_name, allow_sales')
          .eq('user_id', user.id);

        if (settingsError) {
          console.error('Settings fetch error:', settingsError);
          throw new Error(`設定の取得に失敗しました: ${settingsError.message}`);
        }

        // デフォルト設定（全てOK）を作成
        const defaultSettings: MyTagSettings = {};
        userMyTags.forEach(tag => {
          defaultSettings[tag] = true; // デフォルトはOK（営業可能）
        });

        // 既存の設定で上書き
        if (existingSettings && existingSettings.length > 0) {
          existingSettings.forEach(setting => {
            if (userMyTags.includes(setting.tag_name)) {
              defaultSettings[setting.tag_name] = setting.allow_sales;
            }
          });
        }

        setTagSettings(defaultSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings))); // Deep copy
      } catch (error) {
        console.error('Error loading my tags and settings:', error);
        const errorMessage = error instanceof Error ? error.message : 'マイタグ設定の読み込みに失敗しました';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadMyTagsAndSettings();
  }, [getUserMyTags]);

  // タグ設定の変更ハンドラー
  const handleTagToggle = (tagName: string, value: boolean) => {
    setTagSettings(prev => ({
      ...prev,
      [tagName]: value
    }));
  };

  // 保存ハンドラー
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`認証エラー: ${userError.message}`);
      }
      
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // 設定データを配列形式に変換
      const settingsArray = Object.entries(tagSettings).map(([tagName, allowSales]) => ({
        tag_name: tagName,
        allow_sales: allowSales
      }));

      // upsert_mytag_settings関数を使用して一括更新 - パラメータの順序を修正
      const { error } = await supabase.rpc('upsert_mytag_settings', {
        p_settings: settingsArray,
        p_user_id: user.id
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(`設定の保存に失敗しました: ${error.message}`);
      }

      // 元の設定を更新
      setOriginalSettings(JSON.parse(JSON.stringify(tagSettings)));
      
      // 保存完了状態を設定（ブラウザバック防止を有効化）
      setIsSaveCompleted(true);
      
      toast.success('マイタグ営業設定を保存しました');
      
      // 少し遅延してから画面遷移
      setTimeout(() => {
        if (fromCsvUpload) {
          navigate('/dashboard');
        } else {
          navigate('/profile-settings');
        }
      }, 1500);
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : '設定の保存に失敗しました';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // キャンセルハンドラー
  const handleCancel = () => {
    if (fromCsvUpload) {
      navigate('/dashboard');
    } else {
      navigate('/profile-settings');
    }
  };

  // 変更があるかチェック
  const hasChanges = () => {
    return JSON.stringify(tagSettings) !== JSON.stringify(originalSettings);
  };

  // トグルスイッチコンポーネント
  const ToggleSwitch = ({ tagName, value, onChange }: { 
    tagName: string; 
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
          <p className="mt-4 text-sm text-gray-600">マイタグ設定を読み込んでいます...</p>
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
          <div className="mt-4 space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
            >
              再試行
            </button>
            <button
              onClick={handleCancel}
              className="ml-2 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
            >
              戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (myTags.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header - 戻るボタンは遷移元に応じて表示 */}
          <div className="mb-8">
            {!fromCsvUpload && (
              <button
                onClick={handleCancel}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                戻る
              </button>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="text-center">
              <Tag className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                マイタグが見つかりません
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                CSVファイルをアップロードしてマイタグを追加してから、営業設定を行ってください。
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
        {/* Header - 戻るボタンは遷移元に応じて表示 */}
        <div className="mb-8">
          {!fromCsvUpload && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors duration-200"
              disabled={isSaveCompleted}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </button>
          )}
          <h1 className="text-3xl font-bold text-gray-900">マイタグ営業設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            各マイタグに対する営業メッセージの送信可否を設定してください
          </p>
        </div>

        {/* マイタグ営業設定 */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-[#1D73C3] px-6 py-4">
            <h3 className="text-lg font-medium text-white flex items-center">
              <Tag className="mr-2 h-5 w-5" />
              マイタグ営業設定
            </h3>
            <p className="text-blue-100 text-sm mt-1">
              各マイタグに対する営業メッセージ送信を設定してください
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* マイタグ一覧 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Tag className="mr-2 h-4 w-4 text-gray-500" />
                  検出されたマイタグ（{myTags.length}個）
                </h4>
                <span className="text-sm font-medium text-gray-700">営業メッセージ送信</span>
              </div>
              <div className="space-y-3">
                {myTags.map((tag, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-[#00736d]" />
                          <p className="font-medium text-gray-900">{tag}</p>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">マイタグ</p>
                      </div>
                      <div className="flex items-center">
                        <ToggleSwitch
                          tagName={tag}
                          value={tagSettings[tag] || false}
                          onChange={(value) => handleTagToggle(tag, value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 変更インジケーター */}
            {hasChanges() && !isSaveCompleted && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">変更が検出されました</p>
                    <p className="text-amber-700">
                      「保存する」ボタンで設定を保存してください。
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
                    保存中...
                  </>
                ) : isSaveCompleted ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    画面遷移中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {fromCsvUpload ? '設定を完了する' : '保存する'}
                  </>
                )}
              </button>

              {!fromCsvUpload && !isSaveCompleted && (
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
            <h3 className="text-sm font-medium text-blue-800 mb-2">マイタグ営業設定について</h3>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• デフォルトではすべてのマイタグが「OK」（営業可能）に設定されています</p>
              <p>• 「NG」に設定したマイタグが付いた名刺には営業メッセージが送信されません</p>
              <p>• 設定はいつでも変更できます</p>
              <p>• マイタグは名刺データから自動的に検出されます</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTagSalesSettings;