import React, { useState } from 'react';
import { Copy, Check, ExternalLink, X, Database, Key, ShieldCheck, Github, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, updateSupabaseConfig, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [inputUrl, setInputUrl] = useState(supabaseUrl || '');
  const [inputKey, setInputKey] = useState(supabaseAnonKey || '');
  const [activeTab, setActiveTab] = useState<'quick' | 'sql' | 'oauth'>('quick');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const sqlSchemaCode = `-- ==============================================================================
-- Student GitHub Project Showcase: Initial Schema & RLS Policies
-- ==============================================================================

-- 1. Create Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  program text,
  year_level text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.showcased_projects enable row level security;
alter table public.repo_stats_cache enable row level security;

-- 5. RLS Policies
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Showcased projects are viewable by everyone" on public.showcased_projects for select using (true);
create policy "Users can insert their own showcased projects" on public.showcased_projects for insert with check (auth.uid() = profile_id);
create policy "Users can update their own showcased projects" on public.showcased_projects for update using (auth.uid() = profile_id);
create policy "Users can delete their own showcased projects" on public.showcased_projects for delete using (auth.uid() = profile_id);

create policy "Repo stats cache is viewable by everyone" on public.repo_stats_cache for select using (true);
create policy "Authenticated users can update repo cache" on public.repo_stats_cache for all using (auth.role() = 'authenticated');

-- 6. Trigger to auto-create Profile on first sign-in
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

  insert into public.profiles (id, github_username, full_name, avatar_url)
  values (
    new.id,
    github_handle,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', github_handle),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(profiles.full_name, excluded.full_name);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(inputUrl.trim(), inputKey.trim());
    setSaveSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FEFCF6] paper-card max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-[8px_8px_0px_#000] text-[#212121]">
        {/* Header */}
        <div className="p-6 border-b-2 border-dashed border-[#212121] flex items-center justify-between bg-[#FAF6EC]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 paper-card bg-white text-black flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                Supabase &amp; GitHub OAuth Setup
              </h2>
              <p className="text-xs font-serif-body text-stone-700">
                Setup guide &amp; quick connection for your free Student Showcase database
              </p>
            </div>
          </div>
          <button
            id="close-guide-btn"
            onClick={onClose}
            className="paper-button p-2 text-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b-2 border-dashed border-[#212121] px-6 py-2 bg-stone-100 gap-2">
          <button
            onClick={() => setActiveTab('quick')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-3 ${
              activeTab === 'quick' ? 'paper-button-dark' : ''
            }`}
          >
            1. Connect Credentials
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-3 ${
              activeTab === 'sql' ? 'paper-button-dark' : ''
            }`}
          >
            2. SQL Schema &amp; RLS
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            className={`paper-button text-xs font-bold uppercase tracking-wider py-1.5 px-3 ${
              activeTab === 'oauth' ? 'paper-button-dark' : ''
            }`}
          >
            3. GitHub OAuth Setup
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-[#212121]">
          {activeTab === 'quick' && (
            <div className="space-y-6">
              <div className={`paper-card p-4 ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 border-emerald-600'
                  : 'bg-amber-50 border-amber-600'
              }`}>
                <div className="flex items-start space-x-3">
                  <ShieldCheck className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isSupabaseConfigured ? 'text-emerald-700' : 'text-amber-800'}`} />
                  <div>
                    <h4 className="font-headline font-bold uppercase text-sm text-[#212121]">
                      {isSupabaseConfigured ? 'Supabase Connected' : 'Supabase Not Configured Yet (Using Demo Showcase Sandbox)'}
                    </h4>
                    <p className="text-xs mt-1 font-serif-body leading-relaxed text-stone-800">
                      {isSupabaseConfigured
                        ? 'Your Supabase client is active. Students can log in with GitHub, save showcased projects, and persist public profiles in Postgres.'
                        : 'You can explore all dashboard and showcase features right now in Sandbox mode! To connect your real live Supabase Postgres database, enter your credentials below or configure environment variables in .env.'}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                    Supabase Project URL
                  </label>
                  <input
                    id="supabase-url-input"
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 paper-input text-[#212121] text-sm"
                  />
                  <p className="text-[11px] font-mono text-stone-600 mt-1">Found in Supabase Dashboard &gt; Project Settings &gt; API</p>
                </div>

                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                    Supabase Anon Public API Key
                  </label>
                  <input
                    id="supabase-key-input"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 paper-input text-[#212121] font-mono text-sm"
                  />
                  <p className="text-[11px] font-mono text-stone-600 mt-1">Project API key with `anon` `public` role.</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputUrl('');
                      setInputKey('');
                      updateSupabaseConfig('', '');
                    }}
                    className="text-xs font-headline uppercase text-rose-700 hover:underline cursor-pointer"
                  >
                    Reset to Demo Sandbox
                  </button>

                  <button
                    id="save-credentials-btn"
                    type="submit"
                    className="paper-button paper-button-dark px-5 py-2.5 text-xs uppercase tracking-wider font-bold"
                  >
                    Save &amp; Reload Client
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-newspaper-title font-[900] uppercase text-[#212121]">
                    Database Schema &amp; Row Level Security
                  </h3>
                  <p className="text-xs font-serif-body text-stone-700">
                    Run this in your Supabase SQL Editor to create tables, RLS policies, and the OAuth user trigger.
                  </p>
                </div>
                <button
                  id="copy-sql-btn"
                  onClick={copySql}
                  className="paper-button flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative paper-card bg-[#1E1E1E] p-4 max-h-72 overflow-y-auto">
                <pre className="text-xs font-mono font-bold text-emerald-400 whitespace-pre leading-relaxed">
                  {sqlSchemaCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'oauth' && (
            <div className="space-y-4 text-sm font-serif-body">
              <h3 className="font-newspaper-title font-[900] uppercase text-[#212121] flex items-center space-x-2">
                <Github className="w-4 h-4" />
                <span>GitHub OAuth Provider Configuration</span>
              </h3>

              <ol className="list-decimal list-inside space-y-3 text-xs leading-relaxed text-stone-800">
                <li>
                  Go to <a href="https://github.com/settings/developers" target="_blank" rel="noreferrer" className="text-blue-800 underline font-bold inline-flex items-center">GitHub Developer Settings &gt; OAuth Apps <ExternalLink className="w-3 h-3 ml-1" /></a> and click <strong>New OAuth App</strong>.
                </li>
                <li>
                  Set <strong>Homepage URL</strong> to: <code className="bg-[#FAF6EC] text-black px-1.5 py-0.5 border border-black font-mono">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.app'}</code>
                </li>
                <li>
                  Set <strong>Authorization callback URL</strong> to your Supabase Auth callback URL:
                  <div className="mt-1 p-2 bg-white paper-card font-mono text-black break-all select-all text-xs">
                    {supabaseUrl ? `${supabaseUrl}/auth/v1/callback` : 'https://<your-project-ref>.supabase.co/auth/v1/callback'}
                  </div>
                </li>
                <li>
                  Copy your <strong>Client ID</strong> and generated <strong>Client Secret</strong> from GitHub into your Supabase Dashboard &gt; <strong>Authentication &gt; Providers &gt; GitHub</strong>, and toggle <strong>Enable GitHub</strong>.
                </li>
                <li>
                  Under <strong>Authentication &gt; URL Configuration</strong> in Supabase, add your app origin as a <strong>Redirect URL</strong>:
                  <div className="mt-1 p-2 bg-white paper-card font-mono text-black break-all select-all text-xs">
                    {typeof window !== 'undefined' ? `${window.location.origin}/**` : 'https://your-app.run.app/**'}
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-2 border-dashed border-[#212121] bg-stone-100 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-sketch font-bold uppercase text-stone-800">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Runs 100% on free-tier services ($0/mo)</span>
          </div>
          <button
            onClick={onClose}
            className="paper-button paper-button-dark px-4 py-1.5 text-xs uppercase font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
