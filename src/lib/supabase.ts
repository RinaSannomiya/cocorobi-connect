import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with additional options for security and reliability
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'kokorovi',
    },
  },
  db: {
    schema: 'public'
  },
  realtime: {
    timeout: 20000,
    params: {
      eventsPerSecond: 10
    }
  }
});

// Add error handling for connection issues
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    console.log('User signed out');
  } else if (event === 'SIGNED_IN') {
    console.log('User signed in');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
  }
});

// Test the connection without requiring the supporters table
const testConnection = async () => {
  try {
    const { data, error } = await supabase.rpc('version');
    if (error) throw error;
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection error:', error.message);
    // Silent fail - don't block the app from loading
  }
};

testConnection();

export const isTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();

    if (error) throw error;
    return !!data;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error);
    return false;
  }
};