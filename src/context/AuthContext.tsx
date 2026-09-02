import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, User, Session } from '../lib/supabase';
import { Profile } from '../types';
import { getProfileById, updateStudentProfile } from '../lib/showcaseStore';
import { fetchGitHubUserData, setActiveGitHubToken } from '../lib/github';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  githubToken: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (updates: Partial<Profile>) => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync global GitHub token for background requests
  useEffect(() => {
    setActiveGitHubToken(githubToken);
  }, [githubToken]);

  // Check for OAuth error parameters in URL on mount
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      
      const errDesc = searchParams.get('error_description') || hashParams.get('error_description');
      const err = searchParams.get('error') || hashParams.get('error');

      if (errDesc || err) {
        let msg = decodeURIComponent(errDesc || err || 'OAuth sign in failed');
        if (msg.includes('Unable to exchange external code')) {
          msg = 'Unable to exchange GitHub authorization code. This usually means the GitHub Client Secret in your Supabase Dashboard -> Authentication -> Providers -> GitHub is invalid, expired, or mistyped.';
        }
        setAuthError(msg);

        // Clean query params from URL without refreshing
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.error('Error parsing OAuth error in URL:', e);
    }
  }, []);

  const loadProfile = useCallback(async (userId: string, authUser?: User, token?: string | null) => {
    try {
      const p = await getProfileById(userId);
      if (p) {
        setProfile(p);
      } else if (authUser) {
        // New user after GitHub signup: Extract metadata & sync from GitHub API
        const meta = authUser.user_metadata || {};
        const githubHandle = meta.user_name || meta.preferred_username || meta.name || authUser.email?.split('@')[0] || 'student';
        
        let initialAvatar = meta.avatar_url || `https://github.com/${githubHandle}.png`;
        let initialName = meta.full_name || meta.name || githubHandle;
        let initialBio = '';

        // Try live GitHub user fetch for richest info
        try {
          const liveGitUser = await fetchGitHubUserData(token || null, githubHandle);
          if (liveGitUser) {
            if (liveGitUser.avatar_url) initialAvatar = liveGitUser.avatar_url;
            if (liveGitUser.name) initialName = liveGitUser.name;
            if (liveGitUser.bio) initialBio = liveGitUser.bio.slice(0, 50);
          }
        } catch (e) {
          console.warn('Could not enrich new user from GitHub:', e);
        }

        const newProfile: Profile = {
          id: userId,
          github_username: githubHandle,
          full_name: initialName,
          headline: 'BS Computer Science • Developer',
          avatar_url: initialAvatar,
          bio: initialBio.slice(0, 50) || null,
          program: 'BS Computer Science',
          year_level: '1st Year',
          is_onboarded: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Save initial profile draft to database/store
        await updateStudentProfile(userId, newProfile);
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error loading profile in AuthContext:', err);
    }
  }, []);

  // Cross-window popup authentication handler
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS') {
        if (isSupabaseConfigured && supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              setSession(session);
              setUser(session.user);
              const tok = session.provider_token || null;
              if (tok) {
                setGithubToken(tok);
              }
              await loadProfile(session.user.id, session.user, tok);
            }
          } catch (err) {
            console.error('Error handling popup auth session:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [loadProfile]);

  // Popup closer detection: If this window was opened as a popup and contains auth callback tokens
  useEffect(() => {
    if (typeof window !== 'undefined' && window.opener) {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      if (
        hash.includes('access_token=') || 
        hash.includes('refresh_token=') || 
        search.includes('code=') ||
        hash.includes('type=recovery')
      ) {
        const timer = setTimeout(() => {
          try {
            window.opener.postMessage({ type: 'SUPABASE_AUTH_SUCCESS' }, '*');
          } catch (e) {
            console.error('Error communicating with opener window:', e);
          }
          try {
            window.close();
          } catch (e) {
            console.error('Error closing popup window:', e);
          }
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Initialize auth state with deduplicated session and listener handling
  useEffect(() => {
    let mounted = true;
    let lastLoadedUserId: string | null = null;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) {
            setSession(session);
            setUser(session.user);
            const tok = session.provider_token || null;
            if (tok) {
              setGithubToken(tok);
            }
            lastLoadedUserId = session.user.id;
            await loadProfile(session.user.id, session.user, tok);
          }
        } catch (err) {
          console.error('Error fetching initial Supabase session:', err);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          setUser(newSession?.user || null);

          const tok = newSession?.provider_token || null;
          if (tok) {
            setGithubToken(tok);
          }

          if (newSession?.user) {
            // Only reload if user changed or event is explicit SIGNED_IN / USER_UPDATED
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || lastLoadedUserId !== newSession.user.id) {
              lastLoadedUserId = newSession.user.id;
              await loadProfile(newSession.user.id, newSession.user, tok);
            }
          } else {
            lastLoadedUserId = null;
            setProfile(null);
          }
        });

        if (mounted) setIsLoading(false);

        return () => {
          authListener?.subscription.unsubscribe();
        };
      } else {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const signInWithGitHub = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('CONFIG_REQUIRED');
    }

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'read:user repo',
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('GitHub OAuth error:', error.message);
        throw error;
      }

      if (data?.url) {
        const width = 600;
        const height = 750;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const authWindow = window.open(
          data.url,
          'github_oauth_popup',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`
        );

        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          if (window.top === window.self) {
            window.location.href = data.url;
          } else {
            alert('Please allow popups for this site in your browser to sign in with GitHub.');
          }
        }
      }
    } catch (err) {
      console.error('signInWithGitHub failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setGithubToken(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id, user, githubToken);
    }
  };

  const updateProfileData = async (updates: Partial<Profile>): Promise<Profile | null> => {
    if (!user) return null;
    const updated = await updateStudentProfile(user.id, updates);
    if (updated) {
      setProfile(updated);
    }
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        githubToken,
        isLoading,
        isConfigured: isSupabaseConfigured,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGitHub,
        signOut,
        refreshProfile,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
