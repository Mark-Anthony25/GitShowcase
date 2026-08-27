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
    <header className="w-full bg-[#FEFCF6] border-2 border-[#212121] text-[#212121] select-none paper-card p-2 sm:p-3 mb-4">
      {/* Top Utility Bar */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-dashed border-[#212121] px-2 py-1 text-[11px] font-sketch uppercase tracking-wider text-stone-700 bg-[#FAF6EC]">
        <span>Isabela State University &bull; Cauayan Campus</span>
        <span className="hidden md:inline font-bold">{getFormattedDate()}</span>
        <span className="font-bold">Student Project Showcase</span>
      </div>

      {/* Main Brand Title & Nav Bar */}
      <div className="py-2.5 px-2 sm:px-4 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Brand / Logo */}
        <button
          id="masthead-home-btn"
          onClick={() => navigate('/')}
          className="text-left group cursor-pointer flex items-center space-x-3"
        >
          <div className="w-10 h-10 border-2 border-[#212121] bg-[#212121] text-[#FAF8F2] flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_#212121] rounded-sm">
            <Github className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-[900] tracking-tight uppercase font-newspaper-title text-[#212121] leading-none group-hover:opacity-80 transition-opacity">
                GITSHOWCASE
              </h1>
            </div>
            <p className="text-[12px] font-sketch text-stone-700 font-semibold">
              ISU Cauayan Campus &bull; Student Developer &amp; Repository Hub
            </p>
          </div>
        </button>

        {/* Navigation & User Auth */}
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full md:w-auto">
          {/* Main Navigation Links */}
          <nav className="flex items-center space-x-1.5 text-xs font-headline font-bold uppercase tracking-wider">
            <button
              id="nav-front-page-btn"
              onClick={() => navigate('/')}
              className={`px-3 py-1 border-2 border-[#212121] transition-all cursor-pointer font-bold ${
                currentRoute === '/' 
                  ? 'bg-[#212121] text-[#FEFCF6] shadow-[2px_2px_0px_#000]' 
                  : 'bg-[#FEFCF6] text-[#212121] hover:bg-[#EBE7DC] shadow-[1px_1px_0px_#212121]'
              }`}
            >
              Front Page
            </button>

            <button
              id="nav-explore-btn"
              onClick={() => navigate('/explore')}
              className={`px-3 py-1 border-2 border-[#212121] transition-all cursor-pointer flex items-center space-x-1.5 font-bold ${
                currentRoute === '/explore' 
                  ? 'bg-[#212121] text-[#FEFCF6] shadow-[2px_2px_0px_#000]' 
                  : 'bg-[#FEFCF6] text-[#212121] hover:bg-[#EBE7DC] shadow-[1px_1px_0px_#212121]'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Directory</span>
            </button>

            {user && (
              <button
                id="nav-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className={`px-3 py-1 border-2 border-[#212121] transition-all cursor-pointer flex items-center space-x-1.5 font-bold ${
                  currentRoute === '/dashboard' 
                    ? 'bg-[#212121] text-[#FEFCF6] shadow-[2px_2px_0px_#000]' 
                    : 'bg-[#FEFCF6] text-[#212121] hover:bg-[#EBE7DC] shadow-[1px_1px_0px_#212121]'
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
                className={`px-3 py-1 border-2 border-[#212121] transition-all cursor-pointer flex items-center space-x-1.5 font-bold ${
                  currentRoute === `/u/${profile.github_username}` 
                    ? 'bg-[#212121] text-[#FEFCF6] shadow-[2px_2px_0px_#000]' 
                    : 'bg-[#FEFCF6] text-[#212121] hover:bg-[#EBE7DC] shadow-[1px_1px_0px_#212121]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Page</span>
              </button>
            )}
          </nav>

          <div className="h-5 w-0.5 bg-[#212121] hidden sm:block"></div>

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="relative">
                <button
                  id="user-menu-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="paper-button flex items-center space-x-2 py-1 px-2.5 text-xs font-bold uppercase cursor-pointer"
                >
                  <div className="w-5 h-5 border border-[#212121] bg-stone-300 overflow-hidden flex-shrink-0 rounded-xs">
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
                  <div className="absolute right-0 mt-1.5 w-56 bg-[#FEFCF6] border-2 border-[#212121] shadow-[4px_4px_0px_#212121] p-2 z-50 animate-in fade-in duration-100 paper-card">
                    <div className="p-2 border-b-2 border-dashed border-[#212121] mb-1 bg-[#FAF6EC]">
                      <p className="text-xs font-bold font-headline uppercase text-[#212121] truncate">
                        {profile?.full_name || 'Student Author'}
                      </p>
                      <p className="text-[11px] font-mono text-stone-700 truncate">
                        @{profile?.github_username || 'isabela-coder'}
                      </p>
                      {isDemoMode && (
                        <span className="paper-badge mt-1 text-[10px]">
                          Guest Mode
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/dashboard');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Project Desk</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate(`/u/${myUsername}`);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>View Public Page</span>
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/explore');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline hover:bg-[#EAE4D4] flex items-center space-x-2 uppercase cursor-pointer font-bold"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Classmate Directory</span>
                    </button>

                    <div className="border-t-2 border-dashed border-[#212121] my-1"></div>

                    <button
                      id="signout-btn"
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut();
                        navigate('/');
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs font-headline text-red-700 hover:bg-red-50 flex items-center space-x-2 uppercase cursor-pointer font-bold"
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
                  className="paper-button text-xs py-1.5 px-3 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-stone-700 mr-1" />
                  <span>Guest Demo</span>
                </button>

                <button
                  id="github-login-btn"
                  onClick={async () => {
                    await signInWithGitHub();
                    navigate('/dashboard');
                  }}
                  className="paper-button paper-button-dark text-xs py-1.5 px-3.5 font-bold cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5 text-white mr-1.5" />
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

