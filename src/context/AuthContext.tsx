import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured, User, Session } from '../lib/supabase';
import { Profile } from '../types';
import { getProfileById, purgeStudentShowcaseData, updateStudentProfile } from '../lib/showcaseStore';
import { fetchGitHubUserData, setActiveGitHubToken } from '../lib/github';
import { completeOAuthCallback } from '../lib/authCallback';

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
  deleteAccount: () => Promise<void>;
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
      const storedError = sessionStorage.getItem('gitshowcase_auth_error');
      if (storedError) {
        setAuthError(storedError);
        sessionStorage.removeItem('gitshowcase_auth_error');
      }
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
      const p = await getProfileById(userId, true);
      if (p) {
        let resolvedProfile = p;

        // GitHub handles are case-insensitive for lookups, but its `login` field
        // is the canonical display spelling. Keep existing profiles aligned.
        try {
          const liveGitUser = await fetchGitHubUserData(token || null, p.github_username);
          if (liveGitUser?.login && liveGitUser.login !== p.github_username) {
            const updated = await updateStudentProfile(userId, {
              github_username: liveGitUser.login,
            });
            resolvedProfile = updated || { ...p, github_username: liveGitUser.login };
          }
        } catch (err) {
          console.warn('Could not reconcile GitHub username casing:', err);
        }

        setProfile(resolvedProfile);
      } else if (authUser) {
        // New user after GitHub signup: Extract metadata & sync from GitHub API
        const meta = authUser.user_metadata || {};
        const githubHandle = meta.user_name || meta.preferred_username || meta.name || authUser.email?.split('@')[0] || 'student';
        
        let initialAvatar = meta.avatar_url || `https://github.com/${githubHandle}.png`;
        let initialName = meta.full_name || meta.name || githubHandle;
        let initialBio = '';
        let canonicalGithubUsername = githubHandle;

        // Try live GitHub user fetch for richest info
        try {
          const liveGitUser = await fetchGitHubUserData(token || null, githubHandle);
          if (liveGitUser) {
            if (liveGitUser.login) canonicalGithubUsername = liveGitUser.login;
            if (liveGitUser.avatar_url) initialAvatar = liveGitUser.avatar_url;
            if (liveGitUser.name) initialName = liveGitUser.name;
            if (liveGitUser.bio) initialBio = liveGitUser.bio.slice(0, 50);
          }
        } catch (e) {
          console.warn('Could not enrich new user from GitHub:', e);
        }

        const newProfile: Profile = {
          id: userId,
          github_username: canonicalGithubUsername,
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
        const saved = await updateStudentProfile(userId, newProfile);
        setProfile(saved || newProfile);
      }
    } catch (err) {
      console.error('Error loading profile in AuthContext:', err);
    }
  }, []);

  // Initialize auth state with deduplicated session and listener handling
  useEffect(() => {
    let mounted = true;
    let lastLoadedUserId: string | null = null;

    async function initAuth() {
      if (window.location.pathname === '/auth/callback') {
        if (!isSupabaseConfigured || !supabase) {
          sessionStorage.setItem('gitshowcase_auth_error', 'GitHub sign-in is not configured yet.');
          window.location.replace('/signin');
          return;
        }
        const result = await completeOAuthCallback(window.location.search, (code) => supabase.auth.exchangeCodeForSession(code));
        if (result.status === 'success') {
          window.location.replace('/dashboard');
        } else {
          sessionStorage.setItem('gitshowcase_auth_error', result.message);
          window.location.replace('/signin');
        }
        return;
      }
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
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'read:user repo',
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('GitHub OAuth error:', error.message);
        throw error;
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

  const deleteAccount = async (): Promise<void> => {
    if (!user) {
      throw new Error('You must be signed in to delete your account.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        throw error;
      }
    }

    if (!purgeStudentShowcaseData(user.id, profile?.github_username)) {
      throw new Error('We could not clear account data from this browser. Please try again.');
    }

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
    const updated = await updateStudentProfile(user.id, {
      ...updates,
      github_username: updates.github_username || profile?.github_username || '',
      is_onboarded: updates.is_onboarded !== undefined ? updates.is_onboarded : (profile?.is_onboarded ?? true),
    });
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
        deleteAccount,
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
