import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { PublicProfileView } from './components/PublicProfileView';
import { ExploreView } from './components/ExploreView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { OnboardingModal } from './components/OnboardingModal';
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
      const rawUsername = currentPath.replace('/u/', '').split('/')[0].split('?')[0].split('#')[0];
      const username = decodeURIComponent(rawUsername).trim();
      return <PublicProfileView key={username} username={username} navigate={navigate} />;
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
    <div className="min-h-screen bg-[#F0EBE1] text-[#212121] flex flex-col p-1.5 xs:p-2 sm:p-3.5 md:p-5 lg:p-7 font-serif-body selection:bg-[#212121] selection:text-[#FEFCF6] w-full max-w-full overflow-x-hidden">
      {/* Central Paper Sheet Container */}
      <div className="max-w-full lg:max-w-[1380px] xl:max-w-[1440px] mx-auto w-full paper-sheet px-2.5 sm:px-5 md:px-7 lg:px-8 py-2 sm:py-4 md:py-4.5 flex-1 flex flex-col space-y-3 sm:space-y-4 lg:space-y-5 my-0.5 sm:my-1.5">
        {/* Newspaper / Paper Masthead */}
        <Header
          currentRoute={currentPath}
          navigate={navigate}
          onOpenGuide={() => setIsGuideOpen(true)}
        />

        {/* Main Content Article Body */}
        <main className="flex-1 w-full max-w-full">
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

