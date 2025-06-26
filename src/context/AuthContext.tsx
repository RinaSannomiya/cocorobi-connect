import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface AuthContextType {
  registerEmail: (email: string, password?: string, name?: string) => Promise<{ isTestAccount: boolean }>;
  verifyCode: (code: string) => Promise<void>;
  setUserPassword: (password: string) => Promise<void>;
  updateBasicInfo: (data: any) => Promise<void>;
  saveComprehensiveSurveyData: (surveyData: any) => Promise<void>;
  saveCSVData: (file: File, csvContent: string) => Promise<{ recordCount: number; myTagsCount: number; myTags: string[]; duplicateInfo: DuplicateInfo }>;
  signIn: (email: string, password?: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<{ userStatus: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getUserStatus: () => Promise<string | null>;
  getRedirectPath: (userStatus?: string | null) => string;
  getUserData: () => Promise<any>;
  getSharedCardsCount: () => Promise<number>;
  saveExcludedCompanies: (excludedCompanies: string[]) => Promise<void>;
  getUserMyTags: () => Promise<string[]>;
  getAllUserMyTags: (userId: string) => Promise<string[]>;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpEmail: string | null;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'testTest00';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);

  const redirectUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserStatus = async (): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('supporters')
        .select('user_status')
        .eq('email', user.email)
        .maybeSingle();

      if (error) return null;
      if (!data) return null;

      return data.user_status;
    } catch (error) {
      return null;
    }
  };

  const getUserData = async (): Promise<any> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('supporters')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  };

  // 共有テーブルから累計件数を取得する関数
  const getSharedCardsCount = async (): Promise<number> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      console.log('Getting shared cards count for user:', user.id);

      // business_cards_sharedとbusiness_card_contributorsを結合して、
      // 現在のユーザーが提供者として登録されている全名刺データの件数を取得
      const { data, error, count } = await supabase
        .from('business_cards_shared')
        .select('business_card_contributors!inner(contributor_user_id)', { count: 'exact' })
        .eq('business_card_contributors.contributor_user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error getting shared cards count:', error);
        
        // フォールバック: business_card_contributorsから直接カウント
        const { data: contributorData, error: contributorError, count: contributorCount } = await supabase
          .from('business_card_contributors')
          .select('shared_card_id', { count: 'exact' })
          .eq('contributor_user_id', user.id);

        if (contributorError) {
          console.error('Error getting contributor count:', contributorError);
          return 0;
        }

        console.log('Fallback contributor count:', contributorCount);
        return contributorCount || 0;
      }

      console.log('Shared cards count:', count);
      return count || 0;
    } catch (error) {
      console.error('Error in getSharedCardsCount:', error);
      return 0;
    }
  };

  const saveExcludedCompanies = async (excludedCompanies: string[]): Promise<void> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      const { error } = await supabase
        .from('supporters')
        .update({
          basic_info: { excluded_companies: excludedCompanies },
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  const getUserMyTags = async (): Promise<string[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const supporterId = await ensureSupporterRecord(user);

      // ユーザーの全名刺データからマイタグを抽出
      const { data: businessCards, error } = await supabase
        .from('business_cards')
        .select('raw_data')
        .eq('supporter_id', supporterId);

      if (error) throw error;

      const allMyTags = new Set<string>();

      businessCards?.forEach(card => {
        if (card.raw_data && card.raw_data.myTags) {
          Object.keys(card.raw_data.myTags).forEach(tag => {
            if (card.raw_data.myTags[tag]) { // タグが設定されている場合のみ
              allMyTags.add(tag);
            }
          });
        }
      });

      return Array.from(allMyTags).sort();
    } catch (error) {
      console.error('Error getting user my tags:', error);
      return [];
    }
  };

  // 累積マイタグチェック機能の実装
  const getAllUserMyTags = async (userId: string): Promise<string[]> => {
    console.log('=== GET ALL USER MY TAGS START ===');
    console.log('User ID:', userId);
    
    try {
      // Get the full authenticated user object first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting authenticated user:', userError);
        return [];
      }

      // Ensure we have a valid user with email before proceeding
      if (!user.email) {
        console.error('User object missing email property');
        return [];
      }

      // 1. business_cardsテーブルから取得（従来の方法）
      const supporterId = await ensureSupporterRecord(user);
      
      const { data: businessCards, error: businessCardsError } = await supabase
        .from('business_cards')
        .select('raw_data')
        .eq('supporter_id', supporterId);

      if (businessCardsError) {
        console.error('Error fetching business_cards:', businessCardsError);
      }

      // 2. business_cards_sharedテーブルから取得（共有データ）
      const { data: sharedCards, error: sharedCardsError } = await supabase
        .from('business_cards_shared')
        .select('raw_data')
        .eq('shared_by_user_id', userId)
        .eq('is_active', true);

      if (sharedCardsError) {
        console.error('Error fetching shared_cards:', sharedCardsError);
      }

      // 3. business_card_contributorsテーブルから取得（貢献データ）
      const { data: contributorCards, error: contributorError } = await supabase
        .from('business_card_contributors')
        .select(`
          business_cards_shared!inner(raw_data)
        `)
        .eq('contributor_user_id', userId);

      if (contributorError) {
        console.error('Error fetching contributor_cards:', contributorError);
      }

      console.log('Data sources:', {
        businessCards: businessCards?.length || 0,
        sharedCards: sharedCards?.length || 0,
        contributorCards: contributorCards?.length || 0
      });

      const allMyTags = new Set<string>();

      // business_cardsからマイタグを抽出
      businessCards?.forEach(card => {
        if (card.raw_data && card.raw_data.myTags) {
          Object.keys(card.raw_data.myTags).forEach(tag => {
            if (card.raw_data.myTags[tag]) {
              allMyTags.add(tag);
            }
          });
        }
      });

      // business_cards_sharedからマイタグを抽出
      sharedCards?.forEach(card => {
        if (card.raw_data && card.raw_data.myTags) {
          Object.keys(card.raw_data.myTags).forEach(tag => {
            if (card.raw_data.myTags[tag]) {
              allMyTags.add(tag);
            }
          });
        }
      });

      // contributorCardsからマイタグを抽出
      contributorCards?.forEach(contributor => {
        const card = contributor.business_cards_shared;
        if (card && card.raw_data && card.raw_data.myTags) {
          Object.keys(card.raw_data.myTags).forEach(tag => {
            if (card.raw_data.myTags[tag]) {
              allMyTags.add(tag);
            }
          });
        }
      });

      const result = Array.from(allMyTags).sort();
      
      console.log('=== GET ALL USER MY TAGS END ===');
      console.log('Total unique MyTags found:', result.length);
      console.log('MyTags:', result);
      
      return result;
    } catch (error) {
      console.error('Error in getAllUserMyTags:', error);
      return [];
    }
  };

  const getRedirectPath = (userStatus?: string | null): string => {
    if (!userStatus) return '/basic-info';

    switch (userStatus) {
      case 'email_registered':
        return '/basic-info';
      case 'basic_registered':
      case 'basic_info_completed':
        return '/survey';
      case 'survey_completed':
      case 'csv_uploaded':
      case 'registration_complete':
        return '/dashboard';
      default:
        return '/basic-info';
    }
  };

  const ensureSupporterRecord = async (user: any): Promise<string> => {
    try {
      // Validate that user has required properties
      if (!user || !user.email) {
        throw new Error('User object is missing required email property');
      }

      const { data: existingRecord, error: selectError } = await supabase
        .from('supporters')
        .select('id, email')
        .eq('email', user.email)
        .maybeSingle();

      if (selectError) throw selectError;
      if (existingRecord) return existingRecord.id;

      const supporterData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || 'お客様',
        user_status: 'email_registered',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedRecord, error: insertError } = await supabase
        .from('supporters')
        .insert([supporterData])
        .select('id')
        .single();

      if (insertError) throw insertError;
      return insertedRecord.id;
    } catch (error) {
      throw error;
    }
  };

  const registerEmail = async (email: string, password?: string, name?: string): Promise<{ isTestAccount: boolean }> => {
    try {
      setError(null);
      
      if (email === TEST_EMAIL) {
        const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });

        if (signInError) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            options: { data: { name: 'テストユーザー' } }
          });
          if (signUpError) throw signUpError;
          
          if (signUpData.user) {
            await ensureSupporterRecord(signUpData.user);
          }
        } else {
          if (user) {
            await ensureSupporterRecord(user);
          }
        }

        setIsAuthenticated(true);
        return { isTestAccount: true };
      }

      // For non-test emails, use OTP signup
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${redirectUrl}/verify`,
          data: { name: name || 'お客様' }
        }
      });

      if (error) {
        if (error.message === 'User already registered' || 
            error.message.includes('user_already_exists') ||
            error.code === 'user_already_exists') {
          throw new Error('User already registered');
        }
        throw error;
      }

      setOtpEmail(email);
      return { isTestAccount: false };
      
    } catch (error) {
      throw error;
    }
  };

  const verifyCode = async (code: string) => {
    try {
      if (!otpEmail) throw new Error('メールアドレスが見つかりません');
      
      const { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: code,
        type: 'email'
      });

      if (error) {
        if (error.message.includes('Invalid OTP') || 
            error.message.includes('expired') ||
            error.message.includes('invalid')) {
          throw new Error('認証コードが正しくないか、期限切れです');
        }
        throw error;
      }
      
      if (data.user) await ensureSupporterRecord(data.user);
      setIsAuthenticated(true);
      // Don't clear otpEmail here - we need it for password setting
      
    } catch (error) {
      throw error;
    }
  };

  const setUserPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      // Clear otpEmail after successful password setting
      setOtpEmail(null);
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password?: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${redirectUrl}/verify`
        }
      });

      if (error) throw error;
      setOtpEmail(email);
    } catch (error) {
      throw error;
    }
  };

  const loginEmail = async (email: string, password: string): Promise<{ userStatus: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('メールまたはパスワードが正しくありません');
        } else if (error.message.includes('Email not confirmed')) {
          await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
              emailRedirectTo: `${redirectUrl}/verify`
            }
          });
          setOtpEmail(email);
          throw new Error('EMAIL_NOT_CONFIRMED');
        }
        throw error;
      }

      if (data.user) await ensureSupporterRecord(data.user);
      setIsAuthenticated(true);
      const userStatus = await getUserStatus();
      return { userStatus };
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Get user data to personalize the email
      const { data: userData } = await supabase
        .from('supporters')
        .select('name')
        .eq('email', email)
        .single();

      const userName = userData?.name || 'お客様';

      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        { 
          redirectTo: `${redirectUrl}/auth/callback`,
          // カスタムメールテンプレートのデータ
          data: {
            user_name: userName,
            site_name: 'Cocorobi'
          }
        }
      );
      
      if (error) {
        if (error.message.includes('User not found') || error.message.includes('not found')) {
          throw new Error('User not found');
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      setIsAuthenticated(false);
      
      if (error && 
          error.message !== 'Auth session missing!' && 
          error.message !== 'Session from session_id claim in JWT does not exist') {
        throw error;
      }
    } catch (error) {
      if (error.message !== 'Auth session missing!' && 
          error.message !== 'Session from session_id claim in JWT does not exist') {
        console.error('Sign out error:', error);
      }
    }
  };

  const updateBasicInfo = async (data: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      await ensureSupporterRecord(user);

      const { data: existingRecord } = await supabase
        .from('supporters')
        .select('id, email')
        .eq('email', user.email)
        .limit(1);

      const supporterData = {
        id: user.id,
        email: user.email,
        name: data.name,
        phone: data.phone,
        user_status: 'basic_registered',
        basic_info: { name: data.name, phone: data.phone },
        updated_at: new Date().toISOString()
      };

      let result;
      if (existingRecord && existingRecord.length > 0) {
        result = await supabase
          .from('supporters')
          .update(supporterData)
          .eq('email', user.email)
          .select()
          .single();
      } else {
        result = await supabase
          .from('supporters')
          .insert([supporterData])
          .select()
          .single();
      }
      
      if (result.error) throw result.error;
      toast.success('基本情報を保存しました');
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || 
            error.message.includes('already exists') ||
            error.message.includes('unique constraint') ||
            error.message.includes('violates unique constraint')) {
          const errorMsg = 'すでに登録済みのメールアドレスです';
          toast.error(errorMsg);
          throw new Error(errorMsg);
        } else {
          const errorMsg = `情報の登録に失敗しました: ${error.message}`;
          toast.error('情報の登録に失敗しました');
          throw new Error(errorMsg);
        }
      } else {
        const errorMsg = '予期しないエラーが発生しました';
        toast.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  };

  const saveComprehensiveSurveyData = async (surveyData: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      await ensureSupporterRecord(user);

      const { data, error } = await supabase
        .from('supporters')
        .update({
          card_count: surveyData.cardCount,
          uses_card_app: surveyData.usesCardApp,
          card_app_type: surveyData.cardAppType,
          has_eight: surveyData.hasEight,
          eight_card_count: surveyData.eightCardCount,
          is_eight_premium: surveyData.isEightPremium,
          registered_card_count: surveyData.registeredCardCount,
          current_company: surveyData.currentCompany,
          current_position: surveyData.currentPosition,
          past_companies: surveyData.pastCompanies,
          phone_number: surveyData.phoneNumber,
          survey_completed: true,
          survey_completed_at: new Date().toISOString(),
          user_status: 'survey_completed',
          survey_data: surveyData,
          status: 'survey_completed',
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      if (error instanceof Error) {
        const errorMsg = `アンケートデータの保存に失敗しました: ${error.message}`;
        throw new Error(errorMsg);
      } else {
        const errorMsg = '予期しないエラーが発生しました';
        throw new Error(errorMsg);
      }
    }
  };

  // 基本項目の定義
  const basicFields = new Set([
    '会社名', '部署名', '役職', '姓', '名', 'e-mail', 'email', 'メール',
    '郵便番号', '住所', 'TEL会社', 'TEL部門', 'TEL直通', 'Fax', 'FAX',
    '携帯電話', '携帯', 'URL', 'ホームページ', '名刺交換日', '交換日'
  ]);

  // カラム名マッピング（business_cards_sharedテーブル構造に合わせて修正）
  const headerMapping: { [key: string]: string } = {
    '会社名': 'company',
    '部署名': 'department',
    '役職': 'position',
    '姓': 'last_name',
    '名': 'first_name',
    'e-mail': 'email',
    'email': 'email',
    'メール': 'email',
    '郵便番号': 'postal_code',
    '住所': 'address',
    'TEL会社': 'company_phone',
    'TEL部門': 'department_phone',
    'TEL直通': 'direct_phone',
    'Fax': 'fax',
    'FAX': 'fax',
    '携帯電話': 'mobile',
    '携帯': 'mobile',
    'URL': 'url',
    '名刺交換日': 'exchange_date',
    '交換日': 'exchange_date'
  };

  // 重複判定関数（全ユーザー対象）
  const findGlobalDuplicates = async (newRecords: any[]): Promise<Map<string, any>> => {
    console.log('=== GLOBAL DUPLICATE CHECK START ===');
    
    try {
      const duplicateMap = new Map<string, any>();

      // 全ての既存データを取得（全ユーザー対象）
      const { data: existingCards, error } = await supabase
        .from('business_cards_shared')
        .select('id, email, name, company, exchange_date, created_at, shared_by_user_id')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching existing cards:', error);
        throw error;
      }

      console.log('Existing cards count:', existingCards?.length || 0);

      // 既存データをマップに変換（高速検索用）
      const existingByEmail = new Map<string, any>();
      const existingByNameCompany = new Map<string, any>();

      existingCards?.forEach(card => {
        // メールアドレスでのマッピング
        if (card.email && card.email.trim()) {
          const emailKey = card.email.toLowerCase().trim();
          existingByEmail.set(emailKey, card);
        }
        
        // 氏名+会社名でのマッピング
        if (card.name && card.company) {
          const nameCompanyKey = `${card.name.trim()}_${card.company.trim()}`.toLowerCase();
          existingByNameCompany.set(nameCompanyKey, card);
        }
      });

      console.log('Email index size:', existingByEmail.size);
      console.log('Name+Company index size:', existingByNameCompany.size);

      // 新しいレコードの重複チェック
      newRecords.forEach((newRecord, index) => {
        let duplicate = null;
        let matchType = '';

        // 1. メールアドレスでの重複チェック（優先）
        if (newRecord.email && newRecord.email.trim()) {
          const emailKey = newRecord.email.toLowerCase().trim();
          duplicate = existingByEmail.get(emailKey);
          if (duplicate) {
            matchType = 'email';
            console.log(`Duplicate found by email for record ${index}:`, {
              newEmail: newRecord.email,
              existingId: duplicate.id,
              existingSharedBy: duplicate.shared_by_user_id
            });
          }
        }

        // 2. 氏名+会社名での重複チェック（フォールバック）
        if (!duplicate && newRecord.name && newRecord.company) {
          const nameCompanyKey = `${newRecord.name.trim()}_${newRecord.company.trim()}`.toLowerCase();
          duplicate = existingByNameCompany.get(nameCompanyKey);
          if (duplicate) {
            matchType = 'name_company';
            console.log(`Duplicate found by name+company for record ${index}:`, {
              newName: newRecord.name,
              newCompany: newRecord.company,
              existingId: duplicate.id,
              existingSharedBy: duplicate.shared_by_user_id
            });
          }
        }

        if (duplicate) {
          duplicateMap.set(`record_${index}`, {
            existingRecord: duplicate,
            newRecord: newRecord,
            matchType: matchType,
            index: index
          });
        }
      });

      console.log('Duplicates found:', duplicateMap.size);
      console.log('=== GLOBAL DUPLICATE CHECK END ===');
      
      return duplicateMap;
    } catch (error) {
      console.error('Error in findGlobalDuplicates:', error);
      return new Map();
    }
  };

  // 更新判定関数（名刺交換日ベース）
  const shouldUpdateRecord = (existingRecord: any, newRecord: any): boolean => {
    // 名刺交換日での比較
    if (newRecord.exchange_date && existingRecord.exchange_date) {
      try {
        const newDate = new Date(newRecord.exchange_date);
        const existingDate = new Date(existingRecord.exchange_date);
        
        // 新しい名刺交換日の方が新しい場合は更新
        if (newDate > existingDate) {
          return true;
        }
        
        // 同じ日付の場合は更新しない（重複スキップ）
        if (newDate.getTime() === existingDate.getTime()) {
          return false;
        }
      } catch (e) {
        console.warn('Date comparison error:', e);
      }
    }

    // 名刺交換日がない場合は、作成日時で比較
    if (!newRecord.exchange_date && existingRecord.created_at) {
      // 既存レコードがある場合は更新しない（重複スキップ）
      return false;
    }

    // 既存レコードに名刺交換日がなく、新しいレコードにある場合は更新
    if (newRecord.exchange_date && !existingRecord.exchange_date) {
      return true;
    }

    // デフォルトは更新しない
    return false;
  };

  // 共有テーブル専用の保存関数（トランザクション管理を削除）
  const saveToSharedTables = async (records: any[], supporterId: string, userId: string): Promise<DuplicateInfo> => {
    console.log('=== SHARED TABLES SAVE START ===');
    console.log('Input parameters:', { 
      recordCount: records.length, 
      supporterId, 
      userId,
      firstRecord: records[0] ? {
        name: records[0].name,
        company: records[0].company,
        email: records[0].email
      } : null
    });

    try {
      if (!records || records.length === 0) {
        console.log('No records to save to shared tables');
        return {
          totalProcessed: 0,
          newRecords: 0,
          updatedRecords: 0,
          duplicatesSkipped: 0,
          duplicateDetails: []
        };
      }

      // 重複判定を実行（全ユーザー対象）
      const duplicateMap = await findGlobalDuplicates(records);

      // 重複情報を初期化
      const duplicateInfo: DuplicateInfo = {
        totalProcessed: records.length,
        newRecords: 0,
        updatedRecords: 0,
        duplicatesSkipped: 0,
        duplicateDetails: []
      };

      // 処理するレコードを分類
      const recordsToInsert: any[] = [];
      const recordsToUpdate: any[] = [];

      records.forEach((record, index) => {
        const duplicateKey = `record_${index}`;
        const duplicateInfo_item = duplicateMap.get(duplicateKey);

        if (duplicateInfo_item) {
          const { existingRecord, matchType } = duplicateInfo_item;
          
          if (shouldUpdateRecord(existingRecord, record)) {
            // 更新対象
            record.shared_card_id = existingRecord.id; // 更新用にIDを設定
            recordsToUpdate.push(record);
            duplicateInfo.updatedRecords++;
            duplicateInfo.duplicateDetails.push({
              name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
              company: record.company || '',
              email: record.email || '',
              reason: `${matchType === 'email' ? 'メールアドレス' : '氏名+会社名'}が一致、名刺交換日が新しいため更新`,
              action: 'updated'
            });
          } else {
            // 重複スキップ
            duplicateInfo.duplicatesSkipped++;
            duplicateInfo.duplicateDetails.push({
              name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
              company: record.company || '',
              email: record.email || '',
              reason: `${matchType === 'email' ? 'メールアドレス' : '氏名+会社名'}が一致、既存データが新しいためスキップ`,
              action: 'skipped'
            });
          }
        } else {
          // 新規追加
          recordsToInsert.push(record);
          duplicateInfo.newRecords++;
          duplicateInfo.duplicateDetails.push({
            name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
            company: record.company || '',
            email: record.email || '',
            reason: '新規レコード',
            action: 'new'
          });
        }
      });

      console.log('Record classification:', {
        toInsert: recordsToInsert.length,
        toUpdate: recordsToUpdate.length,
        toSkip: duplicateInfo.duplicatesSkipped
      });

      // 新規レコードを挿入
      if (recordsToInsert.length > 0) {
        console.log('Step 1: Inserting new records to business_cards_shared');
        
        const sharedRecords = recordsToInsert.map((record) => {
          const sharedRecord = {
            contributor_id: supporterId,
            shared_by_user_id: userId,
            name: record.name || null,
            company: record.company || null,
            department: record.department || null,
            position: record.position || null,
            phone: record.phone || null,
            email: record.email || null,
            address: record.address || null,
            last_name: record.last_name || null,
            first_name: record.first_name || null,
            postal_code: record.postal_code || null,
            company_phone: record.company_phone || null,
            department_phone: record.department_phone || null,
            direct_phone: record.direct_phone || null,
            fax: record.fax || null,
            mobile: record.mobile || null,
            url: record.url || null,
            exchange_date: record.exchange_date || null,
            registration_date: record.registration_date || null,
            update_date: record.update_date || null,
            raw_data: record.raw_data || {},
            is_active: true
          };
          
          return sharedRecord;
        });

        // バッチサイズで分割して保存
        const batchSize = 50;
        const savedSharedCards: any[] = [];
        
        for (let i = 0; i < sharedRecords.length; i += batchSize) {
          const batch = sharedRecords.slice(i, i + batchSize);
          console.log(`Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sharedRecords.length / batchSize)}:`, batch.length, 'records');
          
          const { data: insertedSharedCards, error: sharedError } = await supabase
            .from('business_cards_shared')
            .insert(batch)
            .select('id');

          if (sharedError) {
            console.error('ERROR in business_cards_shared insert:', sharedError);
            throw new Error(`共有テーブルへの保存に失敗しました: ${sharedError.message}`);
          }

          if (insertedSharedCards) {
            console.log(`Batch ${Math.floor(i / batchSize) + 1} inserted successfully:`, insertedSharedCards.length, 'records');
            savedSharedCards.push(...insertedSharedCards);
          }
        }

        // business_card_contributorsテーブルに提供者情報を保存
        if (savedSharedCards.length > 0) {
          console.log('Step 2: Inserting contributor records');
          
          const contributorRecords = savedSharedCards.map((sharedCard, index) => ({
            shared_card_id: sharedCard.id,
            contributor_user_id: userId,
            contributor_supporter_id: supporterId,
            contribution_type: 'original',
            contribution_data: {
              source: 'csv_upload',
              upload_date: new Date().toISOString(),
              record_index: index
            }
          }));

          // バッチサイズで分割して保存
          for (let i = 0; i < contributorRecords.length; i += batchSize) {
            const batch = contributorRecords.slice(i, i + batchSize);
            
            const { error: contributorError } = await supabase
              .from('business_card_contributors')
              .insert(batch);

            if (contributorError) {
              console.error('ERROR in business_card_contributors insert:', contributorError);
              // 提供者情報の保存に失敗してもメインの処理は継続
              console.warn('Contributor data save failed, but continuing');
            }
          }
        }
      }

      // 既存レコードを更新
      if (recordsToUpdate.length > 0) {
        console.log('Step 3: Updating existing records');
        
        for (const record of recordsToUpdate) {
          const { shared_card_id, ...updateData } = record;
          
          const { error: updateError } = await supabase
            .from('business_cards_shared')
            .update({
              name: updateData.name || null,
              company: updateData.company || null,
              department: updateData.department || null,
              position: updateData.position || null,
              phone: updateData.phone || null,
              email: updateData.email || null,
              address: updateData.address || null,
              last_name: updateData.last_name || null,
              first_name: updateData.first_name || null,
              postal_code: updateData.postal_code || null,
              company_phone: updateData.company_phone || null,
              department_phone: updateData.department_phone || null,
              direct_phone: updateData.direct_phone || null,
              fax: updateData.fax || null,
              mobile: updateData.mobile || null,
              url: updateData.url || null,
              exchange_date: updateData.exchange_date || null,
              registration_date: updateData.registration_date || null,
              update_date: updateData.update_date || null,
              raw_data: updateData.raw_data || {},
              updated_at: new Date().toISOString()
            })
            .eq('id', shared_card_id);

          if (updateError) {
            console.warn(`Record update warning for ID ${shared_card_id}:`, updateError);
          }
        }
      }

      console.log('=== SHARED TABLES SAVE SUCCESS ===');
      console.log('Final results:', {
        newRecords: duplicateInfo.newRecords,
        updatedRecords: duplicateInfo.updatedRecords,
        duplicatesSkipped: duplicateInfo.duplicatesSkipped
      });

      return duplicateInfo;

    } catch (error) {
      console.error('=== SHARED TABLES SAVE FAILED ===');
      console.error('Error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  };

  const normalizeBusinessCardData = (headers: string[], row: string[]): any => {
    const record: any = {
      name: '',
      company: '',
      department: '',
      position: '',
      phone: '',
      email: '',
      address: '',
      memo: '',
      registration_date: null,
      update_date: null,
      raw_data: {
        myTags: {}
      }
    };

    headers.forEach((header: string, index: number) => {
      const value = row[index] ? row[index].trim() : '';
      const mappedField = headerMapping[header];
      
      if (mappedField) {
        // 基本項目の場合
        record[mappedField] = value;
      } else if (!basicFields.has(header)) {
        // マイタグの場合（基本項目以外）
        record.raw_data.myTags[header] = value;
      }
      
      // 全ての項目をraw_dataにも保存
      if (!record.raw_data.allFields) {
        record.raw_data.allFields = {};
      }
      record.raw_data.allFields[header] = value;
    });

    if (record.last_name || record.first_name) {
      record.name = `${record.last_name || ''} ${record.first_name || ''}`.trim();
    }

    const phoneFields = [
      { field: 'company_phone', priority: 1 },
      { field: 'direct_phone', priority: 2 },
      { field: 'department_phone', priority: 3 },
      { field: 'mobile', priority: 4 }
    ];

    for (const phoneField of phoneFields) {
      if (record[phoneField.field] && record[phoneField.field].trim()) {
        record.phone = record[phoneField.field].trim();
        break;
      }
    }

    if (record.exchange_date) {
      try {
        const dateStr = record.exchange_date.trim();
        if (dateStr.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
          record.registration_date = dateStr.replace(/\//g, '-');
        }
      } catch (e) {
        console.warn('Date parsing error:', e);
      }
    }

    Object.keys(record).forEach(key => {
      if (typeof record[key] === 'string' && record[key].trim() === '') {
        record[key] = null;
      }
    });

    return record;
  };

  const saveCSVData = async (file: File, csvContent: string): Promise<{ recordCount: number; myTagsCount: number; myTags: string[]; duplicateInfo: DuplicateInfo }> => {
    console.log('=== CSV SAVE START ===');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ユーザーが見つかりません');

      const supporterId = await ensureSupporterRecord(user);
      console.log('User and supporter info:', { userId: user.id, supporterId });

      const filename = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('csv-uploads')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw new Error(`ファイルアップロードに失敗しました: ${uploadError.message}`);
      }

      const parseResult = await new Promise<any>((resolve, reject) => {
        Papa.parse(csvContent, {
          header: false,
          skipEmptyLines: true,
          encoding: 'UTF-8',
          complete: resolve,
          error: reject
        });
      });

      const data = parseResult.data as string[][];
      if (data.length <= 1) {
        throw new Error('CSVファイルにデータが含まれていません');
      }

      const headers = data[0].map((h: string) => h.trim());
      const rows = data.slice(1).filter((row: string[]) => row.some(cell => cell && cell.trim()));

      // マイタグを抽出
      const myTagHeaders = headers.filter(header => !basicFields.has(header));
      const allMyTags = new Set<string>();

      const records = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        if (row.length >= headers.length && row.some(cell => cell && cell.trim())) {
          const normalizedRecord = normalizeBusinessCardData(headers, row);
          normalizedRecord.supporter_id = supporterId;
          
          // このレコードのマイタグを収集
          Object.keys(normalizedRecord.raw_data.myTags).forEach(tag => {
            if (normalizedRecord.raw_data.myTags[tag]) {
              allMyTags.add(tag);
            }
          });
          
          records.push(normalizedRecord);
        }
      }

      if (records.length === 0) {
        throw new Error('有効なデータが見つかりませんでした');
      }

      console.log('Parsed records:', records.length);

      // 重複判定を実行
      const duplicateMap = await findDuplicates(supporterId, records);

      // 重複情報を初期化
      const duplicateInfo: DuplicateInfo = {
        totalProcessed: records.length,
        newRecords: 0,
        updatedRecords: 0,
        duplicatesSkipped: 0,
        duplicateDetails: []
      };

      // 処理するレコードを分類
      const recordsToInsert: any[] = [];
      const recordsToUpdate: any[] = [];

      records.forEach((record, index) => {
        const duplicateKey = `record_${index}`;
        const duplicateInfo_item = duplicateMap.get(duplicateKey);

        if (duplicateInfo_item) {
          const { existingRecord, matchType } = duplicateInfo_item;
          
          if (shouldUpdateRecord(existingRecord, record)) {
            // 更新対象
            record.id = existingRecord.id; // 更新用にIDを設定
            recordsToUpdate.push(record);
            duplicateInfo.updatedRecords++;
            duplicateInfo.duplicateDetails.push({
              name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
              company: record.company || '',
              email: record.email || '',
              reason: `${matchType === 'email' ? 'メールアドレス' : '氏名+会社名'}が一致、名刺交換日が新しいため更新`,
              action: 'updated'
            });
          } else {
            // 重複スキップ
            duplicateInfo.duplicatesSkipped++;
            duplicateInfo.duplicateDetails.push({
              name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
              company: record.company || '',
              email: record.email || '',
              reason: `${matchType === 'email' ? 'メールアドレス' : '氏名+会社名'}が一致、既存データが新しいためスキップ`,
              action: 'skipped'
            });
          }
        } else {
          // 新規追加
          recordsToInsert.push(record);
          duplicateInfo.newRecords++;
          duplicateInfo.duplicateDetails.push({
            name: record.name || `${record.last_name || ''} ${record.first_name || ''}`.trim(),
            company: record.company || '',
            email: record.email || '',
            reason: '新規レコード',
            action: 'new'
          });
        }
      });

      console.log('Record classification:', {
        toInsert: recordsToInsert.length,
        toUpdate: recordsToUpdate.length,
        toSkip: duplicateInfo.duplicatesSkipped
      });

      // 既存データを削除（新規追加のみの場合）
      if (recordsToUpdate.length === 0 && duplicateInfo.duplicatesSkipped === 0) {
        const { error: deleteError } = await supabase
          .from('business_cards')
          .delete()
          .eq('supporter_id', supporterId);

        if (deleteError) {
          console.warn('Previous data deletion warning:', deleteError);
        }
      }

      // 新規レコードを挿入
      if (recordsToInsert.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < recordsToInsert.length; i += batchSize) {
          const batch = recordsToInsert.slice(i, i + batchSize);
          
          const { error: insertError } = await supabase
            .from('business_cards')
            .insert(batch);

          if (insertError) {
            console.error('Insert error:', insertError);
            throw new Error(`新規データ保存に失敗しました: ${insertError.message}`);
          }
        }
      }

      // 既存レコードを更新
      if (recordsToUpdate.length > 0) {
        for (const record of recordsToUpdate) {
          const { id, ...updateData } = record;
          const { error: updateError } = await supabase
            .from('business_cards')
            .update(updateData)
            .eq('id', id);

          if (updateError) {
            console.warn(`Record update warning for ID ${id}:`, updateError);
          }
        }
      }

      // 共有テーブルへの保存（新規追加と更新されたレコードのみ）
      const recordsToShare = [...recordsToInsert, ...recordsToUpdate];
      console.log('Records to share:', recordsToShare.length);
      
      let sharedDuplicateInfo: DuplicateInfo = duplicateInfo;
      
      if (recordsToShare.length > 0) {
        try {
          sharedDuplicateInfo = await saveToSharedTables(recordsToShare, supporterId, user.id);
          console.log('Successfully saved to shared tables');
        } catch (sharedError) {
          console.error('Shared tables save failed:', sharedError);
          // 共有テーブルの保存失敗はエラーとして扱う
          throw new Error(`共有データベースへの保存に失敗しました: ${sharedError instanceof Error ? sharedError.message : '不明なエラー'}`);
        }
      }

      // サポーター情報を更新（累計件数を更新）
      const totalSavedRecords = sharedDuplicateInfo.newRecords + sharedDuplicateInfo.updatedRecords;
      
      // 現在の累計件数を取得
      const currentSharedCount = await getSharedCardsCount();
      const newTotalCount = currentSharedCount + totalSavedRecords;
      
      const { error: updateError } = await supabase
        .from('supporters')
        .update({
          csv_filename: file.name,
          csv_upload_date: new Date().toISOString(),
          csv_record_count: newTotalCount, // 累計件数を更新
          csv_uploaded: true,
          user_status: 'csv_uploaded',
          status: 'csv_uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('id', supporterId);

      if (updateError) {
        throw new Error(`サポーター情報の更新に失敗しました: ${updateError.message}`);
      }
      
      const myTagsArray = Array.from(allMyTags).sort();
      
      console.log('=== CSV SAVE SUCCESS ===');
      
      return { 
        recordCount: totalSavedRecords,
        myTagsCount: myTagsArray.length,
        myTags: myTagsArray,
        duplicateInfo: sharedDuplicateInfo
      };

    } catch (error) {
      console.error('=== CSV SAVE FAILED ===');
      console.error('Error details:', error);
      
      // エラーメッセージを統一
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('CSVデータの保存中に予期しないエラーが発生しました');
      }
    }
  };

  // 重複判定関数
  const findDuplicates = async (supporterId: string, newRecords: any[]): Promise<Map<string, any>> => {
    try {
      // 既存の名刺データを取得
      const { data: existingCards, error } = await supabase
        .from('business_cards')
        .select('id, email, name, company, exchange_date, created_at')
        .eq('supporter_id', supporterId);

      if (error) throw error;

      const duplicateMap = new Map<string, any>();

      // 既存データをマップに変換（高速検索用）
      const existingByEmail = new Map<string, any>();
      const existingByNameCompany = new Map<string, any>();

      existingCards?.forEach(card => {
        if (card.email && card.email.trim()) {
          existingByEmail.set(card.email.toLowerCase().trim(), card);
        }
        
        if (card.name && card.company) {
          const key = `${card.name.trim()}_${card.company.trim()}`.toLowerCase();
          existingByNameCompany.set(key, card);
        }
      });

      // 新しいレコードの重複チェック
      newRecords.forEach((newRecord, index) => {
        let duplicate = null;
        let matchType = '';

        // 1. メールアドレスでの重複チェック（優先）
        if (newRecord.email && newRecord.email.trim()) {
          const emailKey = newRecord.email.toLowerCase().trim();
          duplicate = existingByEmail.get(emailKey);
          if (duplicate) {
            matchType = 'email';
          }
        }

        // 2. 氏名+会社名での重複チェック（フォールバック）
        if (!duplicate && newRecord.name && newRecord.company) {
          const nameCompanyKey = `${newRecord.name.trim()}_${newRecord.company.trim()}`.toLowerCase();
          duplicate = existingByNameCompany.get(nameCompanyKey);
          if (duplicate) {
            matchType = 'name_company';
          }
        }

        if (duplicate) {
          duplicateMap.set(`record_${index}`, {
            existingRecord: duplicate,
            newRecord: newRecord,
            matchType: matchType,
            index: index
          });
        }
      });

      return duplicateMap;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return new Map();
    }
  };

  const value = {
    registerEmail,
    verifyCode,
    setUserPassword,
    updateBasicInfo,
    saveComprehensiveSurveyData,
    saveCSVData,
    signIn,
    loginEmail,
    signOut,
    resetPassword,
    getUserStatus,
    getRedirectPath,
    getUserData,
    getSharedCardsCount,
    saveExcludedCompanies,
    getUserMyTags,
    getAllUserMyTags,
    isAuthenticated,
    isLoading,
    error,
    otpEmail,
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};