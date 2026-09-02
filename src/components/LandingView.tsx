import React, { useState, useEffect } from 'react';
import { 
  Github, Sparkles, ArrowRight, Star, 
  Compass, LayoutDashboard,
  ArrowUpRight, AlertTriangle, X,
  User, FolderGit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAllStudentsShowcase } from '../lib/showcaseStore';

interface LandingViewProps {
  navigate: (route: string) => void;
  onOpenGuide: () => void;
}

interface ProjectPreviewItem {
  id: string;
  title: string;
  repo: string;
  author: string;
  badge: string;
  desc: string;
  stars: number;
  url: string;
}

export const LandingView: React.FC<LandingViewProps> = ({ navigate, onOpenGuide }) => {
  const { user, signInWithGitHub, authError, clearAuthError } = useAuth();
  const [previewProjects, setPreviewProjects] = useState<ProjectPreviewItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const handleGitHubSignIn = async () => {
    try {
      await signInWithGitHub();
    } catch (err: any) {
      if (err?.message === 'CONFIG_REQUIRED') {
        onOpenGuide();
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProjects = (force = false) => {
      getAllStudentsShowcase(undefined, force).then((students) => {
        if (!isMounted) return;
        if (!students || students.length === 0) {
          setPreviewProjects([]);
          setLoadingProjects(false);
          return;
        }
        const collected: ProjectPreviewItem[] = [];
        for (const s of students) {
          for (const p of s.projects) {
            collected.push({
              id: p.id,
              title: p.custom_title || p.repo_full_name.split('/')[1] || p.repo_full_name,
              repo: p.repo_full_name,
              author: s.profile.github_username,
              badge: 'PROJECT',
              desc: p.custom_description || p.live_stats?.description || 'Student repository project showcased on GitShowcase.',
              stars: p.live_stats?.stars ?? 0,
              url: p.repo_url,
            });
          }
        }
        setPreviewProjects(collected);
        setLoadingProjects(false);
      }).catch(() => {
        if (isMounted) setLoadingProjects(false);
      });
    };

    loadProjects(false);

    return () => {
      isMounted = false;
    };
  }, []);


  return (
    <div className="space-y-5 sm:space-y-7 pb-8 sm:pb-10 text-[#212121] w-full max-w-full">
      {/* Auth Error Banner if OAuth exchange failed */}
      {authError && (
        <div className="paper-card p-4 bg-rose-50 border-2 border-rose-600 shadow-[4px_4px_0px_#be123c] animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0 stroke-[2]" />
              <div>
                <h4 className="font-newspaper-title font-[900] uppercase text-sm text-rose-950">
                  GitHub Authentication Notice
                </h4>
                <p className="text-xs font-serif-body text-rose-900 mt-1 leading-relaxed">
                  {authError}
                </p>
                <div className="mt-2 text-[11px] font-mono text-rose-800">
                  Tip: In GitHub OAuth App, click "Generate a new client secret", copy it, and paste it into Supabase Dashboard &gt; Authentication &gt; Providers &gt; GitHub.
                </div>
              </div>
            </div>
            <button
              onClick={clearAuthError}
              className="paper-button-icon min-w-[32px] min-h-[32px] p-1 text-rose-800 hover:text-black cursor-pointer flex-shrink-0"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="paper-card p-4 sm:p-6 lg:p-8 xl:p-9 space-y-3 sm:space-y-4 lg:space-y-5 bg-[#FEFCF6]">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
          <div className="space-y-2 sm:space-y-2.5 max-w-xl lg:max-w-2xl xl:max-w-3xl min-w-0">
            <span className="paper-badge text-[9px] sm:text-[10px] lg:text-xs font-sketch uppercase tracking-wider text-stone-800 font-bold bg-[#EFE9DB]">
              Explore. Build. Collab
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.65rem] font-[900] uppercase font-newspaper-title tracking-tight text-[#212121] leading-tight break-words">
              Discover Student Projects
            </h2>
            <p className="text-xs sm:text-sm lg:text-base font-serif-body text-[#212121] font-semibold sm:font-medium leading-relaxed">
              GitShowcase is a GitHub-connected portfolio and collaboration platform for Isabela State University and its alumni. <strong className="font-bold">Explore</strong> projects from past students, <strong className="font-bold">build</strong> and showcase your own work, and <strong className="font-bold">collab</strong> with others across class years.
            </p>
          </div>

          {/* Quick Action Button Box */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 sm:gap-3 w-full lg:w-auto flex-shrink-0 min-w-0">
            {user ? (
              <button
                id="hero-go-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="paper-button paper-button-dark text-xs lg:text-sm py-2 lg:py-2.5 px-4 font-bold justify-center min-h-[38px] lg:min-h-[42px]"
              >
                <FolderGit2 className="w-4 h-4 mr-1.5 flex-shrink-0 stroke-[2]" />
                <span>Go to My Projects</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 flex-shrink-0 stroke-[2]" />
              </button>
            ) : (
              <>
                <button
                  id="hero-browse-btn"
                  onClick={() => navigate('/explore')}
                  className="paper-button paper-button-dark text-xs lg:text-sm py-2 lg:py-2.5 px-4 text-white justify-center min-h-[38px] lg:min-h-[42px] font-bold"
                >
                  <Compass className="w-4 h-4 mr-1.5 flex-shrink-0 stroke-[2]" />
                  <span>Browse Projects</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5 flex-shrink-0 stroke-[2]" />
                </button>

                <button
                  id="hero-github-signin-btn"
                  onClick={handleGitHubSignIn}
                  className="paper-button text-xs lg:text-sm py-2 lg:py-2.5 px-4 justify-center min-h-[38px] lg:min-h-[42px] font-bold text-[#212121] bg-[#FEFCF6]"
                >
                  <Github className="w-3.5 h-3.5 text-[#212121] mr-1.5 flex-shrink-0 stroke-[2]" />
                  <span>Sign In with GitHub</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Real Student Projects Preview Strip */}
      <section className="space-y-2.5 sm:space-y-3.5">
        <div className="border-b border-dashed border-[#212121] pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <FolderGit2 className="w-4 h-4 text-[#212121] stroke-[2] flex-shrink-0" />
            <h3 className="text-sm sm:text-base lg:text-lg font-[900] uppercase font-newspaper-title text-[#212121] truncate">
              Latest Student Dispatches
            </h3>
          </div>
          {previewProjects.length > 0 && (
            <button
              onClick={() => navigate('/explore')}
              className="text-[11px] sm:text-xs lg:text-sm font-headline uppercase tracking-wider text-stone-800 hover:text-black underline cursor-pointer font-bold flex-shrink-0 ml-2"
            >
              Browse All Projects ({previewProjects.length}) &rarr;
            </button>
          )}
        </div>

        {loadingProjects ? (
          <div className="p-8 text-center paper-card bg-[#FEFCF6]">
            <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 font-bold">
              Loading dispatches...
            </p>
          </div>
        ) : previewProjects.length === 0 ? (
          <div className="p-8 text-center paper-card bg-[#FEFCF6] border-dashed space-y-2">
            <FolderGit2 className="w-8 h-8 text-stone-500 mx-auto" />
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121]">
              No student projects published yet
            </h4>
            <p className="text-xs font-serif-body text-stone-600 max-w-md mx-auto">
              Sign in with your GitHub account to publish and showcase your capstones and repositories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
            {previewProjects.slice(0, 4).map((proj) => (
              <div
                key={proj.id}
                className="p-3 sm:p-3.5 paper-card bg-[#FAF6EC] flex flex-col justify-between space-y-2 hover:bg-[#FAF8F2] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1 text-[9px]">
                    <span className="text-[10px] font-mono text-stone-600 truncate max-w-[130px]">
                      {proj.repo.split('/')[1] || proj.repo}
                    </span>
                    <div className="flex items-center space-x-1 text-stone-800 font-mono text-[10px] font-bold flex-shrink-0 ml-auto">
                      <Star className="w-3 h-3 text-[#212121] stroke-[2]" />
                      <span>{proj.stars}</span>
                    </div>
                  </div>

                  <h4 className="text-xs sm:text-sm font-[900] uppercase font-newspaper-title text-[#212121] leading-snug">
                    {proj.title}
                  </h4>
                  <p className="text-[11.5px] sm:text-xs font-serif-body text-[#212121] font-semibold sm:font-medium leading-relaxed">
                    {proj.desc}
                  </p>
                </div>

                <div className="pt-1.5 border-t border-dashed border-[#212121]/50 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => navigate(`/u/${proj.author}`)}
                    className="text-stone-800 hover:text-black font-headline uppercase tracking-wider underline cursor-pointer flex items-center space-x-1 font-bold truncate max-w-[150px]"
                  >
                    <span>@{proj.author}</span>
                  </button>
                  <a
                    href={proj.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-700 hover:text-black flex items-center space-x-0.5 font-mono text-[10px] font-bold cursor-pointer"
                    title="View GitHub Repository"
                  >
                    <span>Repo</span>
                    <ArrowUpRight className="w-3 h-3 flex-shrink-0 stroke-[2]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3 Step Workflow Cards */}
      <section className="space-y-3">
        <div className="border-b border-dashed border-[#212121] pb-1.5 flex items-center justify-between">
          <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
            How It Works
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5 md:gap-4">
          <div className="p-3 sm:p-4 paper-card bg-[#FEFCF6] space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[9px] font-bold">
                STEP 01
              </span>
              <div className="w-6 h-6 rounded-xs border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center shadow-[1px_1px_0px_#212121]">
                <Github className="w-3.5 h-3.5 text-[#212121] stroke-[2]" />
              </div>
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121] break-words">
              1. Sign in with GitHub
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-[#212121] font-semibold sm:font-medium leading-relaxed">
              Connect your GitHub account to get started.
            </p>
          </div>

          <div className="p-3 sm:p-4 paper-card bg-[#FEFCF6] space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[9px] font-bold">
                STEP 02
              </span>
              <div className="w-6 h-6 rounded-xs border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center shadow-[1px_1px_0px_#212121]">
                <User className="w-3.5 h-3.5 text-[#212121] stroke-[2]" />
              </div>
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121] break-words">
              2. Set Up Your Profile
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-[#212121] font-semibold sm:font-medium leading-relaxed">
              Add your name, program, and a short introduction about yourself.
            </p>
          </div>

          <div className="p-3 sm:p-4 paper-card bg-[#FEFCF6] space-y-2 min-w-0">
            <div className="flex items-center justify-between">
              <span className="paper-badge bg-[#212121] text-[#FEFCF6] text-[9px] font-bold">
                STEP 03
              </span>
              <div className="w-6 h-6 rounded-xs border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center shadow-[1px_1px_0px_#212121]">
                <FolderGit2 className="w-3.5 h-3.5 text-[#212121] stroke-[2]" />
              </div>
            </div>
            <h4 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121] break-words">
              3. Add Your Projects
            </h4>
            <p className="text-xs sm:text-sm font-serif-body text-[#212121] font-semibold sm:font-medium leading-relaxed">
              Select which repositories to showcase and publish them instantly to your public profile.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
