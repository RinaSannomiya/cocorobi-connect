import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Upload, FileText, CheckCircle, AlertCircle, X, Database, Lock, Tag, Info, TrendingUp, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

interface CsvData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface BusinessCard {
  company: string;
  department: string;
  position: string;
  lastName: string;
  firstName: string;
  email: string;
  postalCode: string;
  address: string;
  companyPhone: string;
  departmentPhone: string;
  directPhone: string;
  fax: string;
  mobile: string;
  url: string;
  exchangeDate: string;
  [key: string]: string; // その他のカラム用
}

interface DuplicateInfo {
  totalProcessed: number;
  newRecords: number;
  updatedRecords: number;
  duplicatesSkipped: number;
  duplicateDetails: Array<{
    name: string;
    company: string;
    email: string;
    reason: string;
    action: 'new' | 'updated' | 'skipped';
  }>;
}

const CsvUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [parsedCards, setParsedCards] = useState<BusinessCard[]>([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [savedToDatabase, setSavedToDatabase] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const [myTagsCount, setMyTagsCount] = useState(0);
  const [myTags, setMyTags] = useState<string[]>([]);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [isEightPremiumUser, setIsEightPremiumUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { saveCSVData, getUserData, getAllUserMyTags } = useAuth();
  
  // URLパラメータから遷移元を判定
  const [searchParams] = useSearchParams();
  const fromDashboard = searchParams.get('from') === 'dashboard';

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // CSVアップロード完了後のブラウザバック防止
  useEffect(() => {
    if (uploadComplete) {
      const preventBack = () => {
        window.history.pushState(null, null, location.href);
      };
      
      window.addEventListener('popstate', preventBack);
      window.history.pushState(null, null, location.href);
      
      return () => {
        window.removeEventListener('popstate', preventBack);
      };
    }
  }, [uploadComplete]);

  // 基本項目の定義
  const basicFields = new Set([
    '会社名', '部署名', '役職', '姓', '名', 'e-mail', 'email', 'メール',
    '郵便番号', '住所', 'TEL会社', 'TEL部門', 'TEL直通', 'Fax', 'FAX',
    '携帯電話', '携帯', 'URL', 'ホームページ', '名刺交換日', '交換日'
  ]);

  // 画面遷移時に最上部にスクロール
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ユーザーのEightプレミアム登録状況を確認
  useEffect(() => {
    const checkEightPremiumStatus = async () => {
      try {
        setIsLoading(true);
        const userData = await getUserData();
        
        if (userData) {
          const hasEight = userData.has_eight || false;
          const isEightPremium = userData.is_eight_premium || false;
          
          console.log('User Eight status:', { hasEight, isEightPremium });
          setIsEightPremiumUser(hasEight && isEightPremium);
        } else {
          setIsEightPremiumUser(false);
        }
      } catch (error) {
        console.error('Error checking Eight Premium status:', error);
        setIsEightPremiumUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkEightPremiumStatus();
  }, [getUserData]);

  // CSVヘッダーのマッピング
  const headerMapping: { [key: string]: keyof BusinessCard } = {
    '会社名': 'company',
    '部署名': 'department',
    '役職': 'position',
    '姓': 'lastName',
    '名': 'firstName',
    'e-mail': 'email',
    'email': 'email',
    'メール': 'email',
    '郵便番号': 'postalCode',
    '住所': 'address',
    'TEL会社': 'companyPhone',
    'TEL部門': 'departmentPhone',
    'TEL直通': 'directPhone',
    'Fax': 'fax',
    'FAX': 'fax',
    '携帯電話': 'mobile',
    '携帯': 'mobile',
    'URL': 'url',
    'ホームページ': 'url',
    '名刺交換日': 'exchangeDate',
    '交換日': 'exchangeDate'
  };

  const validateFile = (selectedFile: File): string | null => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      return 'CSVファイルを選択してください。';
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      return 'ファイルサイズが10MBを超えています。';
    }
    
    return null;
  };

  const parseCSV = (text: string): Promise<CsvData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('CSVファイルの解析に失敗しました: ' + results.errors[0].message));
            return;
          }

          const data = results.data as string[][];
          if (data.length === 0) {
            reject(new Error('CSVファイルが空です。'));
            return;
          }

          const headers = data[0].map(header => header.trim());
          const rows = data.slice(1).filter(row => row.some(cell => cell && cell.trim()));

          resolve({
            headers,
            rows,
            totalRows: rows.length
          });
        },
        error: (error) => {
          reject(new Error('CSVファイルの読み込みに失敗しました: ' + error.message));
        }
      });
    });
  };

  const mapCsvToBusinessCards = (csvData: CsvData): BusinessCard[] => {
    const { headers, rows } = csvData;
    
    return rows.map(row => {
      const card: BusinessCard = {
        company: '',
        department: '',
        position: '',
        lastName: '',
        firstName: '',
        email: '',
        postalCode: '',
        address: '',
        companyPhone: '',
        departmentPhone: '',
        directPhone: '',
        fax: '',
        mobile: '',
        url: '',
        exchangeDate: ''
      };

      headers.forEach((header, index) => {
        const value = row[index] || '';
        const mappedKey = headerMapping[header];
        
        if (mappedKey) {
          card[mappedKey] = value.trim();
        } else {
          // その他のカラムもそのまま保存
          card[header] = value.trim();
        }
      });

      return card;
    });
  };

  const extractMyTags = (headers: string[]): string[] => {
    return headers.filter(header => !basicFields.has(header));
  };

  const handleFileSelect = async (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploading(true);
    setUploadProgress(0);
    setSavedToDatabase(false);
    setMyTagsCount(0);
    setMyTags([]);
    setDuplicateInfo(null);

    try {
      // Simulate upload progress for UI feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 30) {
            clearInterval(progressInterval);
            return 30;
          }
          return prev + 5;
        });
      }, 100);

      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          const parsedData = await parseCSV(text);
          
          setCsvData(parsedData);
          setUploadProgress(50);
          
          // Parse business cards
          const businessCards = mapCsvToBusinessCards(parsedData);
          setParsedCards(businessCards);

          // Extract my tags
          const detectedMyTags = extractMyTags(parsedData.headers);
          setMyTags(detectedMyTags);
          setMyTagsCount(detectedMyTags.length);
          
          // Save to database with duplicate detection
          toast.loading('データベースに保存中...', { id: 'saving' });
          
          const result = await saveCSVData(selectedFile, text);
          setRecordCount(result.recordCount);
          setMyTagsCount(result.myTagsCount);
          setMyTags(result.myTags);
          setDuplicateInfo(result.duplicateInfo);
          setSavedToDatabase(true);
          
          setUploadProgress(100);
          setUploadComplete(true);
          
          // 重複情報に基づいたメッセージ表示
          const { duplicateInfo: dupInfo } = result;
          let message = `CSVデータを保存しました（${result.recordCount}件`;
          if (result.myTagsCount > 0) {
            message += `、マイタグ${result.myTagsCount}個`;
          }
          message += '）';
          
          if (dupInfo.duplicatesSkipped > 0 || dupInfo.updatedRecords > 0) {
            message += ` - 新規${dupInfo.newRecords}件、更新${dupInfo.updatedRecords}件、重複スキップ${dupInfo.duplicatesSkipped}件`;
          }
          
          toast.success(message, { id: 'saving' });
          
          clearInterval(progressInterval);
        } catch (parseError) {
          console.error('CSV processing error:', parseError);
          const errorMessage = parseError instanceof Error ? parseError.message : 'CSVファイルの処理に失敗しました';
          setError(errorMessage);
          toast.error(errorMessage, { id: 'saving' });
          clearInterval(progressInterval);
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        const errorMessage = 'ファイルの読み込みに失敗しました。';
        setError(errorMessage);
        toast.error(errorMessage);
        setUploading(false);
        clearInterval(progressInterval);
      };

      reader.readAsText(selectedFile, 'UTF-8');
      
    } catch (err) {
      console.error('File processing error:', err);
      const errorMessage = 'ファイルの処理に失敗しました。';
      setError(errorMessage);
      toast.error(errorMessage);
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const resetUpload = () => {
    setFile(null);
    setCsvData(null);
    setParsedCards([]);
    setError('');
    setUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    setSavedToDatabase(false);
    setRecordCount(0);
    setMyTagsCount(0);
    setMyTags([]);
    setDuplicateInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // マイタグ設定画面表示判定ロジックの修正
  const shouldShowMyTagSettings = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // 累積的なマイタグチェック機能を使用
      const allUserMyTags = await getAllUserMyTags(user.id);
      console.log('All user MyTags check result:', {
        userId: user.id,
        allMyTagsCount: allUserMyTags.length,
        allMyTags: allUserMyTags
      });

      return allUserMyTags.length > 0;
    } catch (error) {
      console.error('Error checking MyTag settings requirement:', error);
      return false;
    }
  };

  const handleContinue = async () => {
    try {
      // 累積的なマイタグチェックを実行
      const shouldShowSettings = await shouldShowMyTagSettings();
      
      console.log('MyTag settings check:', {
        currentUploadMyTags: myTagsCount,
        shouldShowSettings: shouldShowSettings
      });

      if (shouldShowSettings) {
        // トースト通知を削除 - 無言で自然に画面遷移
        navigate('/mytag-sales-settings?from=csv-upload');
      } else {
        toast.success('CSVアップロードが完了しました！');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
      // エラーが発生した場合はダッシュボードに遷移
      toast.success('CSVアップロードが完了しました！');
      navigate('/dashboard');
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleEditProfile = () => {
    navigate('/dashboard');
  };

  const handleCsvUpload = () => {
    // Reset and allow new upload - スクロール機能を追加
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    };
    
    scrollToTop();
    resetUpload();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getProgressMessage = () => {
    if (uploadProgress < 30) return 'ファイルを読み込み中...';
    if (uploadProgress < 50) return 'CSVデータを解析中...';
    if (uploadProgress < 100) return 'データベースに保存中...';
    return '完了';
  };

  // 重複情報の表示コンポーネント
  const DuplicateInfoDisplay = ({ duplicateInfo }: { duplicateInfo: DuplicateInfo }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3 mb-3">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h4 className="text-sm font-medium text-blue-800">重複判定結果</h4>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-900">{duplicateInfo.totalProcessed}</div>
            <div className="text-xs text-blue-700">処理件数</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{duplicateInfo.newRecords}</div>
            <div className="text-xs text-green-700">新規追加</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">{duplicateInfo.updatedRecords}</div>
            <div className="text-xs text-orange-700">更新</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">{duplicateInfo.duplicatesSkipped}</div>
            <div className="text-xs text-gray-700">スキップ</div>
          </div>
        </div>

        {duplicateInfo.duplicateDetails.length > 0 && (
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
            >
              <Info className="h-4 w-4 mr-1" />
              {showDetails ? '詳細を非表示' : '詳細を表示'}
            </button>
            
            {showDetails && (
              <div className="mt-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {duplicateInfo.duplicateDetails.slice(0, 10).map((detail, index) => (
                    <div key={index} className="text-xs bg-white rounded p-2 border">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{detail.name || '名前なし'}</span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          detail.action === 'new' ? 'bg-green-100 text-green-800' :
                          detail.action === 'updated' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {detail.action === 'new' ? '新規' : 
                           detail.action === 'updated' ? '更新' : 'スキップ'}
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">
                        {detail.company && <span>会社: {detail.company}</span>}
                        {detail.email && <span className="ml-2">メール: {detail.email}</span>}
                      </div>
                      <div className="text-gray-500 mt-1">{detail.reason}</div>
                    </div>
                  ))}
                  {duplicateInfo.duplicateDetails.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">
                      ...他 {duplicateInfo.duplicateDetails.length - 10} 件
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ローディング中の表示
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D73C3] mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">ユーザー情報を確認中...</p>
        </div>
      </div>
    );
  }

  // Eightプレミアムユーザーでない場合の表示
  if (!isEightPremiumUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full space-y-8">
          {/* ページタイトル */}
          <div className="text-center py-6">
            <h1 className="text-2xl font-bold text-[#00142E]">
              名刺データアップロード
            </h1>
          </div>

          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
              <Lock className="h-10 w-10 text-yellow-600" />
            </div>
            <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
              CSVアップロード機能
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              この機能はEightプレミアムユーザー限定です
            </p>
          </div>

          <div className="bg-white shadow rounded-lg p-6 space-y-4">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-yellow-600">
                <AlertCircle className="h-6 w-6" />
                <h3 className="text-lg font-medium">アクセス制限</h3>
              </div>
              
              <div className="space-y-3 text-sm text-gray-700">
                <p className="leading-relaxed">
                  CSVアップロード機能をご利用いただくには、<strong>Eightプレミアム</strong>への登録が必要です。
                </p>
                <p className="leading-relaxed">
                  アンケートでEightプレミアムを利用していると回答いただいた方のみご利用いただけます。
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <h4 className="font-medium mb-1">Eightプレミアムについて</h4>
                    <p className="text-blue-700">
                      Eightプレミアムは、名刺管理アプリ「Eight」の有料プランです。
                      CSVエクスポート機能など、より高度な機能をご利用いただけます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/survey')}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#1D73C3] hover:bg-[#155a9a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
            >
              アンケートを修正する
            </button>
            
            <button
              onClick={handleSkip}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3] transition-colors duration-200"
            >
              スキップして完了する
            </button>
          </div>

          {/* Progress Indicator - 登録フロー中のみ表示 */}
          {!fromDashboard && (
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
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="ml-1">名刺データ</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Eightプレミアムユーザーの場合は既存のCSVアップロード画面を表示
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* ページタイトル */}
        <div className="text-center py-6">
          <h1 className="text-2xl font-bold text-[#00142E]">
            名刺データアップロード
          </h1>
        </div>

        {!uploadComplete ? (
          <div className="space-y-6">
            {/* Upload Area */}
            <div
              className={`relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg transition-colors ${
                uploading 
                  ? 'border-[#00736d] bg-green-50' 
                  : 'border-gray-300 hover:border-[#00736d] hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-2 text-center">
                <Upload className={`mx-auto h-12 w-12 ${uploading ? 'text-[#00736d]' : 'text-gray-400'}`} />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-[#00736d] hover:text-[#005a54] focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#00736d]"
                  >
                    <span>ファイルを選択</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      ref={fileInputRef}
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">またはドラッグ＆ドロップ</p>
                </div>
                <p className="text-xs text-gray-500">CSVファイルのみ（最大10MB）</p>
              </div>
            </div>

            {/* File Info */}
            {file && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-[#00736d]" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  {!uploading && (
                    <button
                      onClick={resetUpload}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                {uploading && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{getProgressMessage()}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#00736d] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* CSV Preview */}
            {csvData && !uploading && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">
                    データプレビュー（{csvData.totalRows}件）
                  </h4>
                  {myTagsCount > 0 && (
                    <div className="mt-2 flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-[#00736d]" />
                      <span className="text-sm text-[#00736d] font-medium">
                        検出されたマイタグ: {myTagsCount}個
                      </span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvData.headers.slice(0, 6).map((header, index) => (
                          <th
                            key={index}
                            className={`px-4 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                              basicFields.has(header) ? 'text-gray-500' : 'text-[#00736d]'
                            }`}
                          >
                            {header}
                            {!basicFields.has(header) && (
                              <Tag className="inline h-3 w-3 ml-1" />
                            )}
                          </th>
                        ))}
                        {csvData.headers.length > 6 && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ...
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {csvData.rows.slice(0, 5).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.slice(0, 6).map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate"
                            >
                              {cell}
                            </td>
                          ))}
                          {row.length > 6 && (
                            <td className="px-4 py-2 text-sm text-gray-500">
                              ...
                            </td>
                          )}
                        </tr>
                      ))}
                      {csvData.rows.length > 5 && (
                        <tr>
                          <td
                            colSpan={Math.min(csvData.headers.length, 7)}
                            className="px-4 py-2 text-sm text-gray-500 text-center"
                          >
                            ...他 {csvData.rows.length - 5} 件
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 安心メッセージ - 登録フロー中のみ表示 */}
            {!fromDashboard && (
              <div className="text-center">
                <p className="text-sm text-[#1D73C3] mb-3">
                  登録完了後もアップロード可能です。
                </p>
              </div>
            )}

            {/* Skip Option */}
            <div className="text-center">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                {fromDashboard ? 'ダッシュボードに戻る' : 'スキップして完了する'}
              </button>
            </div>
          </div>
        ) : (
          /* Upload Complete */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-[#00736d]" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                CSVファイルのアップロードが完了しました
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                CSVファイルが正常に処理され、データベースに保存されました
              </p>
            </div>

            {/* Save Status */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-[#00736d]" />
                  <span className="text-sm font-medium text-green-800">データベース保存完了</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-green-700">
                {recordCount}件の名刺データが正常に保存されました
              </p>
              {myTagsCount > 0 && (
                <div className="mt-2 flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-[#00736d]" />
                  <span className="text-sm text-[#00736d] font-medium">
                    検出されたマイタグ: {myTagsCount}個
                  </span>
                </div>
              )}
            </div>

            {/* CSV Data Preview */}
            {csvData && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">
                    保存されたデータ（{csvData.totalRows}件）
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          会社名
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          氏名
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedCards.slice(0, 5).map((card, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {card.company}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {`${card.lastName} ${card.firstName}`.trim()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {card.position}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {card.email}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {card.companyPhone || card.directPhone || card.mobile}
                          </td>
                        </tr>
                      ))}
                      {parsedCards.length > 5 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-2 text-sm text-gray-500 text-center"
                          >
                            ...他 {parsedCards.length - 5} 件
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 重複判定結果の表示 - データプレビューの下に移動 */}
            {duplicateInfo && (
              <DuplicateInfoDisplay duplicateInfo={duplicateInfo} />
            )}

            {/* マイタグ一覧表示 - 重複判定結果の下に移動 */}
            {myTags.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-[#00736d]" />
                  検出されたマイタグ一覧（{myTagsCount}個）
                </h4>
                <div className="flex flex-wrap gap-2">
                  {myTags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-[#00736d] text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  マイタグは名刺データと一緒に保存され、検索やフィルタリングに活用できます
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCsvUpload}
                className="w-full py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1D73C3]"
              >
                別のファイルをアップロード
              </button>
              <button
                onClick={handleContinue}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#00736d] hover:bg-[#005a54] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00736d]"
              >
                {fromDashboard ? 'ダッシュボードに戻る' : '登録を完了する'}
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            CSVアップロードについて
          </h3>
          <div className="text-xs text-blue-700 space-y-2">
            <div>
              <p className="font-medium">対応アプリ:</p>
              <p>• Eight（エイト）</p>
            </div>
            <div>
              <p className="font-medium">基本カラム:</p>
              <p>会社名, 部署名, 役職, 姓, 名, e-mail, 郵便番号, 住所, TEL会社, TEL部門, TEL直通, Fax, 携帯電話, URL, 名刺交換日</p>
            </div>
            <div>
              <p className="font-medium">マイタグ機能:</p>
              <p>• 基本カラム以外の全てのカラムをマイタグとして認識</p>
              <p>• マイタグは名刺データと一緒に保存され、検索・フィルタリングに活用可能</p>
            </div>
            <div className="mt-3 text-xs text-blue-600 space-y-1">
              <p>※マイタグ・共有タグも本サービスでそのままご利用いただけます</p>
              <p>• ファイルはSupabaseストレージに安全に保存されます</p>
              <p>• 名刺データは構造化されてデータベースに保存されます</p>
              <p>• 対応形式：CSV（カンマ区切り、UTF-8エンコード）</p>
              <p>• 最大ファイルサイズ：10MB</p>
            </div>
          </div>
        </div>

        {/* Progress Indicator - 登録フロー中のみ表示 */}
        {!fromDashboard && (
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
                <div className="w-3 h-3 bg-[#00736d] rounded-full"></div>
                <span className="ml-1">名刺データ</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvUpload;