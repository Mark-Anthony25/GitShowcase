import React, { useState, useEffect, useRef } from 'react';
import { Github, User, Compass, LayoutDashboard, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, navigate }) => {
  const { user, profile, isDemoMode, signInWithGitHub, signInAsDemoStudent, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const myUsername = profile?.github_username || 'isabela-coder';

  const getFormattedDate = () => {
    const today = new Date();
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const dayName = days[today.getDay()];
    const dateNum = today.getDate();
    const monthName = months[today.getMonth()];
    const year = today.getFullYear();
    const getOrdinal = (n: number) => {
      const s = ['TH', 'ST', 'ND', 'RD'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    return `${dayName}, ${dateNum}${getOrdinal(dateNum)} ${monthName} ${year}`;
  };

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

  const navBtnClass = (route: string) =>
    `paper-button text-xs py-1.5 px-3.5 font-bold ${
      currentRoute === route
        ? 'paper-button-dark'
        : 'bg-[#FEFCF6]'
    }`;

  return (
    <header className="w-full bg-[#FEFCF6] border-1.5 border-[#212121] text-[#212121] select-none paper-card p-1.5 sm:p-2.5 mb-2.5 sm:mb-3">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between border-b border-dashed border-[#212121] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-sketch uppercase tracking-wider text-stone-700 bg-[#FAF6EC] gap-1">
        <span className="truncate max-w-[150px] sm:max-w-none font-bold">ISU Cauayan</span>
        <span className="hidden md:inline font-bold">{getFormattedDate()}</span>
        <span className="font-bold truncate flex-shrink-0">Project Showcase</span>
      </div>

      {/* Main Brand Title and Nav Bar */}
      <div className="py-1.5 sm:py-2 px-1 sm:px-3 flex items-center justify-between gap-3 lg:gap-6">
        {/* Brand / Logo */}
        <button
          id="masthead-home-btn"
          onClick={() => navigate('/')}
          className="text-left group cursor-pointer flex items-center space-x-2 sm:space-x-3 shrink-0 focus:outline-none"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 border-1.5 sm:border-2 border-[#212121] bg-[#FEFCF6] text-[#212121] flex items-center justify-center flex-shrink-0 shadow-[1.5px_1.5px_0px_#212121] sm:shadow-[2px_2px_0px_#212121] rounded-xs group-hover:bg-[#FAF6EC] transition-colors">
            <Github className="w-4 h-4 sm:w-5 sm:h-5 text-[#212121] stroke-[2]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-[900] tracking-tight uppercase font-newspaper-title text-[#212121] leading-none group-hover:opacity-80 transition-opacity truncate">
              GITSHOWCASE
            </h1>
            <p className="text-[9px] sm:text-[11px] font-sketch text-stone-700 font-semibold truncate">
              Student Project Showcase
            </p>
          </div>
        </button>

        {/* Desktop Middle: Centered Navigation */}
        <div className="hidden md:flex items-center justify-center flex-1 mx-3 lg:mx-6">
          <nav className="flex items-center space-x-2 lg:space-x-3">
            <button id="nav-front-page-btn" onClick={() => navigate('/')} className={navBtnClass('/')}>
              Home
            </button>
            <button id="nav-explore-btn" onClick={() => navigate('/explore')} className={navBtnClass('/explore')}>
              <Compass className="w-3.5 h-3.5 mr-1 flex-shrink-0" /><span>Browse Projects</span>
            </button>
            {user && (
              <button id="nav-dashboard-btn" onClick={() => navigate('/dashboard')} className={navBtnClass('/dashboard')}>
                <LayoutDashboard className="w-3.5 h-3.5 mr-1 flex-shrink-0" /><span>My Projects</span>
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
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="paper-button flex items-center space-x-2 py-1 px-3 text-xs font-bold uppercase cursor-pointer min-h-[34px]"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                <div className="w-5 h-5 border border-[#212121] bg-stone-300 overflow-hidden flex-shrink-0 rounded-xs">
                  <img
                    src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={profile?.github_username || 'Student Avatar'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="max-w-[100px] truncate font-mono text-[11px]">@{profile?.github_username || 'student'}</span>
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-[#FEFCF6] border-2 border-[#212121] shadow-[4px_4px_0px_#212121] p-1.5 z-50 animate-in fade-in duration-100 paper-card">
                  <div className="p-2 border-b border-dashed border-[#212121] mb-1 bg-[#FAF6EC]">
                    <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">{profile?.full_name || 'Student Author'}</p>
                    <p className="text-[10px] font-mono text-stone-700 truncate">@{profile?.github_username || 'isabela-coder'}</p>
                    {isDemoMode && <span className="paper-badge mt-1 text-[9px]">Guest Mode</span>}
                  </div>
                  <button onClick={() => { setDropdownOpen(false); navigate('/dashboard'); }} className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[30px]">
                    <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" /><span>My Projects</span>
                  </button>
                  <button onClick={() => { setDropdownOpen(false); navigate(`/u/${myUsername}`); }} className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[30px]">
                    <User className="w-3.5 h-3.5 flex-shrink-0" /><span>My Profile</span>
                  </button>
                  <div className="border-t border-dashed border-[#212121] my-1"></div>
                  <button id="signout-btn" onClick={() => { setDropdownOpen(false); signOut(); navigate('/'); }} className="w-full text-left px-2 py-1.5 text-xs font-headline text-red-700 hover:bg-red-50 flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[30px]">
                    <LogOut className="w-3.5 h-3.5 flex-shrink-0" /><span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button id="demo-student-login-btn" onClick={() => { signInAsDemoStudent(); navigate('/dashboard'); }} className="paper-button text-xs py-1.5 px-3 cursor-pointer min-h-[34px] text-stone-800 hover:text-black font-bold">
                <Sparkles className="w-3.5 h-3.5 text-stone-700 mr-1 flex-shrink-0" /><span>Guest Demo</span>
              </button>
              <button id="github-login-btn" onClick={async () => { await signInWithGitHub(); navigate('/dashboard'); }} className="paper-button text-xs py-1.5 px-3.5 font-bold cursor-pointer min-h-[34px] bg-[#FEFCF6] text-[#212121] hover:bg-[#FAF6EC]">
                <Github className="w-3.5 h-3.5 text-[#212121] mr-1 flex-shrink-0" /><span>GitHub Sign In</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile: avatar thumbnail + hamburger */}
        <div className="flex md:hidden items-center space-x-1.5 flex-shrink-0">
          {user && (
            <div className="w-7 h-7 border-1.5 border-[#212121] bg-stone-300 overflow-hidden flex-shrink-0 rounded-xs shadow-[1px_1px_0px_#212121]">
              <img
                src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
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
          className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-[#212121]/70 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileMenuOpen(false);
          }}
        >
          <div className="w-full max-w-sm bg-[#FEFCF6] border-2 border-[#212121] shadow-[4px_4px_0px_#212121] paper-card p-3 sm:p-4 space-y-3 mt-2 animate-in zoom-in-95 duration-150">
            {/* Modal Top Masthead */}
            <div className="flex items-center justify-between border-b border-dashed border-[#212121] pb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 border-1.5 border-[#212121] bg-[#FEFCF6] text-[#212121] flex items-center justify-center rounded-xs shadow-[1px_1px_0px_#212121]">
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
                <Compass className="w-3.5 h-3.5 mr-2 flex-shrink-0" /><span>Browse Projects</span>
              </button>
              {user && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className={`${navBtnClass('/dashboard')} w-full min-h-[38px] text-xs justify-start px-3`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-2 flex-shrink-0" /><span>My Projects</span>
                </button>
              )}
              {user && profile?.github_username && (
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate(`/u/${profile.github_username}`); }}
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
                    @{profile?.github_username || 'student'}{isDemoMode ? ' · Guest' : ''}
                  </p>
                </div>
                <button
                  id="mobile-signout-btn"
                  onClick={() => { setMobileMenuOpen(false); signOut(); navigate('/'); }}
                  className="paper-button text-xs py-2 px-3 text-red-700 bg-red-50 border-red-400 cursor-pointer w-full justify-center font-bold min-h-[36px]"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" /><span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-0.5">
                <button
                  id="demo-mobile"
                  onClick={() => { setMobileMenuOpen(false); signInAsDemoStudent(); navigate('/dashboard'); }}
                  className="paper-button text-xs py-2 px-3 cursor-pointer justify-center min-h-[36px] font-bold w-full text-stone-800"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-700 mr-1.5 flex-shrink-0" /><span>Guest Demo</span>
                </button>
                <button
                  id="github-mobile"
                  onClick={async () => { setMobileMenuOpen(false); await signInWithGitHub(); navigate('/dashboard'); }}
                  className="paper-button text-xs py-2 px-3 font-bold cursor-pointer justify-center min-h-[36px] w-full bg-[#FEFCF6] text-[#212121] hover:bg-[#FAF6EC]"
                >
                  <Github className="w-3.5 h-3.5 text-[#212121] mr-1.5 flex-shrink-0" /><span>GitHub Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
