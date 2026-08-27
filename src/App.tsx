import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { PublicProfileView } from './components/PublicProfileView';
import { ExploreView } from './components/ExploreView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { OnboardingModal } from './components/OnboardingModal';
import { Newspaper, Github, BookOpen } from 'lucide-react';
import { Profile } from './types';

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [manualOnboardOpen, setManualOnboardOpen] = useState(false);
  const { user, profile, githubToken, updateProfileData } = useAuth();

  // Sync state with browser location
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname || '/';
      const hash = window.location.hash.replace('#', '') || '';
      
      // Support both pathname and hash routing
      const effectivePath = hash ? (hash.startsWith('/') ? hash : `/${hash}`) : path;
      setCurrentPath(effectivePath || '/');
    };

    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigate = (route: string) => {
    setCurrentPath(route);
    if (window.history.pushState) {
      window.history.pushState(null, '', route);
    } else {
      window.location.hash = route;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Route resolution
  const renderCurrentView = () => {
    // 1. Check for /u/[username]
    if (currentPath.startsWith('/u/')) {
      const username = currentPath.replace('/u/', '').split('/')[0];
      return <PublicProfileView username={username} navigate={navigate} />;
    }

    // 2. Check for /dashboard
    if (currentPath === '/dashboard') {
      if (!user) {
        return <LandingView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} />;
      }
      return (
        <DashboardView 
          navigate={navigate} 
          onOpenOnboarding={() => setManualOnboardOpen(true)} 
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      );
    }

    // 3. Check for /explore
    if (currentPath === '/explore') {
      return <ExploreView navigate={navigate} />;
    }

    // 4. Default / Home Landing
    return <LandingView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} />;
  };

  const handleOnboardingComplete = async (updatedProfile: Profile) => {
    await updateProfileData({
      github_username: updatedProfile.github_username,
      full_name: updatedProfile.full_name,
      headline: updatedProfile.headline,
      bio: updatedProfile.bio,
      program: updatedProfile.program,
      year_level: updatedProfile.year_level,
      is_onboarded: true,
    });
    setManualOnboardOpen(false);
    navigate(`/u/${updatedProfile.github_username}`);
  };

  const showOnboarding = Boolean(
    user && profile && (profile.is_onboarded === false || manualOnboardOpen)
  );

  return (
    <div className="min-h-screen bg-[#F0EBE1] text-[#212121] flex flex-col justify-between p-2 sm:p-4 md:p-6 lg:p-8 font-serif-body selection:bg-[#212121] selection:text-[#FEFCF6]">
      {/* Central Paper Sheet Container */}
      <div className="max-w-6xl mx-auto w-full paper-sheet px-4 sm:px-8 md:px-10 py-6 flex-1 flex flex-col space-y-6 my-2 sm:my-4">
        {/* Newspaper / Paper Masthead */}
        <Header
          currentRoute={currentPath}
          navigate={navigate}
          onOpenGuide={() => setIsGuideOpen(true)}
        />

        {/* Main Content Article Body */}
        <main className="flex-1">
          {renderCurrentView()}
        </main>

        {/* Onboarding Setup Modal */}
        {profile && (
          <OnboardingModal
            isOpen={showOnboarding}
            profile={profile}
            githubToken={githubToken}
            onComplete={handleOnboardingComplete}
            onCancel={() => setManualOnboardOpen(false)}
          />
        )}

        {/* Setup Assistant Modal */}
        <SupabaseGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />

        {/* Paper Footer */}
        <footer className="border-t-2 border-[#212121] py-4 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-serif-body text-[#3B3A36] bg-[#F7F3E9] px-4 paper-card">
          <div className="flex items-center space-x-2">
            <Github className="w-4 h-4 text-[#212121]" />
            <span className="font-headline font-bold uppercase tracking-wider text-[#212121]">
              GitShowcase &bull; Isabela State University - Cauayan Campus
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 font-mono text-[11px] uppercase tracking-wider text-stone-700">
            <button
              onClick={() => navigate('/')}
              className="hover:text-black underline cursor-pointer font-bold"
            >
              Front Page
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/explore')}
              className="hover:text-black underline cursor-pointer font-bold"
            >
              Directory
            </button>
            <span>&bull;</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-black underline flex items-center space-x-1 font-bold"
            >
              <Github className="w-3 h-3" />
              <span>GitHub</span>
            </a>
          </div>
        </footer>

        <div className="text-center text-[11px] font-sketch text-stone-600 pb-2">
          GitShowcase &bull; Isabela State University - Cauayan Campus &bull; Crafted with PaperCSS
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

