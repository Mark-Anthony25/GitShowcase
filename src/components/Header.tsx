import React, { useState } from 'react';
import { Github, User, Compass, LayoutDashboard, LogOut, Sparkles, Newspaper, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, navigate }) => {
  const { user, profile, isDemoMode, signInWithGitHub, signInAsDemoStudent, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const myUsername = profile?.github_username || 'isabela-coder';

  // Format today's date in classic newspaper format: "WEDNESDAY, 26TH AUGUST 2026"
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

  return (
    <header className="w-full bg-[#FAF8F2] border-b border-[#1A1815] text-[#1A1815] select-none">
      {/* Top Utility Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#D6D0C4] px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-stone-600 bg-[#F4F0E6]">
        <span>Isabela State University &bull; Cauayan Campus</span>
        <span className="hidden md:inline font-semibold">{getFormattedDate()}</span>
        <span className="font-semibold">Student Project Showcase</span>
      </div>

      {/* Main Brand Title & Nav Bar */}
      <div className="py-3 sm:py-4 px-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <button
          id="masthead-home-btn"
          onClick={() => navigate('/')}
          className="text-left group cursor-pointer flex items-center space-x-3"
        >
          <div className="w-9 h-9 border border-[#1A1815] bg-[#1A1815] text-[#FAF8F2] flex items-center justify-center flex-shrink-0">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-[900] tracking-tight uppercase font-newspaper-title text-[#1A1815] leading-none group-hover:opacity-80 transition-opacity">
                GITSHOWCASE
              </h1>
            </div>
            <p className="text-[11px] font-serif-headline italic text-stone-600">
              ISU Cauayan Campus &bull; Student Developer &amp; Repository Hub
            </p>
          </div>
        </button>

        {/* Navigation & User Auth */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full md:w-auto">
          {/* Main Navigation Links */}
          <nav className="flex items-center space-x-1 text-xs font-headline font-bold uppercase tracking-wider">
            <button
              id="nav-front-page-btn"
              onClick={() => navigate('/')}
              className={`px-2.5 py-1.5 rounded-none transition-colors cursor-pointer ${
                currentRoute === '/' 
                  ? 'bg-[#1A1815] text-[#FAF8F2]' 
                  : 'text-stone-700 hover:bg-[#EBE7DC]'
              }`}
            >
              Front Page
            </button>

            <button
              id="nav-explore-btn"
              onClick={() => navigate('/explore')}
              className={`px-2.5 py-1.5 rounded-none transition-colors cursor-pointer flex items-center space-x-1.5 ${
                currentRoute === '/explore' 
                  ? 'bg-[#1A1815] text-[#FAF8F2]' 
                  : 'text-stone-700 hover:bg-[#EBE7DC]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>

            {user && (
              <button
                id="nav-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className={`px-2.5 py-1.5 rounded-none transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  currentRoute === '/dashboard' 
                    ? 'bg-[#1A1815] text-[#FAF8F2]' 
                    : 'text-stone-700 hover:bg-[#EBE7DC]'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>My Desk</span>
              </button>
            )}

            {user && profile?.github_username && (
              <button
                id="nav-my-profile-btn"
                onClick={() => navigate(`/u/${profile.github_username}`)}
                className={`px-2.5 py-1.5 rounded-none transition-colors cursor-pointer flex items-center space-x-1.5 ${
                  currentRoute === `/u/${profile.github_username}` 
                    ? 'bg-[#1A1815] text-[#FAF8F2]' 
                    : 'text-stone-700 hover:bg-[#EBE7DC]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Page</span>
              </button>
            )}
          </nav>

          <div className="h-4 w-px bg-[#D6D0C4] hidden sm:block"></div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2 bg-[#FAF8F2] text-[#1A1815] px-2.5 py-1 border border-[#1A1815] hover:bg-[#EBE7DC] transition-all font-headline text-xs uppercase tracking-wider cursor-pointer"
                >
                  <div className="w-4 h-4 border border-[#1A1815] bg-stone-300 overflow-hidden flex-shrink-0">
                    <img
                      src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt={profile?.github_username || 'Student Avatar'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="max-w-[100px] truncate font-mono text-[11px]">
                    @{profile?.github_username || 'student'}
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 bg-[#FAF8F2] border border-[#1A1815] shadow-md p-1.5 z-50 animate-in fade-in duration-100">
                    <div className="p-2 border-b border-[#D6D0C4] mb-1 bg-[#F4F0E6]">
                      <p className="text-xs font-bold font-headline uppercase text-[#1A1815] truncate">
                        {profile?.full_name || 'Student Author'}
                      </p>
                      <p className="text-[10px] font-mono text-stone-600 truncate">
                        @{profile?.github_username || 'isabela-coder'}
                      </p>
                      {isDemoMode && (
                        <span className="inline-block mt-1 text-[9px] font-mono bg-stone-200 border border-stone-400 px-1 py-0.2 uppercase">
                          Guest Mode
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Project Desk</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(`/u/${myUsername}`);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>View Public Page</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/explore');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Classmate Directory</span>
                    </button>

                    <div className="border-t border-[#D6D0C4] my-1"></div>

                    <button
                      id="signout-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                        navigate('/');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline text-stone-700 hover:bg-stone-200 flex items-center space-x-2 uppercase cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  id="demo-student-login-btn"
                  onClick={() => {
                    signInAsDemoStudent();
                    navigate('/dashboard');
                  }}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-[#FAF8F2] hover:bg-stone-200 text-[#1A1815] border border-[#1A1815] font-headline text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-stone-600" />
                  <span>Guest Demo</span>
                </button>

                <button
                  id="github-login-btn"
                  onClick={async () => {
                    await signInWithGitHub();
                    navigate('/dashboard');
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] font-headline text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5 text-white" />
                  <span>GitHub Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

