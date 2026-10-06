import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { AuthGateView } from './components/AuthGateView';
import { AuthCallbackView } from './components/AuthCallbackView';
import { SupabaseGuideModal } from './components/SupabaseGuideModal';
import { Profile } from './types';

const DashboardView = lazy(() => import('./components/DashboardView').then(module => ({ default: module.DashboardView })));
const PublicProfileView = lazy(() => import('./components/PublicProfileView').then(module => ({ default: module.PublicProfileView })));
const ExploreView = lazy(() => import('./components/ExploreView').then(module => ({ default: module.ExploreView })));
const OnboardingModal = lazy(() => import('./components/OnboardingModal').then(module => ({ default: module.OnboardingModal })));

function AppContent() {
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [manualOnboardOpen, setManualOnboardOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
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
    if (currentPath === '/auth/callback') return <AuthCallbackView />;
    // 1. Check for /u/[username]
    if (currentPath.startsWith('/u/')) {
      const rawUsername = currentPath.replace('/u/', '').split('/')[0].split('?')[0].split('#')[0];
      const username = decodeURIComponent(rawUsername).trim();
      return <PublicProfileView key={username} username={username} navigate={navigate} />;
    }

    // 2. Check for /dashboard
    if (currentPath === '/dashboard') {
      if (!user) {
        return <AuthGateView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} />;
      }
      return (
        <DashboardView 
          navigate={navigate} 
          onOpenOnboarding={() => {
            setOnboardingDismissed(false);
            setManualOnboardOpen(true);
          }} 
          onOpenGuide={() => setIsGuideOpen(true)}
        />
      );
    }

    if (currentPath === '/signin') return <AuthGateView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} />;
    if (currentPath === '/signup') return <AuthGateView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} mode="signup" />;

    // 3. Check for /explore
    if (currentPath === '/explore') {
      return <ExploreView navigate={navigate} />;
    }

    // 4. Default / Home Landing
    return <LandingView navigate={navigate} onOpenGuide={() => setIsGuideOpen(true)} />;
  };

  const handleOnboardingComplete = async (updatedProfile: Profile) => {
    const savedProfile = await updateProfileData({
      contact_url: updatedProfile.contact_url,
      website_url: updatedProfile.website_url,
      github_username: updatedProfile.github_username,
      full_name: updatedProfile.full_name,
      bio: updatedProfile.bio,
      program: updatedProfile.program,
      year_level: updatedProfile.year_level,
      is_onboarded: true,
    });
    if (!savedProfile) throw new Error('Could not save your profile. Check database setup and retry.');
    setOnboardingDismissed(true);
    setManualOnboardOpen(false);
    navigate(`/u/${updatedProfile.github_username}`);
  };

  const handleOnboardingCancel = () => {
    setManualOnboardOpen(false);
    setOnboardingDismissed(true);
  };

  const showOnboarding = Boolean(
    user && profile && !onboardingDismissed && (profile.is_onboarded === false || manualOnboardOpen)
  );

  return (
    <div className="min-h-screen bg-[#F0EBE1] text-[#212121] flex flex-col p-1.5 xs:p-2 sm:p-3.5 md:p-5 lg:p-7 font-serif-body selection:bg-[#7A2E25] selection:text-[#FFF8E7] w-full max-w-full overflow-x-hidden">
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
          <Suspense fallback={
            <div className="min-h-32 flex flex-col items-center justify-center gap-2" role="status">
              <img src="/brand/gitshowcase-symbol.svg" alt="" width="40" height="40" className="w-10 h-10" />
              <span className="text-xs font-sketch">Loading page</span>
            </div>
          }>{renderCurrentView()}</Suspense>
        </main>

        {/* Onboarding Setup Modal */}
        {profile && (
          <Suspense fallback={null}><OnboardingModal isOpen={showOnboarding} profile={profile} githubToken={githubToken} onComplete={handleOnboardingComplete} onCancel={handleOnboardingCancel} /></Suspense>
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

