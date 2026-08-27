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

  const navBtnClass = (route: string) =>
    `px-3 py-2 sm:py-1.5 border-2 border-[#212121] transition-all cursor-pointer flex items-center justify-center space-x-2 font-bold text-xs font-headline uppercase tracking-wider min-h-[42px] md:min-h-[36px] ${
      currentRoute === route
        ? 'bg-[#212121] text-[#FEFCF6] shadow-[2px_2px_0px_#000]'
        : 'bg-[#FEFCF6] text-[#212121] hover:bg-[#EBE7DC] shadow-[1px_1px_0px_#212121]'
    }`;

  return (
    <header className="w-full bg-[#FEFCF6] border-2 border-[#212121] text-[#212121] select-none paper-card p-2 sm:p-3 mb-4">
      {/* Top Utility Bar */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#212121] px-1.5 sm:px-2 py-1 text-[10px] sm:text-[11px] font-sketch uppercase tracking-wider text-stone-700 bg-[#FAF6EC] gap-1">
        <span className="truncate max-w-[150px] sm:max-w-none font-bold">ISU Cauayan Campus</span>
        <span className="hidden md:inline font-bold">{getFormattedDate()}</span>
        <span className="font-bold truncate flex-shrink-0">Student Showcase</span>
      </div>

      {/* Main Brand Title and Nav Bar */}
      <div className="py-2 px-1.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand / Logo */}
        <button
          id="masthead-home-btn"
          onClick={() => navigate('/')}
          className="text-left group cursor-pointer flex items-center space-x-2 sm:space-x-3 min-w-0 max-w-[calc(100%-80px)] md:max-w-none focus:outline-none"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-[#212121] bg-[#212121] text-[#FAF8F2] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#212121] rounded-sm">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-[900] tracking-tight uppercase font-newspaper-title text-[#212121] leading-none group-hover:opacity-80 transition-opacity truncate">
              GITSHOWCASE
            </h1>
            <p className="text-[10px] sm:text-[12px] font-sketch text-stone-700 font-semibold truncate">
              ISU Cauayan &bull; Developer Hub
            </p>
          </div>
        </button>

        {/* Desktop Nav - hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          <nav className="flex items-center space-x-1.5">
            <button id="nav-front-page-btn" onClick={() => navigate('/')} className={navBtnClass('/')}>
              Front Page
            </button>
            <button id="nav-explore-btn" onClick={() => navigate('/explore')} className={navBtnClass('/explore')}>
              <Compass className="w-4 h-4 mr-1 flex-shrink-0" /><span>Directory</span>
            </button>
            {user && (
              <button id="nav-dashboard-btn" onClick={() => navigate('/dashboard')} className={navBtnClass('/dashboard')}>
                <LayoutDashboard className="w-4 h-4 mr-1 flex-shrink-0" /><span>My Desk</span>
              </button>
            )}
            {user && profile?.github_username && (
              <button id="nav-my-profile-btn" onClick={() => navigate(`/u/${profile.github_username}`)} className={navBtnClass(`/u/${profile.github_username}`)}>
                <User className="w-4 h-4 mr-1 flex-shrink-0" /><span>My Page</span>
              </button>
            )}
          </nav>
          <div className="h-5 w-0.5 bg-[#212121]"></div>
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="paper-button flex items-center space-x-2 py-1.5 px-3 text-xs font-bold uppercase cursor-pointer min-h-[38px]"
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
                <div className="absolute right-0 mt-1.5 w-56 bg-[#FEFCF6] border-2 border-[#212121] shadow-[4px_4px_0px_#212121] p-2 z-50 animate-in fade-in duration-100 paper-card">
                  <div className="p-2 border-b-2 border-dashed border-[#212121] mb-1 bg-[#FAF6EC]">
                    <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">{profile?.full_name || 'Student Author'}</p>
                    <p className="text-[11px] font-mono text-stone-700 truncate">@{profile?.github_username || 'isabela-coder'}</p>
                    {isDemoMode && <span className="paper-badge mt-1 text-[10px]">Guest Mode</span>}
                  </div>
                  <button onClick={() => { setDropdownOpen(false); navigate('/dashboard'); }} className="w-full text-left px-2 py-2 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[36px]">
                    <LayoutDashboard className="w-4 h-4 flex-shrink-0" /><span>Project Desk</span>
                  </button>
                  <button onClick={() => { setDropdownOpen(false); navigate(`/u/${myUsername}`); }} className="w-full text-left px-2 py-2 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[36px]">
                    <User className="w-4 h-4 flex-shrink-0" /><span>View Public Page</span>
                  </button>
                  <button onClick={() => { setDropdownOpen(false); navigate('/explore'); }} className="w-full text-left px-2 py-2 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[36px]">
                    <Compass className="w-4 h-4 flex-shrink-0" /><span>Classmate Directory</span>
                  </button>
                  <div className="border-t-2 border-dashed border-[#212121] my-1"></div>
                  <button id="signout-btn" onClick={() => { setDropdownOpen(false); signOut(); navigate('/'); }} className="w-full text-left px-2 py-2 text-xs font-headline text-red-700 hover:bg-red-50 flex items-center space-x-2 uppercase cursor-pointer font-bold min-h-[36px]">
                    <LogOut className="w-4 h-4 flex-shrink-0" /><span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <button id="demo-student-login-btn" onClick={() => { signInAsDemoStudent(); navigate('/dashboard'); }} className="paper-button text-xs py-1.5 px-3 cursor-pointer min-h-[38px]">
                <Sparkles className="w-3.5 h-3.5 text-stone-700 mr-1 flex-shrink-0" /><span>Guest Demo</span>
              </button>
              <button id="github-login-btn" onClick={async () => { await signInWithGitHub(); navigate('/dashboard'); }} className="paper-button paper-button-dark text-xs py-1.5 px-3.5 font-bold cursor-pointer min-h-[38px]">
                <Github className="w-4 h-4 text-white mr-1.5 flex-shrink-0" /><span>GitHub Sign In</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile: avatar thumbnail + hamburger */}
        <div className="flex md:hidden items-center space-x-2 flex-shrink-0">
          {user && (
            <div className="w-8 h-8 border-2 border-[#212121] bg-stone-300 overflow-hidden flex-shrink-0 rounded-xs shadow-[1px_1px_0px_#212121]">
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
            className="paper-button-icon min-w-[44px] min-h-[44px] p-2 flex items-center justify-center cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#212121]" /> : <Menu className="w-5 h-5 text-[#212121]" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-dashed border-[#212121] pt-3 pb-3 px-2 flex flex-col gap-2 bg-[#FAF6EC] animate-in fade-in duration-150">
          <button onClick={() => navigate('/')} className={`${navBtnClass('/')} w-full min-h-[44px] text-xs justify-start px-3`}>
            Front Page
          </button>
          <button onClick={() => navigate('/explore')} className={`${navBtnClass('/explore')} w-full min-h-[44px] text-xs justify-start px-3`}>
            <Compass className="w-4 h-4 mr-1.5 flex-shrink-0" /><span>Campus Directory</span>
          </button>
          {user && (
            <button onClick={() => navigate('/dashboard')} className={`${navBtnClass('/dashboard')} w-full min-h-[44px] text-xs justify-start px-3`}>
              <LayoutDashboard className="w-4 h-4 mr-1.5 flex-shrink-0" /><span>Project Desk</span>
            </button>
          )}
          {user && profile?.github_username && (
            <button onClick={() => navigate(`/u/${profile.github_username}`)} className={`${navBtnClass(`/u/${profile.github_username}`)} w-full min-h-[44px] text-xs justify-start px-3`}>
              <User className="w-4 h-4 mr-1.5 flex-shrink-0" /><span>My Public Page</span>
            </button>
          )}
          <div className="border-t-2 border-dashed border-[#212121] my-1" />
          {user ? (
            <div className="space-y-2 pt-1">
              <div className="px-2 py-1 bg-[#FEFCF6] border border-[#212121] rounded-xs">
                <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">
                  {profile?.full_name || 'Student Author'}
                </p>
                <p className="text-[11px] font-mono text-stone-700">
                  @{profile?.github_username || 'student'}{isDemoMode ? ' · Guest' : ''}
                </p>
              </div>
              <button
                id="mobile-signout-btn"
                onClick={() => { setMobileMenuOpen(false); signOut(); navigate('/'); }}
                className="paper-button text-xs py-2 px-3.5 text-red-700 bg-red-50 border-red-500 cursor-pointer w-full justify-center font-bold min-h-[44px]"
              >
                <LogOut className="w-4 h-4 mr-1.5 flex-shrink-0" /><span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button id="demo-mobile" onClick={() => { signInAsDemoStudent(); navigate('/dashboard'); }} className="paper-button text-xs py-2.5 px-3 cursor-pointer flex-1 justify-center min-h-[44px] font-bold">
                <Sparkles className="w-4 h-4 text-stone-700 mr-1.5 flex-shrink-0" /><span>Guest Demo</span>
              </button>
              <button id="github-mobile" onClick={async () => { await signInWithGitHub(); navigate('/dashboard'); }} className="paper-button paper-button-dark text-xs py-2.5 px-3.5 font-bold cursor-pointer flex-1 justify-center min-h-[44px]">
                <Github className="w-4 h-4 text-white mr-1.5 flex-shrink-0" /><span>GitHub Sign In</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
