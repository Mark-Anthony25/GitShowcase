import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(status: number, body?: Record<string, string>) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: {
      ...corsHeaders,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return response(204);
  }

  if (request.method !== 'POST') {
    return response(405, { error: 'Method not allowed.' });
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : null;
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!token) {
    return response(401, { error: 'Unauthorized.' });
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return response(500, { error: 'Account deletion is not configured.' });
  }

  const callerClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);

  if (callerError || !caller) {
    return response(401, { error: 'Unauthorized.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deletionError } = await adminClient.auth.admin.deleteUser(caller.id);

  if (deletionError) {
    return response(500, { error: 'Unable to delete account. Please try again.' });
  }

  return response(204);
});
