import React, { useState, useEffect } from 'react';
import { 
  Search, Github, ArrowRight, ExternalLink, RefreshCw, Star, Users, 
  Globe, X, ArrowLeft, User, GitFork
} from 'lucide-react';
import { StudentShowcaseData, ShowcasedProject } from '../types';
import { getAllStudentsShowcase } from '../lib/showcaseStore';
import { DEGREE_PROGRAM_OPTIONS, matchesProgramFilter, getProgramBadgeLabel } from '../lib/programs';

interface ExploreViewProps {
  navigate: (route: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ navigate }) => {
  const [students, setStudents] = useState<StudentShowcaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState('all');
  const [browseMode, setBrowseMode] = useState<'students' | 'projects'>('students');
  const [selectedModalItem, setSelectedModalItem] = useState<{
    project: ShowcasedProject;
    student: StudentShowcaseData;
  } | null>(null);

  useEffect(() => {
    loadAllStudents(false);
  }, []);

  const loadAllStudents = async (force = false) => {
    setLoading(true);
    try {
      const data = await getAllStudentsShowcase(undefined, force);
      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.profile.github_username.toLowerCase().includes(q) ||
      (s.profile.full_name && s.profile.full_name.toLowerCase().includes(q)) ||
      (s.profile.headline && s.profile.headline.toLowerCase().includes(q)) ||
      (s.profile.bio && s.profile.bio.toLowerCase().includes(q)) ||
      (s.profile.program && s.profile.program.toLowerCase().includes(q)) ||
      s.projects.some(p => 
        p.repo_full_name.toLowerCase().includes(q) ||
        (p.custom_title && p.custom_title.toLowerCase().includes(q)) ||
        (p.custom_description && p.custom_description.toLowerCase().includes(q))
      );

    const matchesProgram = matchesProgramFilter(s.profile.program, filterProgram);

    return matchesQuery && matchesProgram;
  });

  const allProjects = students.flatMap(s => 
    s.projects.map(p => ({ project: p, student: s }))
  );

  const filteredProjects = allProjects.filter(({ project: p, student: s }) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      s.profile.github_username.toLowerCase().includes(q) ||
      (s.profile.full_name && s.profile.full_name.toLowerCase().includes(q)) ||
      p.repo_full_name.toLowerCase().includes(q) ||
      (p.custom_title && p.custom_title.toLowerCase().includes(q)) ||
      (p.custom_description && p.custom_description.toLowerCase().includes(q));

    const matchesProgram = matchesProgramFilter(s.profile.program, filterProgram);

    return matchesQuery && matchesProgram;
  });

  return (
    <>
      <div className="space-y-4 sm:space-y-5 pb-8 text-[#212121]">
        {/* Tab Toggle */}
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => setBrowseMode('students')}
            className={`paper-button text-xs py-1.5 px-3 font-bold flex-1 sm:flex-none justify-center ${browseMode === 'students' ? 'paper-button-dark' : 'bg-[#FEFCF6]'}`}
          >
            Students &amp; Projects
          </button>
          <button 
            onClick={() => setBrowseMode('projects')}
            className={`paper-button text-xs py-1.5 px-3 font-bold flex-1 sm:flex-none justify-center ${browseMode === 'projects' ? 'paper-button-dark' : 'bg-[#FEFCF6]'}`}
          >
            Projects Only
          </button>
        </div>

        {/* Editorial Header */}
        <div className="border-b border-dashed border-[#212121] pb-2">
          <h1 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
            {browseMode === 'students' ? 'Browse by Student' : 'Browse Projects'}
          </h1>
          <p className="text-xs font-serif-body text-stone-700 mt-0.5">
            Explore student portfolios, capstones, and course projects from Isabela State University - Cauayan Campus.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-2.5 bg-[#FAF6EC] paper-card flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="explore-search-input"
              type="text"
              placeholder="Search students or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 paper-input text-xs font-mono text-[#212121] placeholder:text-stone-500 min-h-[36px]"
            />
          </div>

          <select
            id="explore-program-filter"
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="w-full sm:w-auto px-3 py-1.5 paper-input text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold min-h-[36px]"
          >
            <option value="all">All Programs</option>
            {DEGREE_PROGRAM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="text-center py-12 paper-card bg-[#FEFCF6]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-stone-700" />
            <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">Loading student projects...</p>
          </div>
        ) : browseMode === 'students' ? (
          filteredStudents.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6] space-y-1.5 border-dashed">
              <p className="text-sm font-[900] uppercase font-newspaper-title text-[#212121]">No students found</p>
              <p className="text-xs font-serif-body text-stone-600">Try adjusting your query or selecting another program.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredStudents.map((student) => {
                const { profile, projects } = student;
                return (
                  <div
                    key={profile.id}
                    className="paper-card bg-[#FEFCF6] p-3.5 sm:p-4 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2.5">
                      {/* Student Avatar & Basic Info */}
                      <div 
                        onClick={() => navigate(`/u/${profile.github_username}`)}
                        className="flex items-center space-x-2.5 pb-2.5 border-b border-dashed border-[#212121] cursor-pointer group"
                      >
                        <div className="w-10 h-10 sm:w-11 sm:h-11 border-1.5 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[1.5px_1.5px_0px_#212121]">
                          <img
                            src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                            alt={profile.github_username}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate group-hover:opacity-80 transition-opacity">
                            {profile.full_name || profile.github_username}
                          </h3>
                          {profile.headline && (
                            <p className="text-[10px] font-sketch uppercase tracking-wider text-stone-800 truncate font-bold mt-0.5">
                              {profile.headline}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Program & Year Badge */}
                      <div className="flex items-center space-x-1 text-[9px] font-headline uppercase tracking-wider text-stone-800 flex-wrap gap-y-1">
                        <span className="paper-badge font-bold">
                          {profile.program || 'Student'}
                        </span>
                        {profile.year_level && (
                          <span className="paper-badge bg-stone-200 font-mono font-bold">
                            {profile.year_level}
                          </span>
                        )}
                      </div>

                      {/* Bio */}
                      {profile.bio && (
                        <p className="text-xs font-serif-body text-stone-700 line-clamp-2 leading-relaxed italic bg-[#FAF6EC] p-2 border border-[#212121] paper-card shadow-[1px_1px_0px_rgba(0,0,0,0.15)]">
                          "{profile.bio}"
                        </p>
                      )}

                      {/* Showcased Project Highlights */}
                      <div className="pt-1.5 space-y-1.5 border-t border-dashed border-[#212121]">
                        <div className="flex items-center justify-between text-[9px] text-stone-700 font-sketch uppercase tracking-wider font-bold">
                          <span>PROJECTS</span>
                          <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'}</span>
                        </div>

                        <div className="space-y-1.5">
                          {projects.slice(0, 2).map((proj) => (
                            <div
                              key={proj.id}
                              onClick={() => setSelectedModalItem({ project: proj, student })}
                              className="px-2.5 py-1.5 bg-[#FAF6EC] hover:bg-[#F3EDE0] border border-[#212121] text-xs flex items-center justify-between font-serif-body cursor-pointer transition-all paper-card shadow-[1px_1px_0px_#212121]"
                            >
                              <span className="text-[#212121] truncate max-w-[130px] text-xs font-bold">
                                {proj.custom_title || proj.repo_full_name.split('/')[1]}
                              </span>
                              <div className="flex items-center space-x-1.5 flex-shrink-0">
                                <span className="flex items-center text-[10px] font-mono font-bold text-stone-800" title="Actual GitHub Stars">
                                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-700 mr-0.5" />
                                  <span>{proj.live_stats?.stars ?? 0}</span>
                                </span>
                                {proj.is_featured && (
                                  <span className="paper-badge text-[8px] font-mono py-0 px-1 bg-amber-200 text-amber-900 border-amber-800 flex items-center font-bold">
                                    FEATURED PROJECT
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {projects.length > 2 && (
                            <p className="text-[10px] font-sketch text-stone-600 text-right pr-0.5 font-bold">
                              +{projects.length - 2} more projects
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View Profile Button */}
                    <button
                      onClick={() => navigate(`/u/${profile.github_username}`)}
                      className="w-full mt-1.5 paper-button paper-button-dark text-xs py-1.5 px-2.5 font-bold min-h-[34px] justify-center"
                    >
                      <span>View Profile</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          filteredProjects.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6] space-y-1.5 border-dashed">
              <p className="text-sm font-[900] uppercase font-newspaper-title text-[#212121]">No projects found</p>
              <p className="text-xs font-serif-body text-stone-600">Try adjusting your query or selecting another program.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredProjects.map(({ project, student }) => {
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedModalItem({ project, student })}
                    className="paper-card bg-[#FEFCF6] p-3.5 sm:p-4 flex flex-col justify-between space-y-2 cursor-pointer hover:bg-[#FAF6EC] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#212121] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm sm:text-base font-[900] font-newspaper-title text-[#212121] line-clamp-2 uppercase">
                          {project.custom_title || project.repo_full_name.split('/')[1]}
                        </h3>
                        {project.is_featured && (
                          <span className="paper-badge text-[9px] font-mono py-0 px-1 bg-amber-200 text-amber-900 border-amber-800 flex items-center font-bold flex-shrink-0 ml-2">
                            <Star className="w-2.5 h-2.5 fill-amber-900 text-amber-900 mr-0.5" />
                            FEATURED PROJECT
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs font-serif-body text-stone-700 line-clamp-3 leading-relaxed">
                        {project.custom_description || project.live_stats?.description || 'No description provided.'}
                      </p>

                      {/* Live GitHub Telemetry (Stars, Forks, Language) */}
                      <div className="flex items-center space-x-2 font-mono text-[10px] text-stone-700 font-bold pt-0.5">
                        {project.live_stats?.language && (
                          <span className="paper-badge text-[9px] bg-stone-200">
                            {project.live_stats.language}
                          </span>
                        )}
                        <span className="flex items-center space-x-0.5" title="Actual GitHub Stars">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-700" />
                          <span>{project.live_stats !== undefined ? project.live_stats.stars : '...'}</span>
                        </span>
                        {project.live_stats && (
                          <span className="flex items-center space-x-0.5" title="GitHub Forks">
                            <GitFork className="w-2.5 h-2.5 text-stone-600" />
                            <span>{project.live_stats.forks}</span>
                          </span>
                        )}
                      </div>

                      {project.live_stats?.topics && project.live_stats.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {project.live_stats.topics.slice(0, 3).map((topic, i) => (
                            <span key={i} className="paper-badge text-[9px] font-mono">
                              #{topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-dashed border-[#212121] flex items-center justify-between">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/u/${student.profile.github_username}`);
                        }}
                        className="text-[10px] font-sketch uppercase tracking-wider text-stone-700 font-bold hover:underline truncate max-w-[130px]"
                      >
                        By {student.profile.full_name || student.profile.github_username}
                      </span>
                      <span className="text-[10px] font-headline uppercase font-bold text-stone-600 hover:text-black flex-shrink-0">
                        Details &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedModalItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedModalItem(null)}
        >
          <div 
            className="bg-[#FEFCF6] paper-card max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-[6px_6px_0px_#000]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] p-4 sm:p-6">
              <div>
                {selectedModalItem.project.is_featured && (
                  <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[9px] font-bold mb-2 inline-block">
                    FEATURED PROJECT
                  </span>
                )}
                <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
                  {selectedModalItem.project.custom_title || selectedModalItem.project.repo_full_name.split('/')[1]}
                </h2>
                <p className="text-xs font-mono text-stone-700 mt-0.5">
                  {selectedModalItem.project.repo_full_name}
                </p>
              </div>
              <button 
                onClick={() => setSelectedModalItem(null)} 
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-stone-700" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Creator Card */}
              <div 
                onClick={() => {
                  setSelectedModalItem(null);
                  navigate(`/u/${selectedModalItem.student.profile.github_username}`);
                }}
                className="flex items-center space-x-3 p-3 bg-[#FAF6EC] paper-card cursor-pointer hover:bg-[#F3EDE0] transition-colors"
              >
                <div className="w-10 h-10 border-1.5 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs">
                  <img
                    src={selectedModalItem.student.profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                    alt={selectedModalItem.student.profile.github_username}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold font-newspaper-title uppercase text-[#212121] truncate">
                    {selectedModalItem.student.profile.full_name || selectedModalItem.student.profile.github_username}
                  </p>
                  <p className="text-[10px] text-stone-700 font-serif-body truncate">
                    {selectedModalItem.student.profile.program || 'Student'} {selectedModalItem.student.profile.year_level ? `• ${selectedModalItem.student.profile.year_level}` : ''}
                  </p>
                </div>
                <button 
                  className="paper-button text-xs py-1 px-2.5 font-bold flex items-center space-x-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModalItem(null);
                    navigate(`/u/${selectedModalItem.student.profile.github_username}`);
                  }}
                >
                  <User className="w-3 h-3 mr-1" />
                  <span>View Profile</span>
                </button>
              </div>

              {/* Live GitHub Telemetry Bar */}
              <div className="flex items-center space-x-3 text-xs font-mono text-stone-800 font-bold py-1 border-b border-dashed border-[#212121]/50 pb-2">
                <span className="flex items-center space-x-1" title="Actual GitHub Stars">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
                  <span>{selectedModalItem.project.live_stats?.stars ?? 0} stars</span>
                </span>
                <span className="flex items-center space-x-1" title="GitHub Forks">
                  <GitFork className="w-3.5 h-3.5 text-stone-600" />
                  <span>{selectedModalItem.project.live_stats?.forks ?? 0} forks</span>
                </span>
                {selectedModalItem.project.live_stats?.language && (
                  <span className="paper-badge text-[10px] bg-stone-200">
                    {selectedModalItem.project.live_stats.language}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold font-headline uppercase tracking-wider text-[#212121] mb-1">
                  About the Project
                </h4>
                <p className="text-sm font-serif-body text-stone-800 leading-relaxed">
                  {selectedModalItem.project.custom_description || selectedModalItem.project.live_stats?.description || 'No description provided.'}
                </p>
              </div>
              
              {/* Tags */}
              {selectedModalItem.project.live_stats?.topics && selectedModalItem.project.live_stats.topics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedModalItem.project.live_stats.topics.map((topic, i) => (
                    <span key={i} className="paper-badge text-[10px] font-mono">#{topic}</span>
                  ))}
                </div>
              )}
              
              {/* Action Links */}
              <div className="flex items-center space-x-3 pt-2">
                {selectedModalItem.project.live_stats?.homepage && (
                  <a
                    href={selectedModalItem.project.live_stats.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="paper-button text-xs py-2 px-4 font-bold inline-flex items-center"
                  >
                    <Globe className="w-4 h-4 mr-1.5" />
                    Visit Project
                  </a>
                )}
                <a
                  href={selectedModalItem.project.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="paper-button paper-button-dark text-xs py-2 px-4 font-bold inline-flex items-center"
                >
                  <Github className="w-4 h-4 mr-1.5" />
                  View on GitHub
                </a>
              </div>
              
              {/* More Projects by Developer */}
              {selectedModalItem.student.projects.filter(p => p.id !== selectedModalItem.project.id).length > 0 && (
                <div className="mt-6 border-t border-dashed border-[#212121] pt-5">
                  <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#212121] mb-3">
                    More Projects by {selectedModalItem.student.profile.full_name || selectedModalItem.student.profile.github_username}
                  </h3>
                  <div className="space-y-2">
                    {selectedModalItem.student.projects
                      .filter(p => p.id !== selectedModalItem.project.id)
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedModalItem({ project: p, student: selectedModalItem.student })}
                          className="w-full text-left p-3 paper-card bg-[#FAF6EC] hover:bg-[#FEFCF6] transition-colors flex justify-between items-center cursor-pointer"
                        >
                          <div>
                            <div className="font-bold font-newspaper-title uppercase text-sm">
                              {p.custom_title || p.repo_full_name.split('/')[1]}
                            </div>
                            <div className="text-xs font-serif-body text-stone-600 truncate max-w-[200px] sm:max-w-sm mt-1">
                              {p.custom_description || p.live_stats?.description || 'No description provided.'}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-stone-600 flex-shrink-0 ml-2" />
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
