import { supabaseAuthOptions } from '../supabase';

if (supabaseAuthOptions.flowType !== 'pkce') {
  throw new Error('Supabase must use the PKCE flow so the callback receives a code');
}
