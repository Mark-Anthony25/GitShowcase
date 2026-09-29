import React, { useState, useEffect, useRef } from 'react';
import { Github, User, Compass, FolderGit2, LogOut, Sparkles, Menu, X, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, navigate, onOpenGuide }) => {
  const { user, profile, signInWithGitHub, signOut, deleteAccount } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleGitHubSignIn = async () => {
    try {
      await signInWithGitHub();
    } catch (err: any) {
      if (err?.message === 'CONFIG_REQUIRED') {
        onOpenGuide();
      }
    }
  };

  const myUsername = profile?.github_username || '';

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dropdownOpen]);

  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [currentRoute]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!deleteDialogOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
        setDeleteDialogOpen(false);
        setConfirmationText('');
        setDeleteError(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteDialogOpen, isDeleting]);

  const openDeleteDialog = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    setConfirmationText('');
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setConfirmationText('');
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== 'DELETE' || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setDeleteDialogOpen(false);
      navigate('/');
    } catch (error) {
      console.error('Account deletion failed:', error);
      setDeleteError('We could not delete your account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const navBtnClass = (route: string) =>
    `paper-button text-xs py-1.5 px-3.5 font-bold ${
      currentRoute === route
        ? 'paper-button-dark'
        : 'bg-[#FEFCF6]'
    }`;

  return (
    <header className="w-full mt-2 sm:mt-3 bg-[#FEFCF6] border-1.5 border-[#212121] text-[#212121] select-none p-1.5 sm:p-2.5 mb-2.5 sm:mb-3 relative z-30 rounded-[255px_15px_225px_15px/15px_225px_15px_255px]">
      {/* Main Brand Title and Nav Bar */}
      <div className="py-1.5 sm:py-2 px-1 sm:px-3 flex items-center justify-between gap-3 lg:gap-6">
        {/* Brand / Logo */}
        <button
          id="masthead-home-btn"
          onClick={() => navigate('/')}
          className="text-left group cursor-pointer flex items-center space-x-2 sm:space-x-3 shrink-0 focus:outline-none"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 border-1.5 sm:border-2 border-[#212121] bg-[#FEFCF6] text-[#212121] flex items-center justify-center flex-shrink-0 rounded-xs group-hover:bg-[#FAF6EC] transition-colors">
            <Github className="w-4 h-4 sm:w-5 sm:h-5 text-[#212121] stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-[900] tracking-tight uppercase font-newspaper-title text-[#212121] leading-none group-hover:opacity-80 transition-opacity truncate">
              GITSHOWCASE
            </h1>
            <p className="text-[9px] sm:text-[11px] font-sketch text-stone-700 font-semibold truncate">
              Explore. Build. Collab
            </p>
          </div>
        </button>

        {/* Desktop Middle: Centered Navigation */}
        <div className="hidden lg:flex items-center justify-center flex-1 mx-3 lg:mx-6">
          <nav className="flex items-center space-x-2 lg:space-x-3">
            <button id="nav-front-page-btn" onClick={() => navigate('/')} className={navBtnClass('/')}>
              Home
            </button>
            <button id="nav-explore-btn" onClick={() => navigate('/explore')} className={navBtnClass('/explore')}>
              <Compass className="w-3.5 h-3.5 mr-1 flex-shrink-0" /><span>Projects</span>
            </button>
            {user && (
              <button id="nav-dashboard-btn" onClick={() => navigate('/dashboard')} className={navBtnClass('/dashboard')}>
                <FolderGit2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" /><span>My Projects</span>
              </button>
            )}
            {user && profile?.github_username && (
              <button id="nav-my-profile-btn" onClick={() => navigate(`/u/${profile.github_username}`)} className={navBtnClass(`/u/${profile.github_username}`)}>
                <User className="w-3.5 h-3.5 mr-1 flex-shrink-0" /><span>My Profile</span>
              </button>
            )}
          </nav>
        </div>

        {/* Desktop Right: User Menu & Auth Controls */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`paper-button flex items-center space-x-2 py-1 px-3 text-xs font-bold uppercase cursor-pointer min-h-[34px] transition-colors ${
                  dropdownOpen ? 'paper-button-dark' : ''
                }`}
                aria-expanded={dropdownOpen}
                aria-haspopup="menu"
                aria-controls="user-dropdown-menu"
              >
                <div className="w-5 h-5 paper-avatar">
                  <img
                    src={profile?.avatar_url || `https://github.com/${profile?.github_username || 'ghost'}.png`}
                    alt={profile?.github_username || 'Student Avatar'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="max-w-[100px] truncate font-mono text-[11px]">@{profile?.github_username || 'student'}</span>
              </button>
              {dropdownOpen && (
                <div
                  id="user-dropdown-menu"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-btn"
                  className="absolute right-0 top-full pt-1.5 w-56 z-50 animate-in fade-in duration-100"
                >
                  <div className="w-full bg-[#FEFCF6] border-2 border-[#212121] p-1.5 rounded-[255px_15px_225px_15px/15px_225px_15px_255px]">
                    <div className="p-2 border-b border-dashed border-[#212121] mb-1 bg-[#FAF6EC] rounded-xs">
                      <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">{profile?.full_name || 'Student Author'}</p>
                      <p className="text-[10px] font-mono text-stone-700 truncate">@{profile?.github_username || 'student'}</p>
                    </div>
                    <div className="flex flex-col gap-0.5" role="none">
                      <button
                        role="menuitem"
                        onClick={() => { setDropdownOpen(false); navigate('/dashboard'); }}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] focus:bg-[#EAE4D4] focus:outline-none flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[32px] rounded-xs transition-colors"
                      >
                        <FolderGit2 className="w-3.5 h-3.5 flex-shrink-0" /><span>My Projects</span>
                      </button>
                      {profile?.github_username && (
                        <button
                          role="menuitem"
                          onClick={() => { setDropdownOpen(false); navigate(`/u/${myUsername}`); }}
                          className="w-full text-left px-2.5 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] focus:bg-[#EAE4D4] focus:outline-none flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[32px] rounded-xs transition-colors"
                        >
                          <User className="w-3.5 h-3.5 flex-shrink-0" /><span>My Profile</span>
                        </button>
                      )}
                    </div>
                    <div className="border-t border-dashed border-[#212121] my-1" role="separator"></div>
                    <button
                      id="delete-account-btn"
                      role="menuitem"
                      onClick={openDeleteDialog}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-headline text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none hover:text-red-800 flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[32px] rounded-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 flex-shrink-0" /><span>Delete Account</span>
                    </button>
                    <button
                      id="signout-btn"
                      role="menuitem"
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                        navigate('/');
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-headline text-red-700 hover:bg-red-50 focus:bg-red-50 focus:outline-none hover:text-red-800 flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[32px] rounded-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 flex-shrink-0" /><span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleGitHubSignIn} className="paper-button paper-button-dark text-xs py-1.5 px-3 font-bold cursor-pointer min-h-[34px]">Continue With GitHub</button>
          )}
        </div>

        {/* Mobile: avatar thumbnail + hamburger */}
        <div className="flex lg:hidden items-center space-x-1.5 flex-shrink-0">
          {user && (
            <div className="w-7 h-7 paper-avatar">
              <img
                src={profile?.avatar_url || `https://github.com/${profile?.github_username || 'ghost'}.png`}
                alt={profile?.github_username || 'Avatar'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <button
            id="mobile-nav-toggle-btn"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="paper-button-icon min-w-[34px] min-h-[34px] p-1.5 flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4 text-[#212121]" /> : <Menu className="w-4 h-4 text-[#212121]" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Modal / Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-[#57534E]/45 lg:hidden paper-motion-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="w-full max-w-sm bg-[#FEFCF6] border-2 border-[#212121] paper-card paper-motion-menu p-3 sm:p-4 space-y-3 mt-2">
            {/* Modal Top Masthead */}
            <div className="flex items-center justify-between border-b border-dashed border-[#212121] pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-1.5 border-[#212121] bg-[#FEFCF6] text-[#212121] flex items-center justify-center rounded-xs">
                  <Github className="w-3.5 h-3.5 text-[#212121] stroke-[2]" />
                </div>
                <span className="font-newspaper-title font-[900] uppercase text-sm text-[#212121] tracking-tight">Navigation</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="paper-button-icon min-w-[30px] min-h-[30px] p-1 cursor-pointer"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4 text-[#212121]" />
              </button>
            </div>

            {/* Navigation Routes */}
            <div className="flex flex-col gap-1.5 pt-0.5">
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/'); }}
                className={`${navBtnClass('/')} w-full min-h-[38px] text-xs justify-start px-3`}
              >
                Home
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); navigate('/explore'); }}
                className={`${navBtnClass('/explore')} w-full min-h-[38px] text-xs justify-start px-3`}
              >
                <Compass className="w-3.5 h-3.5 mr-2 flex-shrink-0" /><span>Projects</span>
              </button>
              {user && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className={`${navBtnClass('/dashboard')} w-full min-h-[38px] text-xs justify-start px-3`}
                >
                  <FolderGit2 className="w-3.5 h-3.5 mr-2 flex-shrink-0" /><span>My Projects</span>
                </button>
              )}
              {user && profile?.github_username && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate(`/u/${profile.github_username}`)} }
                  className={`${navBtnClass(`/u/${profile.github_username}`)} w-full min-h-[38px] text-xs justify-start px-3`}
                >
                  <User className="w-3.5 h-3.5 mr-2 flex-shrink-0" /><span>My Profile</span>
                </button>
              )}
            </div>

            <div className="border-t border-dashed border-[#212121] my-0.5" />

            {/* User Session / Auth Action Box */}
            {user ? (
              <div className="space-y-2 pt-0.5">
                <div className="px-2.5 py-1.5 bg-[#FAF6EC] border border-[#212121] rounded-xs">
                  <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">
                    {profile?.full_name || 'Student Author'}
                  </p>
                  <p className="text-[10px] font-mono text-stone-700">
                    @{profile?.github_username || 'student'}
                  </p>
                </div>
                <button
                  id="mobile-signout-btn"
                  onClick={() => { setMobileMenuOpen(false); signOut(); navigate('/'); }}
                  className="paper-button text-xs py-2 px-3 text-red-700 bg-red-50 border-red-400 cursor-pointer w-full justify-center font-bold min-h-[36px]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /><span>Sign Out</span>
                </button>
                <button
                  id="mobile-delete-account-btn"
                  onClick={openDeleteDialog}
                  className="paper-button text-xs py-2 px-3 text-red-800 bg-red-50 border-red-500 cursor-pointer w-full justify-center font-bold min-h-[36px]"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /><span>Delete Account</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-0.5">
                <button onClick={() => { setMobileMenuOpen(false); handleGitHubSignIn(); }} className="paper-button paper-button-dark text-xs py-2 px-3 font-bold cursor-pointer justify-center min-h-[36px] w-full"><span>Continue With GitHub</span></button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#57534E]/45 p-3 sm:p-4 paper-motion-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Delete Account Confirmation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDeleteDialog();
          }}
        >
          <div className="w-full max-w-md bg-[#FEFCF6] border-2 border-[#212121] paper-card paper-motion-panel p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-[#212121] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 border-1.5 border-[#212121] bg-red-100 flex items-center justify-center rounded-xs" aria-hidden="true">
                  <AlertTriangle className="w-4 h-4 text-red-800" />
                </span>
                <div>
                  <p className="font-newspaper-title font-black uppercase text-sm text-[#212121]">Withdrawal Notice</p>
                  <p className="font-sketch text-[10px] uppercase text-stone-700">Permanent account removal</p>
                </div>
              </div>
              <button onClick={closeDeleteDialog} className="paper-button-icon p-1 min-w-[30px] min-h-[30px] cursor-pointer" aria-label="Close account deletion dialog" disabled={isDeleting}>
                <X className="w-4 h-4 text-[#212121]" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-stone-800">
              <p className="font-headline font-bold text-[#212121]">Delete @{profile?.github_username || 'your'} account?</p>
              <p>Your public profile and every published project in GitShowcase will be permanently removed.</p>
              <p className="text-xs italic text-stone-800">Your GitHub account and repositories will not be affected.</p>
              <label className="block text-xs font-headline font-bold uppercase text-[#212121]" htmlFor="delete-account-confirmation">
                Type DELETE to continue
                <input
                  id="delete-account-confirmation"
                  value={confirmationText}
                  onChange={(event) => setConfirmationText(event.target.value)}
                  disabled={isDeleting}
                  className="mt-1.5 w-full border-2 border-[#212121] bg-white px-3 py-2 font-mono text-sm text-[#212121] focus:outline-none focus:bg-[#FAF6EC] rounded-xs"
                  autoComplete="off"
                />
              </label>
              {deleteError && <p role="alert" className="border border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{deleteError}</p>}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-dashed border-[#212121] pt-3">
              <button onClick={closeDeleteDialog} disabled={isDeleting} className="paper-button bg-[#FEFCF6] text-xs px-3 py-2 cursor-pointer justify-center">Keep My Account</button>
              <button
                onClick={handleDeleteAccount}
                disabled={confirmationText !== 'DELETE' || isDeleting}
                className="paper-button bg-red-700 border-red-900 text-white text-xs px-3 py-2 cursor-pointer justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />{isDeleting ? 'Deleting Account...' : 'Delete Account Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
