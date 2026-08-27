import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Read env variables (supporting Vite and Next.js public conventions)
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || '';
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Allow local overrides if user enters them in the UI config drawer
const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
const storedKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_anon_key') : null;

export const supabaseUrl = storedUrl || envSupabaseUrl;
export const supabaseAnonKey = storedKey || envSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

export const supabase = supabaseInstance;

export function updateSupabaseConfig(url: string, key: string) {
  if (typeof window !== 'undefined') {
    if (url && key) {
      localStorage.setItem('custom_supabase_url', url);
      localStorage.setItem('custom_supabase_anon_key', key);
    } else {
      localStorage.removeItem('custom_supabase_url');
      localStorage.removeItem('custom_supabase_anon_key');
    }
    window.location.reload();
  }
}

export type { User, Session };
