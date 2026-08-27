import React from 'react';
import { 
  Github, Sparkles, ArrowRight, Star, GitFork, ExternalLink, 
  Users, Compass, Code2, Pin, CheckCircle2, LayoutDashboard,
  GraduationCap, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingViewProps {
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ navigate }) => {
  const { user, signInWithGitHub, signInAsDemoStudent } = useAuth();

  return (
    <div className="space-y-8 pb-10 text-[#212121]">
      {/* Hero Welcome Banner */}
      <section className="paper-card p-6 sm:p-8 space-y-5 bg-[#FEFCF6]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="paper-badge text-[11px] font-sketch uppercase tracking-wider text-stone-800 font-bold bg-[#EFE9DB]">
              ISU Cauayan Computing Registry &bull; GitShowcase
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-[900] uppercase font-newspaper-title tracking-tight text-[#212121] leading-tight">
              Showcase Your Code, Repositories &amp; Commit History
            </h2>
            <p className="text-sm sm:text-base font-serif-body text-stone-700 leading-relaxed">
              A portfolio platform for Isabela State University - Cauayan Campus. Sign in with your GitHub account, set up your developer headline and 50-character bio, pick which repositories to showcase, and display your GitHub commit boxes with an authentic PaperCSS theme.
            </p>
          </div>

          {/* Quick Action Button Box */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 flex-shrink-0 min-w-[220px]">
            {user ? (
              <button
                id="hero-go-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="paper-button paper-button-dark text-xs py-2.5 px-4 font-bold"
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                <span>Go to Project Desk</span>
                <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </button>
            ) : (
              <>
                <button
                  id="hero-github-login-btn"
                  onClick={async () => {
                    await signInWithGitHub();
                    navigate('/dashboard');
                  }}
                  className="paper-button paper-button-dark text-xs py-2.5 px-4 font-bold"
                >
                  <Github className="w-4 h-4 text-white mr-2" />
                  <span>Sign In with GitHub</span>
                </button>

                <button
                  id="hero-demo-login-btn"
                  onClick={() => {
                    signInAsDemoStudent();
                    navigate('/dashboard');
                  }}
                  className="paper-button text-xs py-2 px-4"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-700 mr-1.5" />
                  <span>Try Demo as Student</span>
                </button>
              </>
            )}

            <button
              onClick={() => navigate('/explore')}
              className="paper-button text-xs py-2 px-3 text-stone-700"
            >
              <Compass className="w-3.5 h-3.5 mr-1.5" />
              <span>Browse Student Directory</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 Step Workflow Cards */}
      <section className="space-y-4">
        <div className="border-b-2 border-dashed border-[#212121] pb-2 flex items-center justify-between">
          <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
            How GitShowcase Works
          </h3>
          <span className="paper-badge text-[10px]">ONBOARDING FLOW</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 paper-card bg-[#FEFCF6] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[10px] font-bold">
                STEP 01
              </span>
              <Github className="w-4 h-4 text-stone-700" />
            </div>
            <h4 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
              1. Sign in with GitHub
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
              Connect your account securely to access your public repositories, languages, and 52-week commit activity.
            </p>
          </div>

          <div className="p-5 paper-card bg-[#FEFCF6] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[10px] font-bold">
                STEP 02
              </span>
              <Pin className="w-4 h-4 text-stone-700" />
            </div>
            <h4 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
              2. Set Up Profile &amp; Bio
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
              Configure your username, headline (e.g. BSCS Full-Stack Dev), and a crisp 50-character bio summary.
            </p>
          </div>

          <div className="p-5 paper-card bg-[#FEFCF6] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[10px] font-bold">
                STEP 03
              </span>
              <Users className="w-4 h-4 text-stone-700" />
            </div>
            <h4 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
              3. Choose Repos &amp; Heatmap
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
              Select which repos to display, pin your lead capstone, and get your GitHub commit boxes rendered on your public portfolio page.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Student Capstones Spotlight */}
      <section className="space-y-4">
        <div className="border-b-2 border-dashed border-[#212121] pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-stone-800 fill-stone-800" />
            <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
              Featured Student Capstones
            </h3>
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="text-xs font-headline uppercase tracking-wider text-stone-800 hover:text-black underline cursor-pointer font-bold"
          >
            View All Projects &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1 */}
          <div className="p-5 paper-card bg-[#FEFCF6] flex flex-col justify-between space-y-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="paper-badge text-[10px] font-bold">
                  CAMPUS UTILITY
                </span>
                <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-700">
                  <span className="flex items-center"><Star className="w-3 h-3 text-stone-800 mr-1" /> 24</span>
                  <span className="flex items-center"><GitFork className="w-3 h-3 text-stone-800 mr-1" /> 5</span>
                </div>
              </div>

              <h4 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                Campus Navigator &amp; Event Hub
              </h4>
              <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
                Interactive campus map and real-time seminar schedule manager with offline support for students and visitors.
              </p>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-[#212121] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-[#212121]"></span>
                <span>TypeScript / React</span>
              </div>
              <button
                onClick={() => navigate('/u/isabela-coder')}
                className="text-stone-800 hover:text-black font-headline text-xs uppercase tracking-wider underline cursor-pointer flex items-center space-x-1 font-bold"
              >
                <span>By @isabela-coder</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 paper-card bg-[#FEFCF6] flex flex-col justify-between space-y-3.5">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="paper-badge text-[10px] font-bold">
                  CAPSTONE PROJECT
                </span>
                <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-700">
                  <span className="flex items-center"><Star className="w-3 h-3 text-stone-800 mr-1" /> 58</span>
                  <span className="flex items-center"><GitFork className="w-3 h-3 text-stone-800 mr-1" /> 12</span>
                </div>
              </div>

              <h4 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                AI Code Reviewer Engine
              </h4>
              <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
                Automated pull-request scanner that checks coding standards, security vulnerabilities, and logic flaws prior to thesis defense.
              </p>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-[#212121] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-700 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 border border-[#212121]"></span>
                <span>Rust / Node.js</span>
              </div>
              <button
                onClick={() => navigate('/u/isabela-coder')}
                className="text-stone-800 hover:text-black font-headline text-xs uppercase tracking-wider underline cursor-pointer flex items-center space-x-1 font-bold"
              >
                <span>By @isabela-coder</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Classmate Directory Quick Jump */}
      <section className="paper-card bg-[#FAF6EC] p-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
              Explore Classmate Portfolios
            </h3>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700">
              Discover student developers from BS Computer Science, BS Information Technology, and Engineering programs.
            </p>
          </div>

          <button
            onClick={() => navigate('/explore')}
            className="paper-button paper-button-dark text-xs py-2 px-4 self-start sm:self-auto flex-shrink-0 font-bold"
          >
            <Compass className="w-4 h-4 mr-1.5" />
            <span>Open Classmate Directory</span>
          </button>
        </div>
      </section>
    </div>
  );
};
