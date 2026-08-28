import React, { useState, useEffect } from 'react';
import { 
  Github, Star, GitFork, ExternalLink, Calendar, BookOpen, 
  Share2, Check, ArrowLeft, Sparkles, Pin, Code2, Tag, 
  Globe, AlertCircle, RefreshCw, GraduationCap, Newspaper, User,
  X, ArrowUpRight
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
  const [selectedProject, setSelectedProject] = useState<ShowcasedProject | null>(null);

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
          Loading profile...
        </h2>
        <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 font-bold">Loading projects...</p>
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
          <h1 className="text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
            Student Profile Not Found
          </h1>
          <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
            This profile hasn't been set up yet.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={() => navigate('/explore')}
            className="paper-button text-xs py-2 px-4 font-bold"
          >
            Browse Projects
          </button>
          <button
            onClick={() => navigate('/')}
            className="paper-button paper-button-dark text-xs py-2 px-4 font-bold"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const { profile, projects } = data;
  const featuredProjects = projects.filter(p => p.is_featured);
  const regularProjects = projects.filter(p => !p.is_featured);

  return (
    <>
      <div className="space-y-5 sm:space-y-6 pb-8 text-[#212121]">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-dashed border-[#212121] pb-2 gap-2">
          <button
            onClick={() => navigate('/explore')}
            className="paper-button text-xs py-1.5 px-3 font-bold min-h-[34px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
            <span>Back to Browse</span>
          </button>

          <button
            id="share-profile-btn"
            onClick={handleShare}
            className="paper-button text-xs py-1.5 px-3 font-bold min-h-[34px]"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700 mr-1 flex-shrink-0" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>

        {/* Responsive Two-Column Layout on Desktop */}
        <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-5 lg:gap-6 w-full">
          {/* Left Column: Sidebar Profile Identity & Bio */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 lg:sticky lg:top-4">
            <div className="bg-[#FAF6EC] paper-card p-3.5 sm:p-5 space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[2px_2px_0px_#212121]">
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt={profile.full_name || profile.github_username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121] truncate leading-tight">
                    {profile.full_name || profile.github_username}
                  </h1>
                  <p className="text-xs font-mono font-bold text-stone-800 truncate">
                    @{profile.github_username}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-dashed border-[#212121]">
                {profile.headline && (
                  <p className="text-xs sm:text-sm font-headline uppercase tracking-wider text-stone-800 font-bold">
                    {profile.headline}
                  </p>
                )}
                <div className="flex items-center space-x-1.5 text-xs font-serif-body text-stone-700 flex-wrap gap-y-1">
                  {profile.program && (
                    <span className="paper-badge font-bold bg-[#EFE9DB]">{profile.program}</span>
                  )}
                  {profile.year_level && (
                    <span className="paper-badge bg-stone-200 font-mono font-bold">{profile.year_level}</span>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-xs font-serif-body text-stone-900 leading-relaxed italic bg-[#FEFCF6] p-2.5 border border-[#212121] rounded-xs mt-1.5">
                    "{profile.bio}"
                  </p>
                )}
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[#212121] text-center">
                <div className="p-2 bg-[#FEFCF6] border border-[#212121] rounded-xs shadow-[1px_1px_0px_#212121]">
                  <span className="text-[9px] font-sketch uppercase text-stone-600 block font-bold">Projects</span>
                  <span className="text-base font-[900] font-newspaper-title text-[#212121]">{projects.length}</span>
                </div>
                <div className="p-2 bg-[#FEFCF6] border border-[#212121] rounded-xs shadow-[1px_1px_0px_#212121]">
                  <span className="text-[9px] font-sketch uppercase text-stone-600 block font-bold">Featured</span>
                  <span className="text-base font-[900] font-newspaper-title text-[#212121]">{featuredProjects.length}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-[#212121]">
                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full paper-button paper-button-dark text-xs py-2 px-3 font-bold justify-center min-h-[36px] flex items-center"
                >
                  <Github className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span>View GitHub Profile</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
                </a>
              </div>
            </div>
          </aside>

          {/* Right Column: Main Content Area */}
          <main className="flex-1 min-w-0 space-y-4 sm:space-y-5 w-full">
            {/* GitHub Commit Activity Heatmap Boxes */}
            <CommitHeatmap username={profile.github_username} />

            {/* Featured Projects Section */}
            {featuredProjects.length > 0 && (
              <section className="space-y-2.5">
                <div className="border-b border-dashed border-[#212121] pb-1.5 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Star className="w-3.5 h-3.5 text-stone-800 fill-stone-800" />
                    <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                      Featured Projects
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {featuredProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      isFeatured 
                      onClick={() => setSelectedProject(project)} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Regular / All Showcased Projects Section */}
            <section className="space-y-2.5">
              <div className="border-b border-dashed border-[#212121] pb-1.5 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-stone-800" />
                  <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                    All Projects
                  </h2>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="p-6 text-center paper-card bg-[#FEFCF6] border-dashed space-y-1">
                  <p className="text-xs font-serif-body text-stone-700">No projects have been added yet.</p>
                </div>
              ) : regularProjects.length === 0 && featuredProjects.length > 0 ? (
                <p className="text-xs font-serif-body italic text-stone-600">All projects are shown as featured above.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {regularProjects.map(project => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onClick={() => setSelectedProject(project)} 
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedProject(null)}
        >
          <div 
            className="bg-[#FEFCF6] paper-card max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] p-4 sm:p-6">
              <div>
                {selectedProject.is_featured && (
                  <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[9px] font-bold mb-2 inline-block">
                    Featured
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
                  {selectedProject.custom_title || selectedProject.repo_full_name.split('/')[1]}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedProject(null)} 
                className="p-1 hover:bg-stone-200 rounded-sm transition-colors"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-sm font-serif-body text-stone-800 leading-relaxed">
                {selectedProject.custom_description || selectedProject.live_stats?.description || 'No description provided.'}
              </p>
              
              {selectedProject.live_stats?.topics && selectedProject.live_stats.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.live_stats.topics.map((topic, i) => (
                    <span key={i} className="paper-badge text-[10px] font-mono">#{topic}</span>
                  ))}
                </div>
              )}
              
              <div className="flex items-center space-x-3 pt-4">
                {selectedProject.live_stats?.homepage && (
                  <a
                    href={selectedProject.live_stats.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="paper-button text-xs py-2 px-4 font-bold inline-flex items-center"
                  >
                    <Globe className="w-4 h-4 mr-1.5" />
                    Visit Project
                  </a>
                )}
                <a
                  href={selectedProject.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="paper-button paper-button-dark text-xs py-2 px-4 font-bold inline-flex items-center"
                >
                  <Github className="w-4 h-4 mr-1.5" />
                  View on GitHub
                </a>
              </div>
              
              {/* More Projects by Developer */}
              {projects.filter(p => p.id !== selectedProject.id).length > 0 && (
                <div className="mt-8 border-t border-dashed border-[#212121] pt-6">
                  <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121] mb-3">
                    More Projects by {profile.full_name || profile.github_username}
                  </h3>
                  <div className="space-y-2">
                    {projects.filter(p => p.id !== selectedProject.id).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="w-full text-left p-3 paper-card bg-[#FAF6EC] hover:bg-[#FEFCF6] transition-colors flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold font-newspaper-title uppercase text-sm">
                            {p.custom_title || p.repo_full_name.split('/')[1]}
                          </div>
                          <div className="text-xs font-serif-body text-stone-600 truncate max-w-[200px] sm:max-w-sm mt-1">
                            {p.custom_description || p.live_stats?.description || 'No description provided.'}
                          </div>
                        </div>
                        <ArrowLeft className="w-4 h-4 transform rotate-180 text-stone-400 flex-shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface ProjectCardProps {
  project: ShowcasedProject;
  isFeatured?: boolean;
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, isFeatured = false, onClick }) => {
  const stats = project.live_stats;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3.5 sm:p-4 paper-card transition-all flex flex-col justify-between space-y-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#212121] ${
        isFeatured
          ? 'bg-[#FAF6EC]'
          : 'bg-[#FEFCF6]'
      }`}
    >
      <div className="space-y-2">
        {/* Header Badge */}
        <div className="flex items-start justify-between gap-2.5 border-b border-dashed border-[#212121] pb-2">
          <div className="space-y-0.5 w-full">
            {isFeatured && (
              <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[9px] font-bold mb-0.5">
                <Pin className="w-2 h-2 mr-0.5 inline-block" />
                Featured
              </span>
            )}
            <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] leading-snug">
              {project.custom_title || project.repo_full_name.split('/')[1]}
            </h3>
          </div>
        </div>

        {/* Custom description */}
        <p className="text-xs font-serif-body text-stone-800 leading-relaxed line-clamp-3">
          {project.custom_description || stats?.description || 'No description provided.'}
        </p>

        {/* Topics / Tags */}
        {stats && stats.topics && stats.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {stats.topics.slice(0, 4).map((topic, i) => (
               <span
                key={i}
                className="paper-badge text-[9px] font-mono"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer / Links */}
      <div className="pt-2 border-t border-dashed border-[#212121] flex items-center justify-end text-xs font-mono">
        <div className="flex items-center space-x-2">
          {stats?.homepage && (
            <span
              className="text-stone-800 hover:text-black underline flex items-center space-x-1 font-bold min-h-[30px] py-0.5 px-1 text-xs"
              onClick={(e) => { e.stopPropagation(); window.open(stats.homepage, '_blank', 'noreferrer'); }}
            >
              <Globe className="w-3 h-3 mr-0.5 flex-shrink-0" />
              <span>Visit Project</span>
            </span>
          )}
          <span
            className="inline-flex items-center space-x-1 text-stone-800 hover:text-black underline font-bold min-h-[30px] py-0.5 px-1 text-xs"
            onClick={(e) => { e.stopPropagation(); window.open(project.repo_url, '_blank', 'noreferrer'); }}
          >
            <Github className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" />
            <span>View on GitHub</span>
            <ExternalLink className="w-3 h-3 ml-0.5 flex-shrink-0" />
          </span>
        </div>
      </div>
    </button>
  );
};
