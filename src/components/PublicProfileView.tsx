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
      <div className="py-20 text-center space-y-3 bg-[#FAF8F2] border border-[#1A1815]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-700" />
        <h2 className="text-lg font-[900] uppercase font-newspaper-title text-[#1A1815]">
          Preparing Student Chronicle...
        </h2>
        <p className="text-xs font-mono uppercase tracking-wider text-stone-600">Retrieving published dispatches for @{username}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center space-y-4 bg-[#FAF8F2] border border-[#1A1815]">
        <div className="w-12 h-12 border border-[#1A1815] bg-[#F4F0E6] flex items-center justify-center mx-auto text-stone-700">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
            EDITION NOT FOUND
          </span>
          <h1 className="text-xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
            Student Profile Not Found
          </h1>
          <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
            No public chronicle has been published for <code className="bg-stone-200 text-stone-900 px-1 py-0.5 font-mono text-[11px]">@{username}</code> yet.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 bg-[#FAF8F2] text-[#1A1815] border border-[#1A1815] text-xs font-headline uppercase tracking-wider hover:bg-stone-200 transition-all cursor-pointer"
          >
            Explore Campus Register
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-[#1A1815] text-[#FAF8F2] text-xs font-headline uppercase tracking-wider hover:bg-stone-800 transition-all cursor-pointer"
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
    <div className="space-y-8 pb-12 text-[#1A1815]">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between border-b border-[#D6D0C4] pb-3">
        <button
          onClick={() => navigate('/explore')}
          className="inline-flex items-center space-x-1.5 text-xs font-headline uppercase tracking-wider text-stone-800 hover:text-black transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Directory</span>
        </button>

        <button
          id="share-profile-btn"
          onClick={handleShare}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#FAF8F2] hover:bg-[#F4F0E6] text-xs font-headline uppercase tracking-wider text-[#1A1815] transition-all border border-[#1A1815] cursor-pointer"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Profile</span>
            </>
          )}
        </button>
      </div>

      {/* Profile Lead Story Masthead */}
      <div className="bg-[#FAF8F2] border border-[#1A1815] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 pb-4 border-b border-[#D6D0C4]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border border-[#1A1815] overflow-hidden bg-stone-300 flex-shrink-0">
              <img
                src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={profile.full_name || profile.github_username}
                className="w-full h-full object-cover news-photo"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
                STUDENT DEVELOPER &bull; ISU CAUAYAN
              </span>
              <h1 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
                {profile.full_name || profile.github_username}
              </h1>
              {profile.headline && (
                <p className="text-xs font-headline uppercase tracking-wider text-stone-800 font-semibold">
                  {profile.headline}
                </p>
              )}
              <div className="flex items-center space-x-2 text-xs font-serif-headline italic text-stone-700 flex-wrap gap-y-1">
                <span className="font-mono not-italic text-stone-800">@{profile.github_username}</span>
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
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Profile</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        {profile.bio && (
          <div className="bg-[#F4F0E6] p-3 border border-stone-300">
            <span className="text-[10px] font-mono uppercase text-stone-600 block mb-0.5">About Me</span>
            <p className="text-xs sm:text-sm font-serif-body text-stone-900 leading-relaxed italic">
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
          <div className="border-b border-[#1A1815] pb-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Star className="w-4 h-4 text-stone-800 fill-stone-800" />
              <h2 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                Featured Capstones &amp; Projects
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase text-stone-600">PINNED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredProjects.map(project => (
              <ProjectCard key={project.id} project={project} isFeatured />
            ))}
          </div>
        </section>
      )}

      {/* Regular / All Showcased Projects Section */}
      <section className="space-y-3">
        <div className="border-b border-[#1A1815] pb-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <Newspaper className="w-4 h-4 text-stone-800" />
            <h2 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
              {featuredProjects.length > 0 ? 'Other Course Repositories' : 'Showcased Repositories'} ({projects.length})
            </h2>
          </div>
          <span className="text-[10px] font-mono uppercase text-stone-600">ALL REPOS</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-[#1A1815] bg-[#FAF8F2] space-y-1">
            <p className="text-xs font-serif-body text-stone-700">No project articles have been published in this edition yet.</p>
          </div>
        ) : regularProjects.length === 0 && featuredProjects.length > 0 ? (
          <p className="text-xs font-serif-body italic text-stone-600">All showcased repositories are pinned in the lead dispatches above.</p>
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
      className={`p-5 border transition-all flex flex-col justify-between space-y-4 ${
        isFeatured
          ? 'bg-[#F4F0E6] border-[#1A1815] border-2 shadow-xs'
          : 'bg-[#FAF8F2] border-[#1A1815]'
      }`}
    >
      <div className="space-y-2.5">
        {/* Header Badge / Star Counters */}
        <div className="flex items-start justify-between gap-3 border-b border-[#D6D0C4] pb-2.5">
          <div className="space-y-0.5">
            {isFeatured && (
              <span className="inline-flex items-center text-[9px] font-headline font-bold uppercase tracking-wider text-stone-900 bg-stone-300 border border-stone-500 px-1.5 py-0.5 mb-1">
                <Pin className="w-2.5 h-2.5 mr-1" />
                LEAD DISPATCH
              </span>
            )}
            <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815] leading-snug">
              {project.custom_title || project.repo_full_name.split('/')[1]}
            </h3>
            <p className="text-xs font-mono text-stone-600">
              {project.repo_full_name}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-stone-800 bg-[#FAF8F2] border border-stone-400 px-2 py-0.5 flex-shrink-0">
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
        <p className="text-xs font-serif-body text-stone-800 leading-relaxed">
          {project.custom_description || stats?.description || 'No description provided.'}
        </p>

        {/* Topics / Tags */}
        {stats && stats.topics && stats.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {stats.topics.slice(0, 4).map((topic, i) => (
              <span
                key={i}
                className="text-[10px] font-mono uppercase px-1.5 py-0.2 bg-[#EBE7DC] text-stone-800 border border-stone-300"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Links & Metadata */}
      <div className="pt-3 border-t border-[#D6D0C4] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-3 text-stone-800">
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
              className="text-stone-800 hover:text-black underline flex items-center space-x-1"
            >
              <Globe className="w-3 h-3" />
              <span>Live System</span>
            </a>
          )}
          <a
            href={project.repo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 text-stone-800 hover:text-black underline"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Source Code</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>
      </div>
    </div>
  );
};

