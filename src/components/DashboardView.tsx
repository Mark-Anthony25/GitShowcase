import React, { useState, useEffect } from 'react';
import { 
  Github, Plus, Trash2, Edit3, Star, GitFork, ExternalLink, 
  Check, Sparkles, AlertCircle, RefreshCw, Eye, Pin, Bookmark, 
  BookOpen, GraduationCap, User, ArrowUpRight, Search, CheckCircle2, Newspaper
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { GitHubRepoItem, ShowcasedProject } from '../types';
import { fetchUserRepos } from '../lib/github';
import { CommitHeatmap } from './CommitHeatmap';
import { 
  getStudentShowcasedProjects, 
  addProjectToShowcase, 
  removeProjectFromShowcase, 
  updateShowcaseProject 
} from '../lib/showcaseStore';

interface DashboardViewProps {
  navigate: (route: string) => void;
  onOpenOnboarding?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigate, onOpenOnboarding }) => {
  const { user, profile, githubToken, updateProfileData, isDemoMode } = useAuth();

  // State
  const [showcased, setShowcased] = useState<ShowcasedProject[]>([]);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  const [activeTab, setActiveTab] = useState<'showcase' | 'repos' | 'profile'>('showcase');
  const [repoSearch, setRepoSearch] = useState('');
  
  // Profile edit state
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [headline, setHeadline] = useState(profile?.headline || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [program, setProgram] = useState(profile?.program || 'BS Computer Science');
  const [yearLevel, setYearLevel] = useState(profile?.year_level || '3rd Year');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Modal for adding repo with custom metadata
  const [selectedRepoToAdd, setSelectedRepoToAdd] = useState<GitHubRepoItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [addingInProgress, setAddingInProgress] = useState(false);

  // Editing existing showcase project
  const [editingProject, setEditingProject] = useState<ShowcasedProject | null>(null);

  // Load showcase projects
  useEffect(() => {
    if (!user) return;
    loadShowcasedProjects();
  }, [user]);

  // Sync profile fields if profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setProgram(profile.program || 'BS Computer Science');
      setYearLevel(profile.year_level || '3rd Year');
    }
  }, [profile]);

  // Load GitHub repos when switching to 'repos' tab
  useEffect(() => {
    if (user && activeTab === 'repos' && availableRepos.length === 0) {
      loadGitHubRepos();
    }
  }, [user, activeTab]);

  const loadShowcasedProjects = async () => {
    if (!user) return;
    setLoadingShowcase(true);
    try {
      const items = await getStudentShowcasedProjects(user.id);
      setShowcased(items);
    } catch (err) {
      console.error('Error fetching showcase projects:', err);
    } finally {
      setLoadingShowcase(false);
    }
  };

  const loadGitHubRepos = async () => {
    setLoadingRepos(true);
    try {
      const repos = await fetchUserRepos(githubToken, profile?.github_username || 'isabela-coder');
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
          confetti({ particleCount: 50, spread: 50, origin: { y: 0.8 } });
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
    if (!confirm('Are you sure you want to remove this project from your publication?')) return;
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

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      await updateProfileData({
        full_name: fullName.trim() || null,
        headline: headline.trim() || null,
        bio: bio.trim().slice(0, 50) || null,
        program: program.trim() || null,
        year_level: yearLevel.trim() || null,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setProfileSaving(false);
    }
  };

  const showcasedRepoNames = new Set(showcased.map(p => p.repo_full_name));
  const filteredAvailableRepos = availableRepos.filter(repo => {
    const term = repoSearch.toLowerCase();
    return (
      repo.name.toLowerCase().includes(term) ||
      (repo.description && repo.description.toLowerCase().includes(term)) ||
      (repo.language && repo.language.toLowerCase().includes(term))
    );
  });

  const username = profile?.github_username || 'student';

  return (
    <div className="space-y-6 pb-12 text-[#1A1815]">
      {/* Top Student Card */}
      <div className="border border-[#1A1815] bg-[#F4F0E6] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 border border-[#1A1815] overflow-hidden bg-stone-300 flex-shrink-0">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={profile?.github_username || 'Student'}
              className="w-full h-full object-cover news-photo"
            />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
              STUDENT DESK &bull; ISU CAUAYAN
            </span>
            <h1 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
              {profile?.full_name || 'My Projects'}
            </h1>
            <p className="text-xs font-serif-headline italic text-stone-700">
              @{username} &bull; {profile?.program || 'BS Computer Science'} &bull; {profile?.year_level || '3rd Year'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {onOpenOnboarding && (
            <button
              id="reopen-onboarding-btn"
              onClick={onOpenOnboarding}
              className="inline-flex items-center justify-center space-x-1 px-3 py-1.5 bg-[#FAF8F2] hover:bg-[#EBE7DC] text-[#1A1815] text-xs font-headline uppercase tracking-wider transition-all border border-[#1A1815] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-700" />
              <span>Setup Wizard</span>
            </button>
          )}

          <button
            id="view-public-profile-btn"
            onClick={() => navigate(`/u/${username}`)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Public Page</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GitHub Commit Heatmap on Desk */}
      <CommitHeatmap username={username} compact={false} />

      {isDemoMode && (
        <div className="p-2.5 bg-[#EBE7DC] border border-[#1A1815] text-[#1A1815] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-stone-700 flex-shrink-0" />
            <span>
              <strong>DEMO MODE ACTIVE</strong>: You can test adding/editing repositories and updating your profile data.
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#1A1815] flex flex-wrap gap-1">
        <button
          id="tab-showcase-btn"
          onClick={() => setActiveTab('showcase')}
          className={`px-3.5 py-1.5 text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 border-t border-x cursor-pointer ${
            activeTab === 'showcase'
              ? 'bg-[#1A1815] text-[#FAF8F2] border-[#1A1815]'
              : 'bg-[#FAF8F2] text-stone-700 hover:bg-[#F4F0E6] border-transparent'
          }`}
        >
          <Bookmark className="w-3 h-3" />
          <span>Published Projects ({showcased.length})</span>
        </button>

        <button
          id="tab-add-repos-btn"
          onClick={() => setActiveTab('repos')}
          className={`px-3.5 py-1.5 text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 border-t border-x cursor-pointer ${
            activeTab === 'repos'
              ? 'bg-[#1A1815] text-[#FAF8F2] border-[#1A1815]'
              : 'bg-[#FAF8F2] text-stone-700 hover:bg-[#F4F0E6] border-transparent'
          }`}
        >
          <Plus className="w-3 h-3" />
          <span>Import from GitHub</span>
        </button>

        <button
          id="tab-profile-btn"
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-1.5 text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 border-t border-x cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-[#1A1815] text-[#FAF8F2] border-[#1A1815]'
              : 'bg-[#FAF8F2] text-stone-700 hover:bg-[#F4F0E6] border-transparent'
          }`}
        >
          <User className="w-3 h-3" />
          <span>Edit Profile &amp; Bio</span>
        </button>
      </div>

      {/* TAB 1: Showcased Projects */}
      {activeTab === 'showcase' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D6D0C4] pb-3">
            <div>
              <h2 className="text-xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
                Published Work &bull; {showcased.length} Repositories
              </h2>
              <p className="text-xs font-serif-body text-stone-600">
                These dispatches appear on your public showcase page at <code className="bg-stone-200 px-1 py-0.5 font-mono text-[11px]">/u/{username}</code>.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('repos')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#FAF8F2] text-[#1A1815] border border-[#1A1815] text-xs font-headline uppercase tracking-wider hover:bg-stone-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Import More Repos</span>
            </button>
          </div>

          {loadingShowcase ? (
            <div className="text-center py-12 border border-[#1A1815] bg-[#FAF8F2]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-mono uppercase tracking-wider text-stone-700 mt-2">Loading dispatches...</p>
            </div>
          ) : showcased.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-[#1A1815] bg-[#FAF8F2] space-y-3">
              <Newspaper className="w-8 h-8 text-stone-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">No projects published yet</h3>
                <p className="text-xs font-serif-body text-stone-600 max-w-sm mx-auto">
                  Pick your best repositories from GitHub to display them on your public profile.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('repos')}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-[#1A1815] text-[#FAF8F2] text-xs font-headline uppercase tracking-wider hover:bg-stone-800 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Browse GitHub Repositories</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showcased.map((proj) => (
                <div
                  key={proj.id}
                  className={`p-4 border transition-all ${
                    proj.is_featured
                      ? 'bg-[#F4F0E6] border-[#1A1815] border-2 shadow-xs'
                      : 'bg-[#FAF8F2] border-[#1A1815]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {proj.is_featured && (
                          <span className="inline-flex items-center text-[10px] font-headline font-bold uppercase tracking-wider text-stone-900 bg-stone-300 border border-stone-500 px-1.5 py-0.5">
                            <Pin className="w-2.5 h-2.5 mr-1" />
                            LEAD DISPATCH
                          </span>
                        )}
                        <span className="text-xs font-mono text-stone-600 truncate max-w-[200px]">
                          {proj.repo_full_name}
                        </span>
                      </div>
                      <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                        {proj.custom_title || proj.repo_full_name.split('/')[1]}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        title={proj.is_featured ? 'Unpin from top' : 'Pin to top as lead dispatch'}
                        onClick={() => handleToggleFeatured(proj)}
                        className={`p-1 border border-[#1A1815] transition-colors cursor-pointer ${
                          proj.is_featured ? 'bg-[#1A1815] text-[#FAF8F2]' : 'bg-[#FAF8F2] text-[#1A1815] hover:bg-stone-200'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${proj.is_featured ? 'fill-white' : ''}`} />
                      </button>

                      <button
                        title="Edit title / context description"
                        onClick={() => setEditingProject(proj)}
                        className="p-1 border border-[#1A1815] bg-[#FAF8F2] text-[#1A1815] hover:bg-stone-200 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Remove from publication"
                        onClick={() => handleRemoveProject(proj.id)}
                        className="p-1 border border-[#1A1815] bg-[#FAF8F2] text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-serif-body text-stone-700 mt-2 line-clamp-3 leading-relaxed">
                    {proj.custom_description || 'No custom context notes provided.'}
                  </p>

                  <div className="pt-3 mt-3 border-t border-[#D6D0C4] flex items-center justify-between text-xs font-mono">
                    <a
                      href={proj.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-800 hover:text-black underline flex items-center space-x-1"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Inspect Repository</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Add from GitHub Repos */}
      {activeTab === 'repos' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D6D0C4] pb-3">
            <div>
              <h2 className="text-xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
                Available Repositories from GitHub
              </h2>
              <p className="text-xs font-serif-body text-stone-600">
                Select any repository to draft an article and publish it to your classmate showcase.
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter repositories..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-[#1A1815] bg-[#FAF8F2] text-xs font-mono text-[#1A1815] focus:outline-none"
                />
              </div>

              <button
                onClick={loadGitHubRepos}
                className="p-1.5 border border-[#1A1815] bg-[#FAF8F2] hover:bg-stone-200 text-[#1A1815] transition-colors cursor-pointer"
                title="Refresh GitHub Repositories"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingRepos ? (
            <div className="text-center py-12 border border-[#1A1815] bg-[#FAF8F2]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-mono uppercase tracking-wider text-stone-700 mt-2">Fetching live from GitHub API...</p>
            </div>
          ) : filteredAvailableRepos.length === 0 ? (
            <div className="text-center py-10 px-4 border border-[#1A1815] bg-[#FAF8F2]">
              <p className="text-xs font-serif-body text-stone-700">No repositories found matching "{repoSearch}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAvailableRepos.map((repo) => {
                const isAlreadyShowcased = showcasedRepoNames.has(repo.full_name);

                return (
                  <div
                    key={repo.id}
                    className={`p-4 border transition-all ${
                      isAlreadyShowcased
                        ? 'bg-[#F4F0E6] border-stone-400 opacity-90'
                        : 'bg-[#FAF8F2] border-[#1A1815]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-[900] uppercase font-newspaper-title text-[#1A1815]">
                            {repo.name}
                          </h3>
                          {repo.fork && (
                            <span className="text-[10px] font-mono uppercase bg-stone-300 border border-stone-500 px-1">
                              Fork
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 font-mono">
                          {repo.full_name}
                        </p>
                      </div>

                      {isAlreadyShowcased ? (
                        <span className="inline-flex items-center text-[11px] font-headline uppercase tracking-wider text-stone-700 bg-stone-200 border border-stone-400 px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Published
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenAddModal(repo)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Publish</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs font-serif-body text-stone-700 mt-2 line-clamp-2 leading-relaxed">
                      {repo.description || 'No description provided on GitHub.'}
                    </p>

                    <div className="pt-3 mt-3 border-t border-[#D6D0C4] flex items-center justify-between text-xs font-mono text-stone-600">
                      <div className="flex items-center space-x-3">
                        {repo.language && (
                          <span className="flex items-center space-x-1">
                            <span className="w-2 h-2 rounded-full bg-stone-800"></span>
                            <span>{repo.language}</span>
                          </span>
                        )}
                        <span className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-stone-700" />
                          <span>{repo.stargazers_count}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <GitFork className="w-3 h-3 text-stone-700" />
                          <span>{repo.forks_count}</span>
                        </span>
                      </div>

                      <a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-800 hover:text-black p-0.5"
                        title="Open repo on GitHub"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Edit Profile & Bio */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl bg-[#FAF8F2] border border-[#1A1815] p-6 space-y-5">
          <div className="border-b border-[#D6D0C4] pb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
              STUDENT PROFILE
            </span>
            <h2 className="text-xl font-[900] uppercase font-newspaper-title text-[#1A1815]">
              Author Credentials &amp; Bio
            </h2>
            <p className="text-xs font-serif-body text-stone-600">
              Customize how your headline, degree, and 50-character bio appear across GitShowcase.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                Full Student Name
              </label>
              <input
                id="edit-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mark Anthony Reyes"
                className="w-full px-3 py-2 border border-[#1A1815] bg-white text-[#1A1815] text-xs font-serif-headline focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815]">
                  Student / Professional Headline
                </label>
                <span className="text-[10px] font-mono text-stone-500">e.g. Program &amp; Tech Focus</span>
              </div>
              <input
                id="edit-headline-input"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. BS Computer Science • Full-Stack Developer"
                className="w-full px-3 py-2 border border-[#1A1815] bg-white text-[#1A1815] text-xs font-mono focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Degree / Academic Program
                </label>
                <input
                  id="edit-program-input"
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g. BS Computer Science"
                  className="w-full px-3 py-2 border border-[#1A1815] bg-white text-[#1A1815] text-xs font-serif-headline focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Year Level
                </label>
                <select
                  id="edit-year-select"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-[#1A1815] bg-white text-[#1A1815] text-xs font-serif-headline focus:outline-none"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate / Alumni">Graduate / Alumni</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815]">
                  About Me <span className="text-stone-500">(Max 50 Characters)</span>
                </label>
                <span
                  className={`text-xs font-mono font-bold ${
                    bio.length > 50 ? 'text-red-600' : bio.length >= 45 ? 'text-amber-700' : 'text-stone-600'
                  }`}
                >
                  {bio.length} / 50 characters
                </span>
              </div>
              <input
                id="edit-bio-textarea"
                type="text"
                maxLength={50}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 50))}
                placeholder="Crisp 50-character summary of your tech passion..."
                className={`w-full px-3 py-2 border bg-white text-[#1A1815] text-xs font-serif-body focus:outline-none ${
                  bio.length >= 50 ? 'border-amber-600 ring-1 ring-amber-600' : 'border-[#1A1815]'
                }`}
              />
              <p className="text-[11px] font-serif-body italic text-stone-600 mt-1">
                Max 50 characters for a fast, punchy bio on your GitShowcase portfolio card.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {profileSaved ? (
                <span className="inline-flex items-center text-xs font-headline uppercase text-stone-900 bg-[#F4F0E6] border border-[#1A1815] px-2 py-1">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Profile Saved
                </span>
              ) : (
                <span></span>
              )}

              <button
                id="save-profile-btn"
                type="submit"
                disabled={profileSaving}
                className="px-4 py-2 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Project to Showcase */}
      {selectedRepoToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border-2 border-[#1A1815] max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#D6D0C4] pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
                  SHOWCASE PROJECT
                </span>
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                  Publish to Student Showcase
                </h3>
                <p className="text-xs text-stone-600 font-mono">
                  {selectedRepoToAdd.full_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRepoToAdd(null)}
                className="w-6 h-6 border border-[#1A1815] bg-[#F4F0E6] flex items-center justify-center font-bold text-xs text-stone-800 hover:bg-stone-300 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Smart Campus Navigation App"
                  className="w-full px-3 py-1.5 border border-[#1A1815] bg-white text-xs font-serif-headline focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Description &amp; Key Features
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Summarize the project's purpose, technologies used, and your role..."
                  className="w-full px-3 py-1.5 border border-[#1A1815] bg-white text-xs font-serif-body focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 border border-[#1A1815]"
                />
                <label htmlFor="featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#1A1815] cursor-pointer">
                  Pin as Featured Project at Top of Page
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#D6D0C4]">
                <button
                  type="button"
                  onClick={() => setSelectedRepoToAdd(null)}
                  className="px-3 py-1.5 text-xs font-headline uppercase tracking-wider text-stone-700 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingInProgress}
                  className="px-3.5 py-1.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                >
                  {addingInProgress ? 'Publishing...' : 'Publish to Showcase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FAF8F2] border-2 border-[#1A1815] max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between border-b border-[#D6D0C4] pb-2.5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-stone-600 block">
                  EDIT DETAILS
                </span>
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#1A1815]">
                  Edit Project Details
                </h3>
                <p className="text-xs text-stone-600 font-mono">
                  {editingProject.repo_full_name}
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="w-6 h-6 border border-[#1A1815] bg-[#F4F0E6] flex items-center justify-center font-bold text-xs text-stone-800 hover:bg-stone-300 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Project Title
                </label>
                <input
                  type="text"
                  value={editingProject.custom_title || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_title: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-[#1A1815] bg-white text-xs font-serif-headline focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#1A1815] mb-1">
                  Description &amp; Key Features
                </label>
                <textarea
                  rows={3}
                  value={editingProject.custom_description || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_description: e.target.value })
                  }
                  className="w-full px-3 py-1.5 border border-[#1A1815] bg-white text-xs font-serif-body focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-featured-checkbox"
                  checked={editingProject.is_featured}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, is_featured: e.target.checked })
                  }
                  className="w-4 h-4 border border-[#1A1815]"
                />
                <label htmlFor="edit-featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#1A1815] cursor-pointer">
                  Pin as Featured Project at Top of Page
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#D6D0C4]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 text-xs font-headline uppercase tracking-wider text-stone-700 hover:text-black cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#1A1815] hover:bg-stone-800 text-[#FAF8F2] text-xs font-headline uppercase tracking-wider transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

