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
  updateShowcaseProject,
  subscribeSchemaStatus 
} from '../lib/showcaseStore';

interface DashboardViewProps {
  navigate: (route: string) => void;
  onOpenOnboarding?: () => void;
  onOpenGuide?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigate, onOpenOnboarding, onOpenGuide }) => {
  const { user, profile, githubToken, updateProfileData, isDemoMode, isConfigured } = useAuth();

  // State
  const [showcased, setShowcased] = useState<ShowcasedProject[]>([]);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  const [activeTab, setActiveTab] = useState<'showcase' | 'repos' | 'profile'>('showcase');
  const [repoSearch, setRepoSearch] = useState('');
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);
  
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
    <div className="space-y-6 pb-10 text-[#212121]">
      {/* Top Student Card */}
      <div className="paper-card bg-[#FAF6EC] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[2px_2px_0px_#212121]">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={profile?.github_username || 'Student'}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
              STUDENT DESK &bull; ISU CAUAYAN
            </span>
            <h1 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
              {profile?.full_name || 'My Projects'}
            </h1>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700">
              @{username} &bull; {profile?.program || 'BS Computer Science'} &bull; {profile?.year_level || '3rd Year'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {onOpenOnboarding && (
            <button
              id="reopen-onboarding-btn"
              onClick={onOpenOnboarding}
              className="paper-button text-xs py-1.5 px-3"
            >
              <Sparkles className="w-3.5 h-3.5 text-stone-700 mr-1.5" />
              <span>Setup Wizard</span>
            </button>
          )}

          <button
            id="view-public-profile-btn"
            onClick={() => navigate(`/u/${username}`)}
            className="flex-1 sm:flex-initial paper-button paper-button-dark text-xs py-1.5 px-3.5 font-bold"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            <span>View Public Page</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </div>

      {/* GitHub Commit Heatmap on Desk */}
      <CommitHeatmap username={username} compact={false} />

      {isSchemaMissing && (
        <div className="p-3.5 bg-amber-50 border-2 border-amber-500 paper-card text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold uppercase tracking-wider font-headline text-[11px]">
                Supabase Tables Pending Creation
              </p>
              <p className="font-serif-body text-stone-800 text-xs">
                Your database URL is connected, but the tables (<code>showcased_projects</code>, <code>profiles</code>) haven't been run yet in the Supabase SQL editor. The app is running smoothly using client-side offline storage.
              </p>
            </div>
          </div>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="paper-button text-xs py-1 px-3 whitespace-nowrap font-bold flex-shrink-0"
            >
              Open SQL Setup Guide
            </button>
          )}
        </div>
      )}

      {isDemoMode && (
        <div className="p-3 bg-[#EFE9DB] paper-card text-[#212121] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-stone-800 flex-shrink-0" />
            <span>
              <strong>DEMO MODE ACTIVE</strong>: You can test adding/editing repositories and updating your profile data.
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b-2 border-dashed border-[#212121] flex flex-wrap gap-2 pb-1">
        <button
          id="tab-showcase-btn"
          onClick={() => setActiveTab('showcase')}
          className={`paper-button text-xs py-1.5 px-3.5 font-bold ${
            activeTab === 'showcase'
              ? 'paper-button-dark'
              : ''
          }`}
        >
          <Bookmark className="w-3.5 h-3.5 mr-1.5 inline-block" />
          <span>Published Projects ({showcased.length})</span>
        </button>

        <button
          id="tab-add-repos-btn"
          onClick={() => setActiveTab('repos')}
          className={`paper-button text-xs py-1.5 px-3.5 font-bold ${
            activeTab === 'repos'
              ? 'paper-button-dark'
              : ''
          }`}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5 inline-block" />
          <span>Import from GitHub</span>
        </button>

        <button
          id="tab-profile-btn"
          onClick={() => setActiveTab('profile')}
          className={`paper-button text-xs py-1.5 px-3.5 font-bold ${
            activeTab === 'profile'
              ? 'paper-button-dark'
              : ''
          }`}
        >
          <User className="w-3.5 h-3.5 mr-1.5 inline-block" />
          <span>Edit Profile &amp; Bio</span>
        </button>
      </div>

      {/* TAB 1: Showcased Projects */}
      {activeTab === 'showcase' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-dashed border-[#212121] pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
                Published Work &bull; {showcased.length} Repositories
              </h2>
              <p className="text-xs sm:text-sm font-serif-body text-stone-700">
                These dispatches appear on your public showcase page at <code className="bg-stone-200 px-1 py-0.5 font-mono text-[11px] border border-stone-400 rounded-xs">/u/{username}</code>.
              </p>
            </div>

            <button
              onClick={() => setActiveTab('repos')}
              className="paper-button text-xs py-1.5 px-3 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Import More Repos</span>
            </button>
          </div>

          {loadingShowcase ? (
            <div className="text-center py-12 paper-card bg-[#FEFCF6]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">Loading dispatches...</p>
            </div>
          ) : showcased.length === 0 ? (
            <div className="text-center py-12 px-4 paper-card bg-[#FEFCF6] space-y-3 border-dashed">
              <Newspaper className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">No projects published yet</h3>
                <p className="text-xs sm:text-sm font-serif-body text-stone-700 max-w-sm mx-auto">
                  Pick your best repositories from GitHub to display them on your public profile.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('repos')}
                className="paper-button paper-button-dark text-xs py-2 px-4 font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Browse GitHub Repositories</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {showcased.map((proj) => (
                <div
                  key={proj.id}
                  className={`p-5 paper-card transition-all ${
                    proj.is_featured
                      ? 'bg-[#FAF6EC]'
                      : 'bg-[#FEFCF6]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {proj.is_featured && (
                          <span className="paper-badge bg-amber-200 text-amber-950 border-amber-800 text-[10px] font-bold">
                            <Pin className="w-2.5 h-2.5 mr-1" />
                            LEAD DISPATCH
                          </span>
                        )}
                        <span className="text-xs font-mono text-stone-700 truncate max-w-[200px]">
                          {proj.repo_full_name}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                        {proj.custom_title || proj.repo_full_name.split('/')[1]}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        title={proj.is_featured ? 'Unpin from top' : 'Pin to top as lead dispatch'}
                        onClick={() => handleToggleFeatured(proj)}
                        className={`paper-button p-1.5 ${
                          proj.is_featured ? 'paper-button-dark' : ''
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${proj.is_featured ? 'fill-white' : ''}`} />
                      </button>

                      <button
                        title="Edit title / context description"
                        onClick={() => setEditingProject(proj)}
                        className="paper-button p-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        title="Remove from publication"
                        onClick={() => handleRemoveProject(proj.id)}
                        className="paper-button p-1.5 text-rose-800 hover:bg-rose-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-serif-body text-stone-700 mt-2 line-clamp-3 leading-relaxed">
                    {proj.custom_description || 'No custom context notes provided.'}
                  </p>

                  <div className="pt-3 mt-3 border-t-2 border-dashed border-[#212121] flex items-center justify-between text-xs font-mono">
                    <a
                      href={proj.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-stone-900 hover:text-black underline flex items-center space-x-1 font-bold"
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
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-dashed border-[#212121] pb-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
                Available Repositories from GitHub
              </h2>
              <p className="text-xs sm:text-sm font-serif-body text-stone-700">
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
                  className="w-full pl-8 pr-3 py-1.5 paper-input text-xs font-mono text-[#212121]"
                />
              </div>

              <button
                onClick={loadGitHubRepos}
                className="paper-button p-2"
                title="Refresh GitHub Repositories"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRepos ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadingRepos ? (
            <div className="text-center py-12 paper-card bg-[#FEFCF6]">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-700" />
              <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 mt-2 font-bold">Fetching live from GitHub API...</p>
            </div>
          ) : filteredAvailableRepos.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6]">
              <p className="text-xs sm:text-sm font-serif-body text-stone-700">No repositories found matching "{repoSearch}".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAvailableRepos.map((repo) => {
                const isAlreadyShowcased = showcasedRepoNames.has(repo.full_name);

                return (
                  <div
                    key={repo.id}
                    className={`p-5 paper-card transition-all ${
                      isAlreadyShowcased
                        ? 'bg-[#FAF6EC] opacity-90'
                        : 'bg-[#FEFCF6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121]">
                            {repo.name}
                          </h3>
                          {repo.fork && (
                            <span className="paper-badge text-[10px] font-mono">
                              Fork
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 font-mono">
                          {repo.full_name}
                        </p>
                      </div>

                      {isAlreadyShowcased ? (
                        <span className="paper-badge text-[11px] font-bold bg-stone-200">
                          <CheckCircle2 className="w-3 h-3 mr-1 inline-block" />
                          Published
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenAddModal(repo)}
                          className="paper-button paper-button-dark text-xs py-1 px-3 font-bold"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          <span>Publish</span>
                        </button>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm font-serif-body text-stone-700 mt-2 line-clamp-2 leading-relaxed">
                      {repo.description || 'No description provided on GitHub.'}
                    </p>

                    <div className="pt-3 mt-3 border-t-2 border-dashed border-[#212121] flex items-center justify-between text-xs font-mono text-stone-700 font-bold">
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
                        <ExternalLink className="w-3.5 h-3.5" />
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
        <div className="max-w-2xl bg-[#FEFCF6] paper-card p-6 space-y-5">
          <div className="border-b-2 border-dashed border-[#212121] pb-3">
            <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
              STUDENT PROFILE
            </span>
            <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
              Author Credentials &amp; Bio
            </h2>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700">
              Customize how your headline, degree, and 50-character bio appear across GitShowcase.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                Full Student Name
              </label>
              <input
                id="edit-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Mark Anthony Reyes"
                className="w-full px-3 py-2 paper-input text-[#212121] text-xs font-serif-body"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                  Student / Professional Headline
                </label>
                <span className="text-[10px] font-sketch text-stone-600 font-bold">e.g. Program &amp; Tech Focus</span>
              </div>
              <input
                id="edit-headline-input"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. BS Computer Science • Full-Stack Developer"
                className="w-full px-3 py-2 paper-input text-[#212121] text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Degree / Academic Program
                </label>
                <input
                  id="edit-program-input"
                  type="text"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  placeholder="e.g. BS Computer Science"
                  className="w-full px-3 py-2 paper-input text-[#212121] text-xs font-serif-body"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Year Level
                </label>
                <select
                  id="edit-year-select"
                  value={yearLevel}
                  onChange={(e) => setYearLevel(e.target.value)}
                  className="w-full px-3 py-2 paper-input text-[#212121] text-xs font-serif-body"
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
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                  About Me <span className="text-stone-600 font-normal">(Max 50 Characters)</span>
                </label>
                <span
                  className={`text-xs font-mono font-bold ${
                    bio.length > 50 ? 'text-red-600' : bio.length >= 45 ? 'text-amber-800' : 'text-stone-700'
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
                className={`w-full px-3 py-2 paper-input text-[#212121] text-xs font-serif-body ${
                  bio.length >= 50 ? 'border-amber-600 ring-2 ring-amber-600' : ''
                }`}
              />
              <p className="text-[11px] font-serif-body italic text-stone-600 mt-1">
                Max 50 characters for a fast, punchy bio on your GitShowcase portfolio card.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {profileSaved ? (
                <span className="paper-badge bg-emerald-100 text-emerald-950 border-emerald-800 text-xs font-bold">
                  <Check className="w-3.5 h-3.5 mr-1 inline-block" />
                  Profile Saved
                </span>
              ) : (
                <span></span>
              )}

              <button
                id="save-profile-btn"
                type="submit"
                disabled={profileSaving}
                className="paper-button paper-button-dark text-xs py-2 px-4 font-bold disabled:opacity-50"
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
          <div className="bg-[#FEFCF6] paper-card max-w-lg w-full p-6 space-y-4 shadow-[8px_8px_0px_#000]">
            <div className="flex items-start justify-between border-b-2 border-dashed border-[#212121] pb-3">
              <div>
                <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                  SHOWCASE PROJECT
                </span>
                <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  Publish to Student Showcase
                </h3>
                <p className="text-xs text-stone-700 font-mono">
                  {selectedRepoToAdd.full_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRepoToAdd(null)}
                className="paper-button w-7 h-7 flex items-center justify-center font-bold text-sm text-stone-800"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Project Title
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Smart Campus Navigation App"
                  className="w-full px-3 py-2 paper-input text-xs font-serif-body"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Description &amp; Key Features
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Summarize the project's purpose, technologies used, and your role..."
                  className="w-full px-3 py-2 paper-input text-xs font-serif-body"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 border-2 border-[#212121] rounded-xs cursor-pointer"
                />
                <label htmlFor="featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold">
                  Pin as Featured Project at Top of Page
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t-2 border-dashed border-[#212121]">
                <button
                  type="button"
                  onClick={() => setSelectedRepoToAdd(null)}
                  className="paper-button text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingInProgress}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold disabled:opacity-50"
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
          <div className="bg-[#FEFCF6] paper-card max-w-lg w-full p-6 space-y-4 shadow-[8px_8px_0px_#000]">
            <div className="flex items-start justify-between border-b-2 border-dashed border-[#212121] pb-3">
              <div>
                <span className="text-[11px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                  EDIT DETAILS
                </span>
                <h3 className="text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  Edit Project Details
                </h3>
                <p className="text-xs text-stone-700 font-mono">
                  {editingProject.repo_full_name}
                </p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="paper-button w-7 h-7 flex items-center justify-center font-bold text-sm text-stone-800"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Project Title
                </label>
                <input
                  type="text"
                  value={editingProject.custom_title || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_title: e.target.value })
                  }
                  className="w-full px-3 py-2 paper-input text-xs font-serif-body"
                />
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Description &amp; Key Features
                </label>
                <textarea
                  rows={3}
                  value={editingProject.custom_description || ''}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_description: e.target.value })
                  }
                  className="w-full px-3 py-2 paper-input text-xs font-serif-body"
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
                  className="w-4 h-4 border-2 border-[#212121] rounded-xs cursor-pointer"
                />
                <label htmlFor="edit-featured-checkbox" className="text-xs font-headline uppercase tracking-wider text-[#212121] cursor-pointer font-bold">
                  Pin as Featured Project at Top of Page
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t-2 border-dashed border-[#212121]">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="paper-button text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold"
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

