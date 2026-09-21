import React, { useState } from 'react';
import { Github, LockKeyhole, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthGateViewProps {
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({ navigate, onOpenGuide }) => {
  const { signInWithGitHub } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGitHub();
    } catch (err: any) {
      if (err?.message === 'CONFIG_REQUIRED') {
        onOpenGuide();
      } else {
        setError('GitHub sign-in could not start. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-14 text-center space-y-4 paper-card bg-[#FEFCF6]">
      <div className="w-12 h-12 paper-card bg-[#FAF6EC] flex items-center justify-center mx-auto text-stone-700">
        <LockKeyhole className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
          Sign In To Open Your Project Desk
        </h1>
        <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
          Your dashboard is where you set up your profile and choose repositories to publish.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-xs font-serif-body text-rose-700">
          {error}
        </p>
      )}
      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className="paper-button paper-button-dark text-xs py-2 px-4 font-bold flex items-center space-x-1.5"
        >
          {signingIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
          <span>{signingIn ? 'Opening GitHub...' : 'Sign In With GitHub'}</span>
        </button>
        <button
          onClick={() => navigate('/explore')}
          className="paper-button text-xs py-2 px-4 font-bold"
        >
          Browse Projects
        </button>
      </div>
    </div>
  );
};
