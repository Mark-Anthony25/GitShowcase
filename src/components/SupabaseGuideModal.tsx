import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X, Database, Key, ShieldCheck, Github, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured, updateSupabaseConfig, supabaseUrl, supabaseAnonKey, supabase } from '../lib/supabase';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState(supabaseUrl || '');
  const [inputKey, setInputKey] = useState(supabaseAnonKey || '');
  const [activeTab, setActiveTab] = useState<'quick' | 'sql' | 'oauth'>('quick');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://git-showcase-black.vercel.app';
  const vercelOrigin = 'https://git-showcase-black.vercel.app';
  const devOrigin = 'https://ais-dev-6hghiy2ibtd4dkiwerjb4k-158947777253.asia-east1.run.app';
  const preOrigin = 'https://ais-pre-6hghiy2ibtd4dkiwerjb4k-158947777253.asia-east1.run.app';

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setTestStatus({ testing: true });
    try {
      if (!isSupabaseConfigured || !supabase) {
        setTestStatus({ testing: false, success: false, message: 'Please save valid Supabase URL and Anon Key first.' });
        return;
      }
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('schema cache')) {
          setTestStatus({
            testing: false,
            success: true,
            message: 'Connected to Supabase! Note: Please run the SQL schema in Tab 2 to create the tables.'
          });
        } else {
          setTestStatus({ testing: false, success: false, message: `Connected with notice: ${error.message}` });
        }
      } else {
        setTestStatus({ testing: false, success: true, message: 'Supabase connection & tables verified successfully!' });
      }
    } catch (err: any) {
      setTestStatus({ testing: false, success: false, message: err?.message || 'Failed to connect to Supabase.' });
    }
  };

  const sqlSchemaCode = `-- ==============================================================================
-- Student GitHub Project Showcase: Initial Schema & RLS Policies
-- ==============================================================================

-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text unique not null,
  full_name text,
  headline text,
  avatar_url text,
  bio text,
  program text,
  year_level text,
  is_onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Schema migration helpers for existing installations
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists is_onboarded boolean default false;
alter table public.profiles add column if not exists program text;
alter table public.profiles add column if not exists year_level text;

-- 2. Create Showcased Projects Table
create table if not exists public.showcased_projects (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  repo_full_name text not null,
  repo_url text not null,
  custom_title text,
  custom_description text,
  is_featured boolean default false,
  display_order int default 0,
  added_at timestamptz default now()
);

-- 3. Create Repo Stats Cache Table
create table if not exists public.repo_stats_cache (
  repo_full_name text primary key,
  stars int default 0,
  forks int default 0,
  language text,
  topics text[] default '{}',
  last_commit_at timestamptz,
  fetched_at timestamptz default now()
);

-- 4. High-Performance Database Indexes
delete from public.showcased_projects where ctid not in (select min(ctid) from public.showcased_projects group by profile_id, lower(repo_full_name));
create index if not exists idx_showcased_projects_profile_id on public.showcased_projects(profile_id);
create unique index if not exists idx_showcased_projects_profile_repo_unique on public.showcased_projects(profile_id, lower(repo_full_name));
create index if not exists idx_showcased_projects_display_order on public.showcased_projects(display_order asc, added_at desc);
create index if not exists idx_profiles_program on public.profiles(program);
create index if not exists idx_profiles_created_at on public.profiles(created_at desc);
create index if not exists idx_profiles_username_lower on public.profiles(lower(github_username));

-- 5. Enable and Force Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.showcased_projects enable row level security;
alter table public.repo_stats_cache enable row level security;

-- 6. Production RLS Policies (Discrete & Secure)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Showcased projects are viewable by everyone" on public.showcased_projects;
create policy "Showcased projects are viewable by everyone" on public.showcased_projects for select using (true);

drop policy if exists "Users can insert their own showcased projects" on public.showcased_projects;
create policy "Users can insert their own showcased projects" on public.showcased_projects for insert with check ((select auth.uid()) = profile_id);

drop policy if exists "Users can update their own showcased projects" on public.showcased_projects;
create policy "Users can update their own showcased projects" on public.showcased_projects for update using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

drop policy if exists "Users can delete their own showcased projects" on public.showcased_projects;
create policy "Users can delete their own showcased projects" on public.showcased_projects for delete using ((select auth.uid()) = profile_id);

drop policy if exists "Repo stats cache is viewable by everyone" on public.repo_stats_cache;
create policy "Repo stats cache is viewable by everyone" on public.repo_stats_cache for select using (true);

drop policy if exists "Authenticated users can update repo cache" on public.repo_stats_cache;
create policy "Authenticated users can update repo cache" on public.repo_stats_cache for all using ((select auth.role()) = 'authenticated');

-- 7. Trigger to auto-create Profile on first sign-in
create or replace function public.handle_new_user()
returns trigger as $$
declare
  github_handle text;
begin
  github_handle := coalesce(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    new.raw_user_meta_data->>'name',
    split_part(coalesce(new.email, 'student'), '@', 1)
  );

  insert into public.profiles (id, github_username, full_name, avatar_url, bio, headline, program, year_level, is_onboarded)
  values (
    new.id,
    github_handle,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', github_handle),
    new.raw_user_meta_data->>'avatar_url',
    null,
    'Student Developer',
    'BS Computer Science',
    '1st Year',
    false
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(profiles.full_name, excluded.full_name),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(inputUrl.trim(), inputKey.trim());
    setSaveSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FEFCF6] paper-card max-w-2xl w-full max-h-[90dvh] flex flex-col overflow-hidden shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] text-[#212121]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-dashed border-[#212121] flex items-center justify-between bg-[#FAF6EC]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 paper-card bg-white text-black flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
                Supabase &amp; GitHub OAuth Setup
              </h2>
              <p className="text-xs font-serif-body text-stone-700">
                Live configuration and connection guide for GitShowcase
              </p>
            </div>
          </div>
          <button
            id="close-guide-btn"
            aria-label="Close dialog"
            onClick={onClose}
            className="paper-button-icon min-w-[32px] min-h-[32px] p-1 text-stone-800 flex items-center justify-center cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-dashed border-[#212121] px-3 sm:px-4 py-1.5 bg-stone-100 gap-1.5">
          <button
            onClick={() => setActiveTab('quick')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-2.5 min-h-[32px] ${
              activeTab === 'quick' ? 'paper-button-dark' : ''
            }`}
          >
            1. Connect Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-2.5 min-h-[32px] ${
              activeTab === 'sql' ? 'paper-button-dark' : ''
            }`}
          >
            2. SQL Schema &amp; RLS
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-2.5 min-h-[32px] ${
              activeTab === 'oauth' ? 'paper-button-dark' : ''
            }`}
          >
            3. GitHub OAuth Setup
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-[#212121]">
          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className={`paper-card p-3 ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 border-emerald-600'
                  : 'bg-amber-50 border-amber-600'
              }`}>
                <div className="flex items-start space-x-2.5">
                  <ShieldCheck className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isSupabaseConfigured ? 'text-emerald-700' : 'text-amber-800'}`} />
                  <div>
                    <h4 className="font-headline font-bold uppercase text-xs sm:text-sm text-[#212121]">
                      {isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Not Configured (Using Offline Sandbox)'}
                    </h4>
                    <p className="text-xs mt-0.5 font-serif-body leading-relaxed text-stone-800">
                      {isSupabaseConfigured
                        ? 'Your Supabase client is active. Students can log in with GitHub, save showcased projects, and persist public profiles in Postgres.'
                        : 'You can explore all dashboard and showcase features right now in Sandbox mode! To connect your real live Supabase Postgres database, enter your credentials below or configure environment variables in .env.'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-3">
                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                    Supabase Project URL
                  </label>
                  <input
                    id="supabase-url-input"
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs min-h-[34px]"
                  />
                  <p className="text-[10px] font-mono text-stone-600 mt-0.5">Found in Supabase Dashboard &gt; Project Settings &gt; API</p>
                </div>

                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    id="supabase-key-input"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-[#212121] font-mono text-xs min-h-[34px]"
                  />
                  <p className="text-[10px] font-mono text-stone-600 mt-0.5">Project API key with `anon` `public` role.</p>
                </div>

                <div className="flex items-center justify-between pt-1.5 gap-2 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInputUrl('');
                        setInputKey('');
                        updateSupabaseConfig('', '');
                      }}
                      className="text-xs font-headline uppercase text-rose-700 hover:underline cursor-pointer min-h-[30px] py-0.5"
                    >
                      Reset to Sandbox
                    </button>
                    {isSupabaseConfigured && (
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testStatus?.testing}
                        className="paper-button text-xs py-1 px-2.5 min-h-[30px] font-bold flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${testStatus?.testing ? 'animate-spin' : ''}`} />
                        <span>Test DB Connection</span>
                      </button>
                    )}
                  </div>

                  <button
                    id="save-credentials-btn"
                    type="submit"
                    className="paper-button paper-button-dark px-3.5 py-1.5 text-xs uppercase tracking-wider font-bold min-h-[34px]"
                  >
                    Save &amp; Reload Client
                  </button>
                </div>

                {testStatus && (
                  <div className={`p-2 rounded-xs border text-xs font-mono mt-2 ${
                    testStatus.success ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-amber-50 border-amber-500 text-amber-900'
                  }`}>
                    {testStatus.message}
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-newspaper-title font-[900] uppercase text-[#212121]">
                    Database Schema &amp; Row Level Security
                  </h3>
                  <p className="text-xs font-serif-body text-stone-700">
                    Run this in your Supabase SQL Editor to create tables, RLS policies, and the OAuth trigger.
                  </p>
                </div>
                <button
                  id="copy-sql-btn"
                  onClick={() => copyToClipboard(sqlSchemaCode, 'sql')}
                  className="paper-button flex items-center space-x-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wider min-h-[32px] flex-shrink-0"
                >
                  {copiedKey === 'sql' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative paper-card bg-[#1E1E1E] p-3 max-h-64 overflow-y-auto">
                <pre className="text-xs font-mono font-bold text-emerald-400 whitespace-pre leading-relaxed">
                  {sqlSchemaCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'oauth' && (
            <div className="space-y-3 text-xs font-serif-body">
              <h3 className="font-newspaper-title font-[900] uppercase text-[#212121] flex items-center space-x-1.5 text-xs sm:text-sm">
                <Github className="w-3.5 h-3.5" />
                <span>GitHub OAuth Provider Configuration</span>
              </h3>

              <ol className="list-decimal list-inside space-y-3 text-xs leading-relaxed text-stone-800">
                <li>
                  Go to <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="text-blue-800 underline font-bold inline-flex items-center">GitHub Developer Settings &gt; OAuth Apps <ExternalLink className="w-3 h-3 ml-1" /></a> and click <strong>New OAuth App</strong>.
                </li>

                <li>
                  Set <strong>Homepage URL</strong> to your Vercel or Dev URL:
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold uppercase px-1 py-0.2 bg-stone-200">Vercel</span>
                        <code className="font-mono text-black text-[11px] truncate select-all font-bold">
                          {vercelOrigin}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(vercelOrigin, 'vercel_home')}
                        className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                      >
                        {copiedKey === 'vercel_home' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold uppercase px-1 py-0.2 bg-stone-200">AI Studio</span>
                        <code className="font-mono text-black text-[11px] truncate select-all font-bold">
                          {devOrigin}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(devOrigin, 'dev_home')}
                        className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                      >
                        {copiedKey === 'dev_home' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </li>

                <li>
                  Set <strong>Authorization callback URL</strong> to your Supabase Auth callback URL:
                  <div className="mt-1 flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                    <code className="font-mono text-black break-all text-[11px] select-all font-bold">
                      {supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : 'https://<your-project-ref>.supabase.co/auth/v1/callback'}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : 'https://<your-project-ref>.supabase.co/auth/v1/callback', 'callback')}
                      className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                    >
                      {copiedKey === 'callback' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>

                <li>
                  In your GitHub OAuth App, copy your <strong>Client ID</strong> and click <strong>"Generate a new client secret"</strong>. Copy the secret.
                </li>

                <li>
                  In your <strong>Supabase Dashboard &gt; Authentication &gt; Providers &gt; GitHub</strong>:
                  <ul className="list-disc list-inside ml-3 mt-1 space-y-1 text-stone-700">
                    <li>Toggle <strong>Enable GitHub</strong>: ON</li>
                    <li>Paste your <strong>Client ID</strong></li>
                    <li>Paste your <strong>Client Secret</strong></li>
                    <li>Click <strong>Save</strong></li>
                  </ul>
                </li>

                <li>
                  In <strong>Supabase Dashboard &gt; Authentication &gt; URL Configuration</strong>, add all deployment URLs to <strong>Redirect URLs</strong>:
                  <div className="mt-1 space-y-1.5">
                    <div className="flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold uppercase px-1 py-0.2 bg-stone-200">Vercel</span>
                        <code className="font-mono text-black text-[11px] truncate select-all font-bold">
                          {`${vercelOrigin}/**`}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${vercelOrigin}/**`, 'vercel_redirect')}
                        className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                      >
                        {copiedKey === 'vercel_redirect' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold uppercase px-1 py-0.2 bg-stone-200">AI Dev</span>
                        <code className="font-mono text-black text-[11px] truncate select-all font-bold">
                          {`${devOrigin}/**`}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${devOrigin}/**`, 'dev_redirect')}
                        className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                      >
                        {copiedKey === 'dev_redirect' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-1.5 bg-white paper-card border border-stone-400 gap-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[10px] font-bold uppercase px-1 py-0.2 bg-stone-200">AI Share</span>
                        <code className="font-mono text-black text-[11px] truncate select-all font-bold">
                          {`${preOrigin}/**`}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`${preOrigin}/**`, 'pre_redirect')}
                        className="paper-button text-[10px] py-0.5 px-2 min-h-[26px] flex-shrink-0 font-bold"
                      >
                        {copiedKey === 'pre_redirect' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-dashed border-[#212121] bg-stone-100 flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-xs font-sketch font-bold uppercase text-stone-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Runs 100% on free-tier services ($0/mo)</span>
          </div>
          <button
            onClick={onClose}
            className="paper-button paper-button-dark px-3.5 py-1.5 text-xs uppercase font-bold min-h-[34px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
