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
    <div className="space-y-8 pb-12 text-[#1A1815]">
      {/* Hero Welcome Banner */}
      <section className="bg-[#FAF8F2] border border-[#1A1815] p-6 sm:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-stone-600 bg-[#EBE7DC] px-2 py-0.5 border border-stone-300 font-bold">
              ISU Cauayan Computing Registry &bull; GitShowcase
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-[900] uppercase font-newspaper-title tracking-tight text-[#1A1815] leading-tight">
              Showcase Your Code, Repositories &amp; Commit History
            </h2>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
              A portfolio platform for Isabela State University - Cauayan Campus. Sign in with your GitHub account, set up your developer headline and 50-character bio, pick which repositories to showcase, and display your GitHub commit boxes with an authentic portfolio theme.
            </p>
          </div>

          {/* Quick Action Button Box */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 flex-shrink-0 min-w-[220px]">
            {user ? (
              <button
                id="hero-go-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] font-headline text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Project Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  id="hero-github-login-btn"
                  onClick={async () => {
                    await signInWithGitHub();
                    navigate('/dashboard');
                  }}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] font-headline text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                >
                  <Github className="w-4 h-4 text-white" />
                  <span>Sign In with GitHub</span>
                </button>

                <button
                  id="hero-demo-login-btn"
                  onClick={() => {
                    signInAsDemoStudent();
                    navigate('/dashboard');
                  }}
                  className="inline-flex items-center justify-center space-x-2 px-4 py-2 bg-[#FAF8F2] hover:bg-stone-200 text-[#1A1815] border border-[#1A1815] font-headline text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-stone-600" />
                  <span>Try Demo as Student</span>
                </button>
              </>
            )}

            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-headline uppercase tracking-wider text-stone-700 hover:text-black border border-stone-300 hover:border-black bg-white transition-all cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Browse Student Directory</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 Step Workflow Cards */}
      <section className="space-y-3">
        <div className="border-b border-[#1A1815] pb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
            How GitShowcase Works
          </h3>
          <span className="text-[10px] font-mono uppercase text-stone-600">ONBOARDING FLOW</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#FAF8F2] border border-[#1A1815] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold bg-[#1A1815] text-white px-1.5 py-0.5">
                STEP 01
              </span>
              <Github className="w-4 h-4 text-stone-600" />
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
              1. Sign in with GitHub
            </h4>
            <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
              Connect your account securely to access your public repositories, languages, and 52-week commit activity.
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F2] border border-[#1A1815] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold bg-[#1A1815] text-white px-1.5 py-0.5">
                STEP 02
              </span>
              <Pin className="w-4 h-4 text-stone-600" />
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
              2. Set Up Profile &amp; Bio
            </h4>
            <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
              Configure your username, headline (e.g. BSCS Full-Stack Dev), and a crisp 50-character bio summary.
            </p>
          </div>

          <div className="p-4 bg-[#FAF8F2] border border-[#1A1815] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold bg-[#1A1815] text-white px-1.5 py-0.5">
                STEP 03
              </span>
              <Users className="w-4 h-4 text-stone-600" />
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
              3. Choose Repos &amp; Heatmap
            </h4>
            <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
              Select which repos to display, pin your lead capstone, and get your GitHub commit boxes rendered on your public portfolio page.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Student Capstones Spotlight */}
      <section className="space-y-3">
        <div className="border-b border-[#1A1815] pb-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-stone-800 fill-stone-800" />
            <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
              Featured Student Capstones
            </h3>
          </div>
          <button
            onClick={() => navigate('/explore')}
            className="text-xs font-headline uppercase tracking-wider text-stone-700 hover:text-black underline cursor-pointer"
          >
            View All Projects &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1 */}
          <div className="p-4 bg-[#FAF8F2] border border-[#1A1815] flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono uppercase bg-[#EBE7DC] border border-stone-300 px-1.5 py-0.2 text-stone-800 font-semibold">
                  CAMPUS UTILITY
                </span>
                <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-700">
                  <span className="flex items-center"><Star className="w-3 h-3 text-stone-800 mr-1" /> 24</span>
                  <span className="flex items-center"><GitFork className="w-3 h-3 text-stone-800 mr-1" /> 5</span>
                </div>
              </div>

              <h4 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                Campus Navigator &amp; Event Hub
              </h4>
              <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
                Interactive campus map and real-time seminar schedule manager with offline support for students and visitors.
              </p>
            </div>

            <div className="pt-2 border-t border-[#D6D0C4] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-600">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>TypeScript / React</span>
              </div>
              <button
                onClick={() => navigate('/u/isabela-coder')}
                className="text-stone-800 hover:text-black font-headline text-xs uppercase tracking-wider underline cursor-pointer flex items-center space-x-1"
              >
                <span>By @isabela-coder</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 bg-[#FAF8F2] border border-[#1A1815] flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono uppercase bg-[#EBE7DC] border border-stone-300 px-1.5 py-0.2 text-stone-800 font-semibold">
                  CAPSTONE PROJECT
                </span>
                <div className="flex items-center space-x-2 font-mono text-[11px] text-stone-700">
                  <span className="flex items-center"><Star className="w-3 h-3 text-stone-800 mr-1" /> 58</span>
                  <span className="flex items-center"><GitFork className="w-3 h-3 text-stone-800 mr-1" /> 12</span>
                </div>
              </div>

              <h4 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                AI Code Reviewer Engine
              </h4>
              <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
                Automated pull-request scanner that checks coding standards, security vulnerabilities, and logic flaws prior to thesis defense.
              </p>
            </div>

            <div className="pt-2 border-t border-[#D6D0C4] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-1.5 text-[11px] font-mono text-stone-600">
                <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                <span>Rust / Node.js</span>
              </div>
              <button
                onClick={() => navigate('/u/isabela-coder')}
                className="text-stone-800 hover:text-black font-headline text-xs uppercase tracking-wider underline cursor-pointer flex items-center space-x-1"
              >
                <span>By @isabela-coder</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Classmate Directory Quick Jump */}
      <section className="bg-[#F4F0E6] border border-[#1A1815] p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
              Explore Classmate Portfolios
            </h3>
            <p className="text-xs font-serif-body text-stone-700">
              Discover student developers from BS Computer Science, BS Information Technology, and Engineering programs.
            </p>
          </div>

          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer flex-shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open Classmate Directory</span>
          </button>
        </div>
      </section>
    </div>
  );
};
