import React, { useState, useEffect } from 'react';
import { 
  Github, Plus, Trash2, Edit3, Star, GitFork, ExternalLink, 
  RefreshCw, Eye, Pin, Search, CheckCircle2, FolderGit2, 
  X, Globe, Sparkles, AlertCircle, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { GitHubRepoItem, ShowcasedProject } from '../types';
import { fetchUserRepos } from '../lib/github';
import { 
  getStudentShowcasedProjects, 
  addProjectToShowcase, 
  removeProjectFromShowcase, 
  updateShowcaseProject,
  subscribeSchemaStatus 
} from '../lib/showcaseStore';

interface DashboardViewProps {
  navigate: (route: string) => void;
  onOpenOnboarding?: () => void;
  onOpenGuide?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigate, onOpenGuide }) => {
  const { user, profile, githubToken } = useAuth();

  // State
  const [showcased, setShowcased] = useState<ShowcasedProject[]>([]);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  const [activeTab, setActiveTab] = useState<'showcase' | 'repos'>('showcase');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Modal for adding repo with custom metadata
  const [selectedRepoToAdd, setSelectedRepoToAdd] = useState<GitHubRepoItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [addingInProgress, setAddingInProgress] = useState(false);

  // Editing existing showcase project
  const [editingProject, setEditingProject] = useState<ShowcasedProject | null>(null);

  // Previewing project detail
  const [previewProject, setPreviewProject] = useState<ShowcasedProject | null>(null);

  // Subscribe to schema missing alerts
  useEffect(() => {
    const unsub = subscribeSchemaStatus((missing) => {
      setIsSchemaMissing(missing);
    });
    return unsub;
  }, []);

  // Load showcase projects
  useEffect(() => {
    if (!user) return;
    loadShowcasedProjects();
  }, [user]);

  // Load GitHub repos when switching to 'repos' tab or initial mount
  useEffect(() => {
    if (user && (activeTab === 'repos' || availableRepos.length === 0)) {
      loadGitHubRepos();
    }
  }, [user, activeTab]);

  const loadShowcasedProjects = async (force = false) => {
    if (!user) return;
    setLoadingShowcase(true);
    try {
      const items = await getStudentShowcasedProjects(user.id, githubToken, force);
      setShowcased(items);
    } catch (err) {
      console.error('Error fetching showcase projects:', err);
    } finally {
      setLoadingShowcase(false);
    }
  };

  const loadGitHubRepos = async (force = false) => {
    setLoadingRepos(true);
    try {
      const repos = await fetchUserRepos(githubToken, profile?.github_username || '', force);
      setAvailableRepos(repos);
    } catch (err) {
      console.error('Error loading GitHub repos:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleOpenAddModal = (repo: GitHubRepoItem) => {
    setSelectedRepoToAdd(repo);
    setCustomTitle(repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    setCustomDescription(repo.description || '');
    setIsFeatured(showcased.length === 0);
  };

  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRepoToAdd) return;

    setAddingInProgress(true);
    try {
      const newProj = await addProjectToShowcase({
        profileId: user.id,
        repoFullName: selectedRepoToAdd.full_name,
        repoUrl: selectedRepoToAdd.html_url,
        customTitle: customTitle.trim() || null,
        customDescription: customDescription.trim() || null,
        isFeatured: isFeatured,
      });

      if (newProj) {
        setShowcased(prev => [newProj, ...prev]);
        setSelectedRepoToAdd(null);
        setActiveTab('showcase');
        try {
          confetti({ particleCount: 40, spread: 45, origin: { y: 0.8 } });
        } catch {
          // confetti optional
        }
      }
    } catch (err) {
      console.error('Failed to add project to showcase:', err);
    } finally {
      setAddingInProgress(false);
    }
  };

  const handleRemoveProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to unpublish this project from your showcase?')) return;
    try {
      await removeProjectFromShowcase(projectId);
      setShowcased(prev => prev.filter(p => p.id !== projectId));
    } catch (err) {
      console.error('Failed to remove project:', err);
    }
  };

  const handleToggleFeatured = async (project: ShowcasedProject) => {
    const updatedStatus = !project.is_featured;
    try {
      await updateShowcaseProject(project.id, { is_featured: updatedStatus });
      setShowcased(prev =>
        prev.map(p => (p.id === project.id ? { ...p, is_featured: updatedStatus } : p))
      );
    } catch (err) {
      console.error('Failed to toggle featured status:', err);
    }
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    try {
      const updated = await updateShowcaseProject(editingProject.id, {
        custom_title: editingProject.custom_title,
        custom_description: editingProject.custom_description,
        is_featured: editingProject.is_featured,
      });
      if (updated) {
        setShowcased(prev => prev.map(p => (p.id === editingProject.id ? updated : p)));
        setEditingProject(null);
      }
    } catch (err) {
      console.error('Failed to update showcase project:', err);
    }
  };

  const showcasedRepoNames = new Set(showcased.map(p => p.repo_full_name));

  // Filtered showcased projects
  const filteredShowcased = showcased.filter(p => {
    const term = searchQuery.toLowerCase();
    const title = (p.custom_title || p.repo_full_name).toLowerCase();
    const desc = (p.custom_description || '').toLowerCase();
    const repo = p.repo_full_name.toLowerCase();
    return title.includes(term) || desc.includes(term) || repo.includes(term);
  });

  // Filtered available GitHub repositories
  const filteredAvailableRepos = availableRepos.filter(repo => {
    const term = searchQuery.toLowerCase();
    return (
      repo.name.toLowerCase().includes(term) ||
      (repo.description && repo.description.toLowerCase().includes(term)) ||
      (repo.language && repo.language.toLowerCase().includes(term))
    );
  });

  const username = profile?.github_username || '';
  const featuredCount = showcased.filter(p => p.is_featured).length;

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 text-[#212121] w-full max-w-full">
      {/* Alert Notices */}
      {isSchemaMissing && (
        <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-500 paper-card text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold uppercase tracking-wider font-headline text-xs">
                Supabase Tables Pending Creation
              </p>
              <p className="font-serif-body text-stone-800 text-xs">
                Database tables haven't been run yet in the Supabase SQL editor. The app is running smoothly using client-side offline storage.
              </p>
            </div>
          </div>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="paper-button text-xs py-1.5 px-3 whitespace-nowrap font-bold flex-shrink-0 min-h-[34px]"
            >
              Open SQL Setup Guide
            </button>
          )}
        </div>
      )}

      {/* Project Workbench Masthead Banner */}
      <section className="paper-card bg-[#FEFCF6] p-3.5 sm:p-5 space-y-3.5">
        <div className="border-b border-dashed border-[#212121] pb-3.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-xs border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center shadow-[1.5px_1.5px_0px_#212121] flex-shrink-0">
                <FolderGit2 className="w-4 h-4 text-[#212121] stroke-[2]" />
              </div>
              <span className="text-[10px] sm:text-xs font-sketch uppercase tracking-widest text-stone-700 font-bold">
                PROJECT WORKBENCH
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-[900] uppercase font-newspaper-title text-[#212121] leading-tight">
              My Projects
            </h1>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 max-w-2xl leading-relaxed">
              Manage, publish, edit, and curate your projects and GitHub repositories displayed across GitShowcase.
            </p>
          </div>
        </div>

        {/* Project Telemetry Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5">
          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Published Projects</span>
              <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-[900] font-newspaper-title text-[#212121] leading-none block">
                {showcased.length}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Live on public profile
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Featured Spotlight</span>
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-[900] font-newspaper-title text-[#212121] leading-none block">
                {featuredCount}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Pinned at top of showcase
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">GitHub Repositories</span>
              <Github className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-[900] font-newspaper-title text-[#212121] leading-none block">
                {availableRepos.length}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Available to publish
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tabs Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-dashed border-[#212121] pb-2.5">
        {/* Work Sub-Tabs */}
        <div className="flex items-center space-x-2">
          <button
            id="tab-published-projects-btn"
            onClick={() => setActiveTab('showcase')}
            className={`paper-button text-xs py-1.5 px-3.5 font-bold min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'showcase' ? 'paper-button-dark' : 'bg-[#FEFCF6]'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Published Projects ({showcased.length})</span>
          </button>

          <button
            id="tab-import-repos-btn"
            onClick={() => setActiveTab('repos')}
            className={`paper-button text-xs py-1.5 px-3.5 font-bold min-h-[36px] flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'repos' ? 'paper-button-dark' : 'bg-[#FEFCF6]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Add from GitHub ({availableRepos.length})</span>
          </button>
        </div>

        {/* Search & Refresh Toolbar */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'showcase' ? 'Filter published projects...' : 'Search GitHub repositories...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 paper-input text-xs font-mono text-[#212121] min-h-[34px]"
            />
          </div>

          <button
            onClick={() => {
              loadShowcasedProjects(true);
              loadGitHubRepos(true);
            }}
            className="paper-button-icon min-w-[34px] min-h-[34px] p-1.5 flex-shrink-0 cursor-pointer"
            title="Refresh List from GitHub"
            aria-label="Refresh List from GitHub"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-stone-800 ${(loadingShowcase || loadingRepos) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: Published / Showcased Projects */}
      {activeTab === 'showcase' && (
        <div className="space-y-4">
          {loadingShowcase ? (
            <div className="text-center py-12 paper-card bg-[#FEFCF6]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">
                Fetching latest project stats from GitHub...
              </p>
            </div>
          ) : showcased.length === 0 ? (
            <div className="text-center py-12 px-4 paper-card bg-[#FEFCF6] space-y-3 border-dashed">
              <FolderGit2 className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  No projects published yet
                </h3>
                <p className="text-xs sm:text-sm font-serif-body text-stone-700 max-w-md mx-auto leading-relaxed">
                  You haven't added any repositories to your public showcase yet. Select repositories from your GitHub account to publish them.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('repos')}
                className="paper-button paper-button-dark text-xs py-2 px-4 font-bold min-h-[36px] inline-flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4 flex-shrink-0" />
                <span>Add Projects from GitHub</span>
              </button>
            </div>
          ) : filteredShowcased.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6]">
              <p className="text-xs font-serif-body text-stone-700">
                No published projects matching "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredShowcased.map((proj) => (
                <div
                  key={proj.id}
                  className={`p-3.5 sm:p-4 paper-card flex flex-col justify-between space-y-3 transition-all ${
                    proj.is_featured
                      ? 'bg-[#FAF6EC] shadow-[3px_3px_0px_#212121]'
                      : 'bg-[#FEFCF6]'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Status Badges & Controls Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-dashed border-[#212121] pb-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 min-w-0">
                        {proj.is_featured ? (
                          <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[9px] font-bold">
                            <Pin className="w-2.5 h-2.5 mr-0.5 inline-block" />
                            FEATURED
                          </span>
                        ) : (
                          <span className="paper-badge bg-stone-200 text-stone-800 text-[9px] font-bold">
                            PUBLISHED
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-stone-700 truncate max-w-[130px]">
                          {proj.repo_full_name}
                        </span>
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          title={proj.is_featured ? 'Unpin from featured spotlight' : 'Pin to top as featured spotlight'}
                          aria-label={proj.is_featured ? 'Unpin featured project' : 'Pin as featured project'}
                          onClick={() => handleToggleFeatured(proj)}
                          className={`paper-button-icon min-w-[28px] min-h-[28px] p-1 cursor-pointer ${
                            proj.is_featured ? 'paper-button-dark' : ''
                          }`}
                        >
                          <Star className={`w-3 h-3 ${proj.is_featured ? 'fill-amber-300 text-amber-300' : 'text-stone-800'}`} />
                        </button>

                        <button
                          title="Edit project details"
                          aria-label="Edit project details"
                          onClick={() => setEditingProject(proj)}
                          className="paper-button-icon min-w-[28px] min-h-[28px] p-1 text-stone-800 cursor-pointer hover:bg-stone-200"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        <button
                          title="Unpublish from showcase"
                          aria-label="Unpublish project"
                          onClick={() => handleRemoveProject(proj.id)}
                          className="paper-button-icon min-w-[28px] min-h-[28px] p-1 text-rose-800 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] leading-snug line-clamp-2">
                      {proj.custom_title || proj.repo_full_name.split('/')[1]}
                    </h3>

                    {/* Description */}
                    <p className="text-xs font-serif-body text-stone-700 line-clamp-2 leading-relaxed">
                      {proj.custom_description || proj.live_stats?.description || 'No custom description provided.'}
                    </p>

                    {/* Live GitHub Telemetry (Stars, Forks, Language) */}
                    <div className="flex items-center space-x-2 font-mono text-[10px] text-stone-700 font-bold pt-0.5">
                      {proj.live_stats?.language && (
                        <span className="paper-badge text-[9px] bg-stone-200">
                          {proj.live_stats.language}
                        </span>
                      )}
                      <span className="flex items-center space-x-0.5" title="Actual GitHub Stars">
                        <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-700" />
                        <span>{proj.live_stats !== undefined ? proj.live_stats.stars : '...'}</span>
                      </span>
                      {proj.live_stats && (
                        <span className="flex items-center space-x-0.5" title="GitHub Forks">
                          <GitFork className="w-2.5 h-2.5 text-stone-600" />
                          <span>{proj.live_stats.forks}</span>
                        </span>
                      )}
                    </div>

                    {/* Live Tags if available */}
                    {proj.live_stats?.topics && proj.live_stats.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {proj.live_stats.topics.slice(0, 3).map((topic, i) => (
                          <span key={i} className="paper-badge text-[9px] font-mono">
                            #{topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer & Links */}
                  <div className="pt-2 border-t border-dashed border-[#212121] flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => setPreviewProject(proj)}
                      className="text-stone-800 hover:text-black font-bold flex items-center space-x-1 py-0.5 underline cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      {proj.live_stats?.homepage && (
                        <a
                          href={proj.live_stats.homepage}
                          target="_blank"
                          rel="noreferrer"
                          className="text-stone-800 hover:text-black underline flex items-center space-x-0.5 font-bold"
                          title="Visit live project URL"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Live</span>
                        </a>
                      )}
                      <a
                        href={proj.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-900 hover:text-black underline flex items-center space-x-0.5 font-bold"
                        title="Open on GitHub"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Add from GitHub Repositories */}
      {activeTab === 'repos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-dashed border-[#212121] pb-2">
            <div>
              <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                Your Connected GitHub Repositories
              </h2>
              <p className="text-xs font-serif-body text-stone-700">
                Choose repositories to publish onto your showcase. You can customize title and description before publishing.
              </p>
            </div>

            <span className="paper-badge bg-stone-200 text-stone-800 font-mono text-[10px] font-bold self-start sm:self-auto">
              {availableRepos.length} Repositories Found
            </span>
          </div>

          {loadingRepos ? (
            <div className="text-center py-12 paper-card bg-[#FEFCF6]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">
                Fetching repositories from GitHub API...
              </p>
            </div>
          ) : filteredAvailableRepos.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6]">
              <p className="text-xs font-serif-body text-stone-700">
                No repositories found matching "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredAvailableRepos.map((repo) => {
                const isAlreadyShowcased = showcasedRepoNames.has(repo.full_name);

                return (
                  <div
                    key={repo.id}
                    className={`p-3.5 sm:p-4 paper-card flex flex-col justify-between space-y-3 transition-all ${
                      isAlreadyShowcased
                        ? 'bg-[#FAF6EC] opacity-90'
                        : 'bg-[#FEFCF6]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2 border-b border-dashed border-[#212121] pb-1.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                            {repo.name}
                          </h3>
                          <p className="text-[10px] text-stone-600 font-mono truncate">
                            {repo.full_name}
                          </p>
                        </div>

                        {repo.fork && (
                          <span className="paper-badge text-[8px] font-mono flex-shrink-0">
                            Fork
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-serif-body text-stone-700 line-clamp-2 leading-relaxed">
                        {repo.description || 'No description provided on GitHub.'}
                      </p>

                      <div className="flex items-center space-x-2 font-mono text-[10px] text-stone-700 font-bold pt-1">
                        {repo.language && (
                          <span className="paper-badge text-[9px] bg-stone-200">
                            {repo.language}
                          </span>
                        )}
                        <span className="flex items-center space-x-0.5">
                          <Star className="w-2.5 h-2.5" />
                          <span>{repo.stargazers_count}</span>
                        </span>
                        <span className="flex items-center space-x-0.5">
                          <GitFork className="w-2.5 h-2.5" />
                          <span>{repo.forks_count}</span>
                        </span>
                      </div>
                    </div>

                    {/* Publish Action Button */}
                    <div className="pt-2 border-t border-dashed border-[#212121] flex items-center justify-between text-xs">
                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-800 hover:text-black underline font-mono text-[11px] flex items-center space-x-0.5 font-bold"
                      >
                        <span>GitHub</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>

                      {isAlreadyShowcased ? (
                        <span className="paper-badge text-[10px] font-bold bg-emerald-100 text-emerald-950 border-emerald-700 py-0.5 px-2 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Published</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenAddModal(repo)}
                          className="paper-button paper-button-dark text-xs py-1 px-2.5 font-bold min-h-[30px] flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Publish</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Add/Publish Project to Showcase */}
      {selectedRepoToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="bg-[#FEFCF6] paper-card max-w-md w-full p-3.5 sm:p-5 space-y-3.5 shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-dashed border-[#212121] pb-2 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                  PUBLISH WORK
                </span>
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                  Publish to Showcase
                </h3>
                <p className="text-[10px] text-stone-700 font-mono truncate">
                  {selectedRepoToAdd.full_name}
                </p>
              </div>
              <button
                id="close-add-modal-btn"
                aria-label="Close dialog"
                onClick={() => setSelectedRepoToAdd(null)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Smart Campus Navigation App"
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body min-h-[34px]"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Short Description &amp; Highlights
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Summarize what this project does, key features, or technologies used..."
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-0.5 min-h-[28px]">
                <input
                  type="checkbox"
                  id="add-featured-checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-3.5 h-3.5 border-1.5 border-[#212121] rounded-xs cursor-pointer"
                />
                <label htmlFor="add-featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold select-none">
                  Pin as Featured Project in Profile Spotlight
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-dashed border-[#212121]">
                <button
                  type="button"
                  onClick={() => setSelectedRepoToAdd(null)}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingInProgress}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold disabled:opacity-50 min-h-[34px]"
                >
                  {addingInProgress ? 'Publishing...' : 'Publish to Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Existing Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="bg-[#FEFCF6] paper-card max-w-md w-full p-3.5 sm:p-5 space-y-3.5 shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-dashed border-[#212121] pb-2 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                  EDIT PROJECT
                </span>
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                  Edit Project Details
                </h3>
                <p className="text-[10px] text-stone-700 font-mono truncate">
                  {editingProject.repo_full_name}
                </p>
              </div>
              <button
                id="close-edit-modal-btn"
                aria-label="Close dialog"
                onClick={() => setEditingProject(null)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={editingProject.custom_title || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_title: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body min-h-[34px]"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Short Description &amp; Highlights
                </label>
                <textarea
                  rows={3}
                  value={editingProject.custom_description || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_description: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-2 pt-0.5 min-h-[28px]">
                <input
                  type="checkbox"
                  id="edit-featured-checkbox"
                  checked={editingProject.is_featured}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, is_featured: e.target.checked })
                  }
                  className="w-3.5 h-3.5 border-1.5 border-[#212121] rounded-xs cursor-pointer"
                />
                <label htmlFor="edit-featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold select-none">
                  Pin as Featured Project in Profile Spotlight
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-dashed border-[#212121]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Preview Project Details */}
      {previewProject && (
        <div 
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewProject(null)}
        >
          <div 
            className="bg-[#FEFCF6] paper-card max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-[6px_6px_0px_#000] max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] pb-3">
              <div>
                {previewProject.is_featured && (
                  <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[9px] font-bold mb-1.5 inline-block">
                    Featured Spotlight
                  </span>
                )}
                <h2 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
                  {previewProject.custom_title || previewProject.repo_full_name.split('/')[1]}
                </h2>
                <p className="text-xs font-mono text-stone-700">
                  {previewProject.repo_full_name}
                </p>
              </div>
              <button 
                onClick={() => setPreviewProject(null)} 
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Live GitHub Telemetry */}
              <div className="flex items-center space-x-3 text-xs font-mono text-stone-800 font-bold py-1 border-b border-dashed border-[#212121]/50 pb-2">
                <span className="flex items-center space-x-1" title="Actual GitHub Stars">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
                  <span>{previewProject.live_stats?.stars ?? 0} stars</span>
                </span>
                <span className="flex items-center space-x-1" title="GitHub Forks">
                  <GitFork className="w-3.5 h-3.5 text-stone-600" />
                  <span>{previewProject.live_stats?.forks ?? 0} forks</span>
                </span>
                {previewProject.live_stats?.language && (
                  <span className="paper-badge text-[10px] bg-stone-200">
                    {previewProject.live_stats.language}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-serif-body text-stone-800 leading-relaxed">
                {previewProject.custom_description || previewProject.live_stats?.description || 'No description provided.'}
              </p>

              {previewProject.live_stats?.topics && previewProject.live_stats.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {previewProject.live_stats.topics.map((topic, i) => (
                    <span key={i} className="paper-badge text-[9px] font-mono">#{topic}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-3 border-t border-dashed border-[#212121]">
                {previewProject.live_stats?.homepage && (
                  <a
                    href={previewProject.live_stats.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="paper-button text-xs py-2 px-3 font-bold inline-flex items-center space-x-1"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Visit Live Site</span>
                  </a>
                )}
                <a
                  href={previewProject.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="paper-button paper-button-dark text-xs py-2 px-3 font-bold inline-flex items-center space-x-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>View on GitHub</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
