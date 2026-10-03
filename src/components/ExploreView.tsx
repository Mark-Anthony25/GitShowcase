import React, { useState, useEffect, useMemo } from 'react';
import { Search, Github, ArrowRight, Star, Globe, X, User, GitFork } from 'lucide-react';
import { StudentShowcaseData, ShowcasedProject } from '../types';
import { getPublicDirectoryPage } from '../lib/showcaseStore';
import { getStarCountLabel } from '../lib/projectStats';
import { useAuth } from '../context/AuthContext';
import { Skeleton } from './Skeleton';

interface ExploreViewProps {
  navigate: (route: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ navigate }) => {
  const { githubToken } = useAuth();
  const [students, setStudents] = useState<StudentShowcaseData[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [sortBy, setSortBy] = useState<'recent' | 'stars' | 'forks' | 'name'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 8;
  const [selectedModalItem, setSelectedModalItem] = useState<{
    project: ShowcasedProject;
    student: StudentShowcaseData;
  } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLanguage, sortBy]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadAllStudents(false, 0), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const loadAllStudents = async (force = false, offset = 0) => {
    setLoading(true);
    try {
      const page = await getPublicDirectoryPage({ query: searchQuery, offset, limit: 24 });
      setStudents(previous => offset ? [...previous, ...page.items] : page.items);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  const allProjects = useMemo(() => {
    return students.flatMap(s => 
      s.projects.map(p => ({ project: p, student: s }))
    );
  }, [students]);

  const availableLanguages = useMemo(() => {
    const counts = new Map<string, number>();
    allProjects.forEach(({ project }) => {
      const lang = project.live_stats?.language;
      if (lang) {
        counts.set(lang, (counts.get(lang) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [allProjects]);

  const filteredProjects = useMemo(() => {
    let result = allProjects;

    if (filterLanguage !== 'all') {
      result = result.filter(({ project }) => 
        project.live_stats?.language?.toLowerCase() === filterLanguage.toLowerCase()
      );
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'stars') {
        const diff = (b.project.live_stats?.stars ?? 0) - (a.project.live_stats?.stars ?? 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'forks') {
        const diff = (b.project.live_stats?.forks ?? 0) - (a.project.live_stats?.forks ?? 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'name') {
        const nameA = (a.project.custom_title || a.project.repo_full_name).toLowerCase();
        const nameB = (b.project.custom_title || b.project.repo_full_name).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      // 'recent' default
      const dateA = a.project.added_at ? new Date(a.project.added_at).getTime() : 0;
      const dateB = b.project.added_at ? new Date(b.project.added_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [allProjects, filterLanguage, sortBy]);

  const resultCount = filteredProjects.length;
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProjects.slice(start, start + PAGE_SIZE);
  }, [filteredProjects, currentPage]);

  const hasActiveFilters = searchQuery.trim().length > 0 || filterLanguage !== 'all' || sortBy !== 'recent';
  const clearSearch = () => setSearchQuery('');
  const clearLanguage = () => setFilterLanguage('all');
  const clearAllFilters = () => {
    clearSearch();
    clearLanguage();
    setSortBy('recent');
  };

  const emptyStateCopy = () => {
    const noun = 'projects';
    if (students.length === 0) {
      return {
        title: `No ${noun} published yet`,
        description: 'Sign in with GitHub to publish the first project in the community.',
      };
    }

    const queryLabel = searchQuery.trim() ? ` for “${searchQuery.trim()}”` : '';
    const langLabel = filterLanguage !== 'all' ? ` in ${filterLanguage}` : '';
    return {
      title: `No ${noun} found${queryLabel}${langLabel}`,
      description: 'Try adjusting your search query or language filter.',
    };
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-5 pb-8 text-[#212121]">
        {/* Editorial Header */}
        <div className="border-b border-dashed border-[#212121] pb-2">
          <h1 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
            Projects
          </h1>
          <p className="text-xs font-serif-body text-stone-700 mt-0.5">
            Explore portfolios, projects, and repositories from creators everywhere.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-2.5 bg-[#FAF6EC] paper-card flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="explore-search-input"
              type="text"
              placeholder="Search creators or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 paper-input text-xs font-mono text-[#212121] placeholder:text-stone-500 min-h-[36px]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              id="explore-language-filter"
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="flex-1 sm:flex-none sm:w-auto px-3 py-1.5 paper-input paper-select text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold min-h-[36px]"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map(([lang, count]) => (
                <option key={lang} value={lang}>
                  {lang} ({count})
                </option>
              ))}
            </select>

            <select
              id="explore-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 sm:flex-none sm:w-auto px-3 py-1.5 paper-input paper-select text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold min-h-[36px]"
            >
              <option value="recent">Recently Added</option>
              <option value="stars">Most Stars</option>
              <option value="forks">Most Forks</option>
              <option value="name">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sketch uppercase tracking-wider text-stone-700">
          <span aria-live="polite" className="font-bold">
            {resultCount} {resultCount === 1 ? 'project' : 'projects'} shown
          </span>
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {searchQuery.trim() && (
                <button onClick={clearSearch} className="paper-badge cursor-pointer hover:bg-[#FAF6EC]">
                  Search: {searchQuery.trim()} ×
                </button>
              )}
              {filterLanguage !== 'all' && (
                <button onClick={clearLanguage} className="paper-badge cursor-pointer hover:bg-[#FAF6EC]">
                  Language: {filterLanguage} ×
                </button>
              )}
              {sortBy !== 'recent' && (
                <button onClick={() => setSortBy('recent')} className="paper-badge cursor-pointer hover:bg-[#FAF6EC]">
                  Sort: {sortBy === 'stars' ? 'Most Stars' : sortBy === 'forks' ? 'Most Forks' : 'A–Z'} ×
                </button>
              )}
              <button onClick={clearAllFilters} className="underline font-bold cursor-pointer">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4" aria-label="Loading projects">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="paper-card bg-[#FEFCF6] p-3.5 sm:p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
                <Skeleton className="h-5 w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          filteredProjects.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6] space-y-1.5 border-dashed">
              <p className="text-sm font-[900] uppercase font-newspaper-title text-[#212121]">{emptyStateCopy().title}</p>
              <p className="text-xs font-serif-body text-stone-600">{emptyStateCopy().description}</p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="paper-button text-xs py-1.5 px-3 font-bold mt-2">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="content-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {paginatedProjects.map(({ project, student }) => {
                  return (
                    <div
                      key={project.id}
                      onClick={() => setSelectedModalItem({ project, student })}
                      className="paper-card bg-[#FEFCF6] p-3 sm:p-3.5 flex flex-col justify-between space-y-2 cursor-pointer hover:bg-[#FAF6EC] hover:-translate-y-0.5 transition-all group"
                    >
                      <div className="space-y-2">
                        {/* Repository Preview Banner / Project UI Screenshot */}
                        <div className="w-full aspect-[16/10] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative flex items-center justify-center">
                          <img width={1280} height={800}
                            src={project.screenshot_url || `https://opengraph.githubassets.com/1/${project.repo_full_name}`}
                            alt={project.custom_title || project.repo_full_name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              if (e.currentTarget.src !== `https://opengraph.githubassets.com/1/${project.repo_full_name}`) {
                                e.currentTarget.src = `https://opengraph.githubassets.com/1/${project.repo_full_name}`;
                              } else {
                                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                              }
                            }}
                          />
                        </div>

                        <div className="flex justify-between items-start">
                          <h3 className="text-sm sm:text-base font-[900] font-newspaper-title text-[#212121] uppercase">
                            {project.custom_title || project.repo_full_name.split('/')[1]}
                          </h3>
                        </div>
                        
                        <p className="text-xs font-serif-body text-stone-700 leading-relaxed line-clamp-2">
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
                            <span>{getStarCountLabel(project.live_stats)}</span>
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

                      <div className="pt-2 mt-2 border-t border-dashed border-[#212121] flex items-center justify-between">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/u/${student.profile.github_username}`);
                          }}
                          className="text-[10px] font-sketch tracking-wider text-stone-700 font-bold hover:underline truncate max-w-[130px]"
                        >
                          By {student.profile.full_name || student.profile.github_username}
                        </span>
                        <span className="text-[10px] font-headline uppercase font-bold text-stone-600 hover:text-[#0071DE] flex-shrink-0">
                          Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Structured Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-dashed border-[#212121]">
                  <span className="text-xs font-mono font-bold text-stone-700">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} projects
                  </span>

                  <div className="flex items-center space-x-1 font-mono text-xs">
                    <button
                      id="explore-prev-page"
                      onClick={() => {
                        setCurrentPage(prev => Math.max(1, prev - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="paper-button text-xs py-1 px-2.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      &larr; Prev
                    </button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => {
                            setCurrentPage(pageNum);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={`min-w-[30px] h-[30px] font-bold text-xs rounded-xs flex items-center justify-center transition-colors cursor-pointer ${
                            currentPage === pageNum
                              ? 'paper-button paper-button-dark'
                              : 'paper-button hover:bg-stone-200'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      id="explore-next-page"
                      onClick={() => {
                        setCurrentPage(prev => Math.min(totalPages, prev + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="paper-button text-xs py-1 px-2.5 font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
        {!loading && hasMore && (
          <div className="pt-4 text-center"><button className="paper-button text-xs py-2 px-4 font-bold" onClick={() => loadAllStudents(false, students.length)}>Load more projects</button></div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedModalItem && (
        <div 
          className="fixed inset-0 bg-[#57534E]/45 z-50 flex items-center justify-center p-4 sm:p-6 paper-motion-overlay"
          onClick={() => setSelectedModalItem(null)}
        >
          <div
            className="bg-[#FEFCF6] paper-card paper-motion-panel max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] p-4 sm:p-6">
              <div>
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
              {/* Repository Preview Banner / Project UI Screenshot */}
              <div className="w-full aspect-[2/1] sm:aspect-[16/7] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative flex items-center justify-center">
                <img width={1280} height={800}
                  src={selectedModalItem.project.screenshot_url || `https://opengraph.githubassets.com/1/${selectedModalItem.project.repo_full_name}`}
                  alt={selectedModalItem.project.custom_title || selectedModalItem.project.repo_full_name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== `https://opengraph.githubassets.com/1/${selectedModalItem.project.repo_full_name}`) {
                      e.currentTarget.src = `https://opengraph.githubassets.com/1/${selectedModalItem.project.repo_full_name}`;
                    } else {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }
                  }}
                />
              </div>

              {/* Creator Card */}
              <div 
                onClick={() => {
                  setSelectedModalItem(null);
                  navigate(`/u/${selectedModalItem.student.profile.github_username}`);
                }}
                className="flex items-center space-x-3 p-3 bg-[#FAF6EC] paper-card cursor-pointer hover:bg-[#F3EDE0] transition-colors"
              >
                <div className="w-10 h-10 paper-avatar">
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
                    {selectedModalItem.student.profile.headline || selectedModalItem.student.profile.program || 'Software Developer'}
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
                    Visit Live Site
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
