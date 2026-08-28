import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, User, Session } from '../lib/supabase';
import { Profile } from '../types';
import { getProfileById, updateStudentProfile } from '../lib/showcaseStore';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  githubToken: string | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGitHub: () => Promise<void>;
  signInAsDemoStudent: () => void;
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && mounted) {
            setSession(session);
            setUser(session.user);
            if (session.provider_token) {
              setGithubToken(session.provider_token);
            }
            await loadProfile(session.user.id);
          }
        } catch (err) {
          console.error('Error fetching initial Supabase session:', err);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (!mounted) return;
          setSession(newSession);
          setUser(newSession?.user || null);

          if (newSession?.provider_token) {
            setGithubToken(newSession.provider_token);
          }

          if (newSession?.user) {
            setIsDemoMode(false);
            await loadProfile(newSession.user.id);
          } else if (!isDemoMode) {
            setProfile(null);
          }
        });

        if (mounted) setIsLoading(false);

        return () => {
          authListener?.subscription.unsubscribe();
        };
      } else {
        // Supabase is not configured yet. Check if demo session is stored in localStorage
        const storedDemo = localStorage.getItem('is_demo_student_active');
        if (storedDemo === 'true') {
          activateDemoSession();
        }
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const p = await getProfileById(userId);
      setProfile(p);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const activateDemoSession = () => {
    setIsDemoMode(true);
    const mockUser: any = {
      id: 'demo-student-uuid-001',
      email: 'markanthonyreyes239@gmail.com',
      user_metadata: {
        user_name: 'isabela-coder',
        full_name: 'Mark Anthony Reyes',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      }
    };
    setUser(mockUser);
    setProfile({
      id: 'demo-student-uuid-001',
      github_username: 'isabela-coder',
      full_name: 'Mark Anthony Reyes',
      headline: 'BS Computer Science • Full-Stack Developer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Passionate CS student crafting web & IoT systems.',
      program: 'BS Computer Science',
      year_level: '3rd Year',
      is_onboarded: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem('is_demo_student_active', 'true');
    }
  };

  const signInWithGitHub = async () => {
    if (!isSupabaseConfigured || !supabase) {
      // If not configured yet, activate Demo student mode and inform user
      activateDemoSession();
      return;
    }

    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
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
  };

  const signInAsDemoStudent = () => {
    activateDemoSession();
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setGithubToken(null);
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('is_demo_student_active');
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
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
        isDemoMode,
        authError,
        clearAuthError: () => setAuthError(null),
        signInWithGitHub,
        signInAsDemoStudent,
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
