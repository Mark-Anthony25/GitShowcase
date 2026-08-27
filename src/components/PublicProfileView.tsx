import React, { useState, useEffect } from 'react';
import { 
  Github, Star, GitFork, ExternalLink, Calendar, BookOpen, 
  Share2, Check, ArrowLeft, Sparkles, Pin, Code2, Tag, 
  Globe, AlertCircle, RefreshCw, GraduationCap, Newspaper, User
} from 'lucide-react';
import { StudentShowcaseData, ShowcasedProject } from '../types';
import { getStudentShowcaseByUsername } from '../lib/showcaseStore';
import { CommitHeatmap } from './CommitHeatmap';

interface PublicProfileViewProps {
  username: string;
  navigate: (route: string) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ username, navigate }) => {
  const [data, setData] = useState<StudentShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    loadShowcase();
  }, [username]);

  const loadShowcase = async () => {
    setLoading(true);
    try {
      const res = await getStudentShowcaseByUsername(username);
      setData(res);
    } catch (err) {
      console.error('Error loading student showcase:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 paper-card bg-[#FEFCF6]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-700" />
        <h2 className="text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
          Preparing Student Chronicle...
        </h2>
        <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 font-bold">Retrieving published dispatches for @{username}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center space-y-4 paper-card bg-[#FEFCF6]">
        <div className="w-12 h-12 paper-card bg-[#FAF6EC] flex items-center justify-center mx-auto text-stone-700">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
            EDITION NOT FOUND
          </span>
          <h1 className="text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
            Student Profile Not Found
          </h1>
          <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
            No public chronicle has been published for <code className="bg-stone-200 text-stone-900 px-1 py-0.5 font-mono text-[11px] border border-stone-400 rounded-xs">@{username}</code> yet.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={() => navigate('/explore')}
            className="paper-button text-xs py-2 px-4 font-bold"
          >
            Explore Campus Register
          </button>
          <button
            onClick={() => navigate('/')}
            className="paper-button paper-button-dark text-xs py-2 px-4 font-bold"
          >
            Return to Front Page
          </button>
        </div>
      </div>
    );
  }

  const { profile, projects } = data;
  const featuredProjects = projects.filter(p => p.is_featured);
  const regularProjects = projects.filter(p => !p.is_featured);

  return (
    <div className="space-y-8 pb-12 text-[#212121]">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-[#212121] pb-3">
        <button
          onClick={() => navigate('/explore')}
          className="paper-button text-xs py-1.5 px-3 font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Directory</span>
        </button>

        <button
          id="share-profile-btn"
          onClick={handleShare}
          className="paper-button text-xs py-1.5 px-3.5 font-bold"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700 mr-1" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 mr-1" />
              <span>Share Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Profile Lead Story Masthead */}
      <div className="bg-[#FAF6EC] paper-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-4 border-b-2 border-dashed border-[#212121]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-18 h-18 sm:w-20 sm:h-20 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[3px_3px_0px_#212121]">
              <img
                src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={profile.full_name || profile.github_username}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                STUDENT DEVELOPER &bull; ISU CAUAYAN
              </span>
              <h1 className="text-2xl sm:text-3xl font-[900] uppercase font-newspaper-title text-[#212121]">
                {profile.full_name || profile.github_username}
              </h1>
              {profile.headline && (
                <p className="text-xs sm:text-sm font-headline uppercase tracking-wider text-stone-800 font-bold">
                  {profile.headline}
                </p>
              )}
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-serif-body text-stone-700 flex-wrap gap-y-1">
                <span className="font-mono font-bold text-stone-900">@{profile.github_username}</span>
                <span>&bull;</span>
                <span>{profile.program || 'Student Developer'}</span>
                {profile.year_level && (
                  <>
                    <span>&bull;</span>
                    <span>{profile.year_level}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <a
            href={`https://github.com/${profile.github_username}`}
            target="_blank"
            rel="noreferrer"
            className="paper-button paper-button-dark text-xs py-2 px-4 font-bold flex-shrink-0"
          >
            <Github className="w-3.5 h-3.5 mr-1.5" />
            <span>GitHub Profile</span>
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>

        {profile.bio && (
          <div className="bg-[#FEFCF6] p-4 paper-card border-dashed">
            <span className="text-[11px] font-sketch uppercase text-stone-700 block mb-1 font-bold">About Me</span>
            <p className="text-sm font-serif-body text-stone-900 leading-relaxed italic">
              "{profile.bio}"
            </p>
          </div>
        )}
      </div>

      {/* GitHub Commit Activity Heatmap Boxes */}
      <CommitHeatmap username={profile.github_username} />

      {/* Featured Projects Section */}
      {featuredProjects.length > 0 && (
        <section className="space-y-3">
          <div className="border-b-2 border-dashed border-[#212121] pb-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Star className="w-4 h-4 text-stone-800 fill-stone-800" />
              <h2 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
                Featured Capstones &amp; Projects
              </h2>
            </div>
            <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[10px] font-bold">PINNED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {featuredProjects.map(project => (
              <ProjectCard key={project.id} project={project} isFeatured />
            ))}
          </div>
        </section>
      )}

      {/* Regular / All Showcased Projects Section */}
      <section className="space-y-3">
        <div className="border-b-2 border-dashed border-[#212121] pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-stone-800" />
            <h2 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
              {featuredProjects.length > 0 ? 'Other Course Repositories' : 'Showcased Repositories'} ({projects.length})
            </h2>
          </div>
          <span className="paper-badge text-[10px] font-mono font-bold">ALL REPOS</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center paper-card bg-[#FEFCF6] border-dashed space-y-1">
            <p className="text-xs sm:text-sm font-serif-body text-stone-700">No project articles have been published in this edition yet.</p>
          </div>
        ) : regularProjects.length === 0 && featuredProjects.length > 0 ? (
          <p className="text-xs sm:text-sm font-serif-body italic text-stone-600">All showcased repositories are pinned in the lead dispatches above.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {regularProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface ProjectCardProps {
  project: ShowcasedProject;
  isFeatured?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, isFeatured = false }) => {
  const stats = project.live_stats;

  return (
    <div
      className={`p-5 paper-card transition-all flex flex-col justify-between space-y-4 ${
        isFeatured
          ? 'bg-[#FAF6EC]'
          : 'bg-[#FEFCF6]'
      }`}
    >
      <div className="space-y-2.5">
        {/* Header Badge / Star Counters */}
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-[#212121] pb-2.5">
          <div className="space-y-0.5">
            {isFeatured && (
              <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[10px] font-bold mb-1">
                <Pin className="w-2.5 h-2.5 mr-1 inline-block" />
                LEAD DISPATCH
              </span>
            )}
            <h3 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121] leading-snug">
              {project.custom_title || project.repo_full_name.split('/')[1]}
            </h3>
            <p className="text-xs font-mono text-stone-700">
              {project.repo_full_name}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-stone-800 bg-[#FAF6EC] border border-[#212121] px-2 py-0.5 flex-shrink-0 shadow-[1px_1px_0px_#212121] font-bold">
            <span className="flex items-center">
              <Star className="w-3 h-3 text-stone-700 mr-1" />
              <span>{stats ? stats.stars : 0}</span>
            </span>
            <span className="text-stone-400">&bull;</span>
            <span className="flex items-center">
              <GitFork className="w-3 h-3 mr-1" />
              <span>{stats ? stats.forks : 0}</span>
            </span>
          </div>
        </div>

        {/* Custom description (Student's voice / context) */}
        <p className="text-xs sm:text-sm font-serif-body text-stone-800 leading-relaxed">
          {project.custom_description || stats?.description || 'No description provided.'}
        </p>

        {/* Topics / Tags */}
        {stats && stats.topics && stats.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {stats.topics.slice(0, 4).map((topic, i) => (
              <span
                key={i}
                className="paper-badge text-[10px] font-mono"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Links & Metadata */}
      <div className="pt-3 border-t-2 border-dashed border-[#212121] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3 text-stone-800 font-bold">
          {stats?.language && (
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-stone-800"></span>
              <span>{stats.language}</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {stats?.homepage && (
            <a
              href={stats.homepage}
              target="_blank"
              rel="noreferrer"
              className="text-stone-800 hover:text-black underline flex items-center space-x-1 font-bold"
            >
              <Globe className="w-3 h-3 mr-0.5" />
              <span>Live System</span>
            </a>
          )}
          <a
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-stone-800 hover:text-black underline font-bold"
          >
            <Github className="w-3.5 h-3.5 mr-0.5" />
            <span>Source Code</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

