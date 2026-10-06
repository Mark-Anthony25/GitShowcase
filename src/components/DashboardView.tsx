import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, Plus, Trash2, Edit3, Star, GitFork, ExternalLink, 
  RefreshCw, Eye, Search, CheckCircle2, FolderGit2, 
  X, Globe, Sparkles, AlertCircle, Layers, Key, Upload, Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { getStarCountLabel } from '../lib/projectStats';
import { GitHubRepoItem, ShowcasedProject } from '../types';
import { fetchUserRepos, getValidToken } from '../lib/github';
import { 
  getStudentShowcasedProjects, 
  addProjectToShowcase, 
  removeProjectFromShowcase, 
  updateShowcaseProject,
  subscribeSchemaStatus,
  MAX_SHOWCASE_PROJECTS,
  ShowcaseLoadError,
} from '../lib/showcaseStore';
import { 
  compressScreenshot, 
  uploadProjectScreenshot, 
  ImageProcessingError, inspectImage, deleteLegacyProjectScreenshot
} from '../lib/imageCompression';
import { Skeleton } from './Skeleton';

interface DashboardViewProps {
  navigate: (route: string) => void;
  onOpenOnboarding?: () => void;
  onOpenGuide?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ navigate, onOpenGuide }) => {
  const { user, profile, githubToken, signInWithGitHub } = useAuth();

  // State
  const [showcased, setShowcased] = useState<ShowcasedProject[]>([]);
  const [availableRepos, setAvailableRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [loadingShowcase, setLoadingShowcase] = useState(true);
  const [activeTab, setActiveTab] = useState<'showcase' | 'repos'>('showcase');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSchemaMissing, setIsSchemaMissing] = useState(false);

  // Modal for adding repo with custom metadata
  const [selectedRepoToAdd, setSelectedRepoToAdd] = useState<GitHubRepoItem | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [addingInProgress, setAddingInProgress] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<Blob | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const [showRepositoryLink, setShowRepositoryLink] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const selection = useRef({add: 0, edit: 0});
  useEffect(() => () => { if (screenshotPreview?.startsWith('blob:')) URL.revokeObjectURL(screenshotPreview); }, [screenshotPreview]);
  useEffect(() => {
    selection.current.add++; setIsCompressing(false); setShowRepositoryLink(false);
    if (!selectedRepoToAdd) { setScreenshotFile(null); setScreenshotPreview(null); }
  }, [selectedRepoToAdd]);

  // Editing existing showcase project
  const [editingProject, setEditingProject] = useState<ShowcasedProject | null>(null);
  const [editScreenshotFile, setEditScreenshotFile] = useState<Blob | null>(null);
  const [editScreenshotPreview, setEditScreenshotPreview] = useState<string | null>(null);
  const [isEditCompressing, setIsEditCompressing] = useState(false);
  useEffect(() => () => { if (editScreenshotPreview?.startsWith('blob:')) URL.revokeObjectURL(editScreenshotPreview); }, [editScreenshotPreview]);

  useEffect(() => {
    selection.current.edit++; setIsEditCompressing(false); setEditError(null);
    setEditScreenshotFile(null); setEditScreenshotPreview(null);
  }, [editingProject?.id]);

  // Previewing project detail
  const [previewProject, setPreviewProject] = useState<ShowcasedProject | null>(null);

  const [removeError, setRemoveError] = useState<string | null>(null);
  // Project awaiting an explicit PaperCSS-styled unpublish confirmation
  const [projectPendingUnpublish, setProjectPendingUnpublish] = useState<ShowcasedProject | null>(null);

  // Subscribe to schema missing alerts
  useEffect(() => {
    const unsub = subscribeSchemaStatus((missing) => {
      setIsSchemaMissing(missing);
    });
    return unsub;
  }, []);

  // Load showcase projects - re-run when user or token updates
  useEffect(() => {
    if (!user) return;
    loadShowcasedProjects(true);
  }, [user, githubToken]);

  // Load GitHub repos when switching to 'repos' tab or when user/token/profile arrives
  useEffect(() => {
    if (user && (activeTab === 'repos' || availableRepos.length === 0)) {
      loadGitHubRepos(true);
    }
  }, [user, activeTab, githubToken, profile?.github_username]);

  const loadShowcasedProjects = async (force = false) => {
    if (!user) return;
    setLoadingShowcase(true);
    try {
      const effectiveToken = getValidToken(githubToken);
      const items = await getStudentShowcasedProjects(user.id, effectiveToken, force);
      setShowcased(items);
    } catch (err) {
      console.error('Error fetching showcase projects:', err);
    } finally {
      setLoadingShowcase(false);
    }
  };

  const loadGitHubRepos = async (force = false) => {
    const resolvedUsername = 
      profile?.github_username || 
      (user?.user_metadata as any)?.user_name || 
      (user?.user_metadata as any)?.preferred_username || 
      null;

    const effectiveToken = getValidToken(githubToken);

    if (!effectiveToken && !resolvedUsername) {
      return;
    }

    setLoadingRepos(true);
    setRepoError(null);
    try {
      const repos = await fetchUserRepos(effectiveToken, resolvedUsername, force);
      setAvailableRepos(repos);
    } catch (err: any) {
      console.error('Error loading GitHub repos:', err);
      setRepoError('Unable to load GitHub repositories. Try reconnecting with GitHub or enter a Personal Access Token.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handlePromptAddToken = () => {
    setRepoError('Personal GitHub tokens are not stored in the browser. Reconnect your GitHub account and retry.');
  };

  const handleOpenAddModal = (repo: GitHubRepoItem) => {
    setSelectedRepoToAdd(repo);
    setCustomTitle(repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    setCustomDescription((repo.description || '').slice(0,99));
    setAddError(null); setUploadProgress(null);
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleLocalPreviewError = (isEdit: boolean) => {
    selection.current[isEdit ? 'edit' : 'add']++;
    (isEdit ? setIsEditCompressing : setIsCompressing)(false);
    (isEdit ? setEditScreenshotFile : setScreenshotFile)(null);
    (isEdit ? setEditScreenshotPreview : setScreenshotPreview)(null);
    (isEdit ? setEditError : setAddError)('Cannot display this preview. Select the image again or use the GitHub preview.');
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    const key = isEdit ? 'edit' : 'add', request = ++selection.current[key];
    const setBusy = isEdit ? setIsEditCompressing : setIsCompressing;
    const setFile = isEdit ? setEditScreenshotFile : setScreenshotFile;
    const setPreview = isEdit ? setEditScreenshotPreview : setScreenshotPreview;
    const setError = isEdit ? setEditError : setAddError;
    setBusy(true); setError(null); setFile(null); setPreview(null);
    try {
      await inspectImage(file);
      if (selection.current[key] !== request) return;
      setPreview(URL.createObjectURL(file));
      const result = await compressScreenshot(file);
      if (selection.current[key] !== request) return;
      setFile(result.blob); setPreview(URL.createObjectURL(result.blob));
    } catch (error) {
      if (selection.current[key] !== request) return;
      console.error('Project preview failed', {type:file.type,size:file.size,error,step:(error as ImageProcessingError).step,details:(error as ImageProcessingError).details});
      setPreview(null);
      setError(error instanceof ImageProcessingError ? error.message : 'Could not read the image. Select it again.');
    } finally { if (selection.current[key] === request) setBusy(false); }
  };

  const handleConfirmAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedRepoToAdd || addingInProgress || isCompressing) return;


    setAddingInProgress(true);
    setAddError(null);
    try {
      let newProj = await addProjectToShowcase({
        profileId: user.id, repoFullName: selectedRepoToAdd.full_name,
        repoUrl: selectedRepoToAdd.html_url, customTitle: customTitle.trim() || null,
        customDescription: customDescription.trim() || null, showRepositoryLink, token: githubToken,
      });
      if (!newProj) throw new Error('Could not save project.');
      // Create the owned project first, so uploads cannot be unattached objects.
      if (screenshotFile) {
        const {url} = await uploadProjectScreenshot(screenshotFile, user.id, newProj.id, setUploadProgress);
        const updated = await updateShowcaseProject(newProj.id, {screenshot_url:url}, user.id);
        if (!updated) throw new Error('Could not save the preview. Retry publishing.');
        newProj = updated;
      }

      if (newProj) {
        setShowcased(prev => {
          const filtered = prev.filter(
            p => p.repo_full_name.trim().toLowerCase() !== newProj.repo_full_name.trim().toLowerCase()
          );
          return [newProj, ...filtered];
        });
        setSelectedRepoToAdd(null);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setActiveTab('showcase');
        try {
          confetti({ particleCount: 40, spread: 45, origin: { y: 0.8 } });
        } catch {
          // confetti optional
        }
      }
    } catch (err: any) {
      if (err?.message === 'PROJECT_LIMIT_REACHED') {
        setAddError(`Showcase limit reached. You can publish at most ${MAX_SHOWCASE_PROJECTS} projects. Remove one to add another.`);
      } else {
        console.error('Failed to add project to showcase:', err);
        setAddError(err instanceof ImageProcessingError || err instanceof ShowcaseLoadError ? err.message : 'Failed to publish project. Please retry.');
      }
    } finally {
      setAddingInProgress(false); setUploadProgress(null);
    }
  };

  const handleRemoveProject = async () => {
    if (!projectPendingUnpublish) return;
    const projectId = projectPendingUnpublish.id;
    try {
      const removed = await removeProjectFromShowcase(projectId, user?.id);
      if (!removed) throw new Error("Could not remove the project. Please retry.");
      setShowcased(prev => prev.filter(p => p.id !== projectId));
      setProjectPendingUnpublish(null);
    } catch (err) {
      console.error('Failed to remove project:', err);
      setRemoveError(err instanceof Error ? err.message : 'Could not remove project. Please retry.');
    }
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || savingEdit || isEditCompressing) return;
    setSavingEdit(true); setEditError(null);
    try {
      let finalScreenshotUrl = editingProject.screenshot_url;
      if (editScreenshotFile && user) {
        await deleteLegacyProjectScreenshot(user.id, editingProject.id, editingProject.screenshot_url);
        const { url } = await uploadProjectScreenshot(
          editScreenshotFile,
          user.id,
          editingProject.id,
          setUploadProgress
        );
        finalScreenshotUrl = url;
      }

      const updated = await updateShowcaseProject(editingProject.id, {
        show_repository_link: editingProject.show_repository_link !== false,
        custom_title: editingProject.custom_title,
        custom_description: editingProject.custom_description,
        screenshot_url: finalScreenshotUrl,
      }, user?.id);
      if (!updated) throw new Error("Could not save the project. Retry saving.");
      if (updated) {
        setShowcased(prev => prev.map(p => (p.id === editingProject.id ? updated : p)));
        setEditingProject(null);
        setEditScreenshotFile(null);
        setEditScreenshotPreview(null);
      }
    } catch (err) {
      console.error('Failed to update showcase project:', err);
      setEditError(err instanceof ImageProcessingError ? err.message : 'Failed to save project. Please retry.');
    } finally { setSavingEdit(false); setUploadProgress(null); }
  };

  const showcasedRepoNames = new Set(showcased.map(p => p.repo_full_name.trim().toLowerCase()));

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
  const totalStars = showcased.reduce((acc, p) => acc + (p.live_stats?.stars ?? 0), 0);
  const isAtLimit = showcased.length >= MAX_SHOWCASE_PROJECTS;

  return (
    <div className="space-y-4 sm:space-y-5 pb-8 text-[#212121] w-full max-w-full">
      {/* Alert Notices */}
      {isSchemaMissing && (
        <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-500 paper-card text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold uppercase tracking-wider font-headline text-xs">
                Supabase Database Setup Incomplete
              </p>
              <p className="font-serif-body text-stone-800 text-xs">
                A required database table is unavailable. Ask the site owner to apply the latest Supabase setup SQL. Cloud publishing cannot finish until setup is repaired.
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

      {/* My Projects Masthead Banner */}
      <section className="paper-card bg-[#FEFCF6] p-3.5 sm:p-5 space-y-3.5">
        <div className="border-b border-dashed border-[#212121] pb-3.5">
          <div className="space-y-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-[900] uppercase font-newspaper-title text-[#212121] leading-tight flex items-center space-x-2">
              <span className="w-7 h-7 rounded-[255px_15px_225px_15px/15px_225px_15px_255px] border-1.5 border-[#212121] bg-[#FAF6EC] flex items-center justify-center flex-shrink-0">
                <FolderGit2 className="w-4 h-4 text-[#212121] stroke-[2]" />
              </span>
              <span>My Projects</span>
            </h1>
            <p className="text-xs sm:text-sm font-serif-body text-stone-700 max-w-2xl leading-relaxed">
              Manage, publish, edit, and curate your projects and GitHub repositories displayed across GitShowcase.
            </p>
          </div>
        </div>

        {/* Project Telemetry Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-0.5">
          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121]">
            <div className="flex items-center justify-between text-stone-700">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Published Projects</span>
              <FolderGit2 className="w-3.5 h-3.5 text-stone-600" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-[900] font-newspaper-title text-[#212121] leading-none block">
                {showcased.length} / {MAX_SHOWCASE_PROJECTS}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Max {MAX_SHOWCASE_PROJECTS} published
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121]">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-[9px] font-sketch uppercase font-bold tracking-wider">Total Stars</span>
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
            </div>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-[900] font-newspaper-title text-[#212121] leading-none block">
                {totalStars}
              </span>
              <span className="text-[10px] font-serif-body text-stone-600">
                Across public projects
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] col-span-2 sm:col-span-1">
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
            <span>Published Projects ({showcased.length}/{MAX_SHOWCASE_PROJECTS})</span>
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
            {(loadingShowcase || loadingRepos) ? <Skeleton className="h-3.5 w-3.5" /> : <RefreshCw className="w-3.5 h-3.5 text-stone-800" />}
          </button>
        </div>
      </div>

      {/* TAB 1: Published / Showcased Projects */}
      {activeTab === 'showcase' && (
        <div className="space-y-4">
          {loadingShowcase ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4" aria-label="Loading published projects">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="p-3.5 sm:p-4 paper-card bg-[#FEFCF6] space-y-3">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              ))}
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
            <div className="content-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredShowcased.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3.5 sm:p-4 paper-card bg-[#FEFCF6] flex flex-col justify-between space-y-3 transition-all"
                >
                  <div className="space-y-2">
                    {/* Status Badges & Controls Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-dashed border-[#212121] pb-2">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 min-w-0">
                        <span className="text-[10px] font-mono text-stone-700 truncate max-w-[170px]">
                          {proj.repo_full_name}
                        </span>
                      </div>

                      {/* Quick Action Icons */}
                      <div className="flex items-center space-x-1 flex-shrink-0">
                        <button
                          title="Edit project details"
                          aria-label="Edit project details"
                          onClick={() => setEditingProject({...proj,custom_description:proj.custom_description?.slice(0,99) || null})}
                          className="paper-button-icon min-w-[28px] min-h-[28px] p-1 text-stone-800 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>

                        <button
                          title="Unpublish from showcase"
                          aria-label="Unpublish project"
                          onClick={() => setProjectPendingUnpublish(proj)}
                          className="paper-button-icon min-w-[28px] min-h-[28px] p-1 text-rose-800 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Repository Preview Banner / Project UI Screenshot */}
                    <div className="w-full aspect-[16/9] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative mb-1.5 flex items-center justify-center">
                      <img
                        width={1280} height={720} loading="lazy" decoding="async"
                        src={proj.screenshot_url || `https://opengraph.githubassets.com/1/${proj.repo_full_name}`}
                        alt={proj.custom_title || proj.repo_full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          if (e.currentTarget.src !== `https://opengraph.githubassets.com/1/${proj.repo_full_name}`) {
                            e.currentTarget.src = `https://opengraph.githubassets.com/1/${proj.repo_full_name}`;
                          } else {
                            (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                          }
                        }}
                      />
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] leading-snug">
                      {proj.custom_title || proj.repo_full_name.split('/')[1]}
                    </h3>

                    {/* Description */}
                    <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
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
                        <span>{getStarCountLabel(proj.live_stats)}</span>
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
                      className="text-stone-800 font-bold flex items-center space-x-1 py-0.5 underline cursor-pointer"
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
                          className="text-stone-800 underline flex items-center space-x-0.5 font-bold"
                          title="Visit site"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Live</span>
                        </a>
                      )}
                      {proj.show_repository_link !== false && (<a
                        href={proj.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-900 underline flex items-center space-x-0.5 font-bold"
                        title="Open on GitHub"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>)}
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

          {repoError && (
            <div className="p-3 bg-amber-50 border border-amber-600 text-amber-950 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700" />
                <span>{repoError}</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handlePromptAddToken}
                  className="paper-button text-xs py-1 px-2.5 font-bold cursor-pointer"
                  title="Enter GitHub Personal Access Token to bypass rate limits"
                >
                  Enter Token
                </button>
                <button
                  onClick={async () => {
                    try {
                      await signInWithGitHub();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="paper-button paper-button-dark text-xs py-1 px-2.5 font-bold cursor-pointer"
                >
                  Reconnect
                </button>
              </div>
            </div>
          )}

          {loadingRepos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4" aria-label="Loading GitHub repositories">
              {[0, 1, 2].map((index) => (
                <div key={index} className="p-3.5 sm:p-4 paper-card bg-[#FEFCF6] space-y-3">
                  <Skeleton className="h-3 w-3/5" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              ))}
            </div>
          ) : availableRepos.length === 0 ? (
            <div className="text-center py-12 px-4 paper-card bg-[#FEFCF6] space-y-3 border-dashed">
              <Github className="w-8 h-8 text-stone-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  No repositories found
                </h3>
                <p className="text-xs sm:text-sm font-serif-body text-stone-700 max-w-md mx-auto leading-relaxed">
                  Unable to load your GitHub repositories. This can happen if your session expired or GitHub's rate limit was reached. Try reconnecting or enter a GitHub token.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => loadGitHubRepos(true)}
                  className="paper-button text-xs py-1.5 px-4 font-bold min-h-[34px] inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Retry</span>
                </button>
                <button
                  onClick={handlePromptAddToken}
                  className="paper-button text-xs py-1.5 px-4 font-bold min-h-[34px] inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Enter Token</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      await signInWithGitHub();
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px] inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Github className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Reconnect GitHub</span>
                </button>
              </div>
            </div>
          ) : filteredAvailableRepos.length === 0 ? (
            <div className="text-center py-10 px-4 paper-card bg-[#FEFCF6]">
              <p className="text-xs font-serif-body text-stone-700">
                No repositories found matching "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="content-fade-in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredAvailableRepos.map((repo) => {
                const isAlreadyShowcased = showcasedRepoNames.has(repo.full_name.trim().toLowerCase());

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

                      <p className="text-xs font-serif-body text-stone-700 leading-relaxed">
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
                      {!showcased.some(p => p.repo_full_name.toLowerCase() === repo.full_name.toLowerCase() && p.show_repository_link === false) && (<a
                        href={repo.html_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-800 underline font-mono text-[11px] flex items-center space-x-0.5 font-bold"
                      >
                        <span>GitHub</span>
                        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>)}

                      {isAlreadyShowcased ? (
                        <span className="paper-badge text-[10px] font-bold bg-emerald-100 text-emerald-950 border-emerald-700 py-0.5 px-2 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>Published</span>
                        </span>
                      ) : isAtLimit ? (
                        <span className="paper-badge text-[10px] font-bold bg-stone-100 text-stone-600 border-stone-400 py-0.5 px-2" title={`Limit: ${MAX_SHOWCASE_PROJECTS} projects max. Remove one to add another.`}>
                          Limit reached
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#57534E]/45 paper-motion-overlay">
          <div className="bg-[#FEFCF6] paper-card paper-motion-panel max-w-md w-full p-3.5 sm:p-5 space-y-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-dashed border-[#212121] pb-2 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                  Publish
                </h3>
                <p className="text-[10px] text-stone-700 font-mono truncate">
                  {selectedRepoToAdd.full_name}
                </p>
              </div>
              <button
                id="close-add-modal-btn"
                aria-label="Close dialog"
                disabled={addingInProgress}
                onClick={() => setSelectedRepoToAdd(null)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3">
              {isCompressing && <p role="status">Preparing preview...</p>}
              {uploadProgress !== null && <div role="status">Uploading {uploadProgress}%<progress max={100} value={uploadProgress} /></div>}
              {addError && screenshotFile && <button type="submit" disabled={addingInProgress || isCompressing}>Retry upload</button>}
              {addError && (
                <div className="p-2.5 bg-red-50 border border-red-500 text-red-950 text-xs font-mono flex items-start space-x-1.5 rounded-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-600" />
                  <span>{addError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold flex items-center justify-between">
                  <span>Sample UI / Screenshot (optional)</span>
                  <span className="text-[10px] font-mono text-stone-600 font-normal">JPG, PNG, WebP · max 10MB</span>
                </label>

                {screenshotPreview ? (
                  <div className="space-y-1.5">
                    <div className="w-full aspect-[16/9] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative flex items-center justify-center">
                      <img
                        width={1280} height={720} loading="lazy" decoding="async"
                        src={screenshotPreview}
                        onError={() => handleLocalPreviewError(false)}
                        alt="Screenshot preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          selection.current.add++; setIsCompressing(false); setScreenshotFile(null);
                          setScreenshotPreview(null);
                        }}
                        className="text-stone-700 underline text-xs font-bold"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#212121] bg-[#FAF6EC] p-4 rounded-xs flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors text-center block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleScreenshotSelect(e, false)}
                    />
                    <Upload className="w-5 h-5 text-stone-700 stroke-[2]" />
                    <span className="text-xs font-headline uppercase font-bold text-[#212121]">
                      {isCompressing ? 'Compressing Image...' : 'Upload Screenshot or Use GitHub Preview'}
                    </span>
                    <span className="text-[10px] font-serif-body text-stone-600">
                      JPG, PNG, WebP. Max 10MB; minimum 64px per side. GitHub preview is used if no image is uploaded.
                    </span>
                  </label>
                )}
              </div>

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
                  Description
                </label>
                <textarea
                  rows={3}
                  value={customDescription}
                  maxLength={99}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Summarize what this project does, key features, or technologies used..."
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body leading-relaxed"
                />
                <p className="text-[11px] font-mono text-stone-600">{customDescription.length} / 99 characters</p>
              </div>
              <label className="block text-xs font-serif-body">
                <input type="checkbox" checked={showRepositoryLink} onChange={(e) => setShowRepositoryLink(e.target.checked)} className="mr-2" /> Show repository link
                <span className="block text-[11px] text-stone-600 mt-1">Let visitors open this project's GitHub repository.</span>
              </label>


              <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-dashed border-[#212121]">
                <button
                  type="button"
                  disabled={addingInProgress}
                onClick={() => setSelectedRepoToAdd(null)}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingInProgress || isCompressing}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold disabled:opacity-50 min-h-[34px]"
                >
                  {addingInProgress ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Existing Project */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#57534E]/45 paper-motion-overlay">
          <div className="bg-[#FEFCF6] paper-card paper-motion-panel max-w-md w-full p-3.5 sm:p-5 space-y-3.5 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-dashed border-[#212121] pb-2 gap-2">
              <div className="min-w-0 flex-1">
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
                disabled={savingEdit}
                onClick={() => setEditingProject(null)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectEdit} className="space-y-3">
              {isEditCompressing && <p role="status">Preparing preview...</p>}
              {editError && <div role="alert">{editError} <button type="submit" disabled={savingEdit || isEditCompressing}>Retry save</button></div>}
              {uploadProgress !== null && <div role="status">Uploading {uploadProgress}%<progress max={100} value={uploadProgress} /></div>}
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold flex items-center justify-between">
                  <span>Project Screenshot / UI Image</span>
                  <span className="text-[10px] font-mono text-stone-600 font-normal">Optional Update</span>
                </label>

                {(editScreenshotPreview || editingProject.screenshot_url) ? (
                  <div className="space-y-1.5">
                    <div className="w-full aspect-[16/9] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative flex items-center justify-center">
                      <img
                        width={1280} height={720} loading="lazy" decoding="async"
                        src={editScreenshotPreview || editingProject.screenshot_url || ''}
                        onError={(event) => {
                          if (editScreenshotPreview) handleLocalPreviewError(true);
                          else {
                            const fallback = `https://opengraph.githubassets.com/1/${editingProject.repo_full_name}`;
                            if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
                            else event.currentTarget.style.display = 'none';
                          }
                        }}
                        alt="Screenshot preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                      <label className="text-stone-700 underline text-xs font-bold cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleScreenshotSelect(e, true)}
                        />
                        Replace Image
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[#212121] bg-[#FAF6EC] p-3 rounded-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center block">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleScreenshotSelect(e, true)}
                    />
                    <Upload className="w-4 h-4 text-stone-700 stroke-[2]" />
                    <span className="text-xs font-headline uppercase font-bold text-[#212121]">
                      {isEditCompressing ? 'Compressing Image...' : 'Upload Sample Screenshot'}
                    </span>
                  </label>
                )}
              </div>

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
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingProject.custom_description || ''}
                  maxLength={99}
                  onChange={(e) =>
                    setEditingProject({ ...editingProject, custom_description: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body leading-relaxed"
                />
                <p className="text-[11px] font-mono text-stone-600">{(editingProject.custom_description || '').length} / 99 characters</p>
              </div>
              <label className="block text-xs font-serif-body">
                <input type="checkbox" checked={editingProject.show_repository_link !== false} onChange={(e) => setEditingProject({...editingProject, show_repository_link: e.target.checked})} className="mr-2" /> Show repository link
                <span className="block text-[11px] text-stone-600 mt-1">Let visitors open this project's GitHub repository.</span>
              </label>


              <div className="flex items-center justify-end space-x-2 pt-2.5 border-t border-dashed border-[#212121]">
                <button
                  type="button"
                  disabled={savingEdit}
                onClick={() => setEditingProject(null)}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit || isEditCompressing}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Unpublish Confirmation */}
      {projectPendingUnpublish && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#57534E]/45 paper-motion-overlay"
          onClick={() => setProjectPendingUnpublish(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unpublish-dispatch-title"
            className="bg-[#FEFCF6] paper-card paper-motion-panel max-w-md w-full p-4 sm:p-5 space-y-4"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-dashed border-[#212121] pb-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-[#7A2E25] font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Withdrawal Notice
                </span>
                <h3 id="unpublish-dispatch-title" className="mt-1 text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  Unpublish Dispatch
                </h3>
              </div>
              <button
                type="button"
                aria-label="Keep project published"
                onClick={() => setProjectPendingUnpublish(null)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-serif-body text-stone-800 leading-relaxed">
                Remove this project from your public showcase? The repository stays on GitHub and can be published again later.
              </p>
              <p className="border-y border-dashed border-[#212121]/65 py-2 text-xs font-mono text-stone-700 truncate">
                {projectPendingUnpublish.custom_title || projectPendingUnpublish.repo_full_name}
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setProjectPendingUnpublish(null)}
                className="paper-button text-xs py-2 px-3.5 min-h-[36px] font-bold"
              >
                Keep Published
              </button>
              {removeError && <p role="alert">{removeError}</p>}
              <button
                type="button"
                onClick={handleRemoveProject}
                className="paper-button paper-button-dark text-xs py-2 px-3.5 min-h-[36px] font-bold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Unpublish Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Preview Project Details */}
      {previewProject && (
        <div 
          className="fixed inset-0 bg-[#57534E]/45 z-50 flex items-center justify-center p-3 sm:p-5 paper-motion-overlay"
          onClick={() => setPreviewProject(null)}
        >
          <div
            className="bg-[#FEFCF6] paper-card paper-motion-panel max-w-xl w-full p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] pb-3">
              <div>
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
              {/* Repository Preview Banner / Project UI Screenshot */}
              <div className="w-full aspect-[16/9] overflow-hidden rounded-xs border border-[#212121] bg-[#FAF6EC] relative flex items-center justify-center">
                <img
                        width={1280} height={720} loading="lazy" decoding="async"
                  src={previewProject.screenshot_url || `https://opengraph.githubassets.com/1/${previewProject.repo_full_name}`}
                  alt={previewProject.custom_title || previewProject.repo_full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.src !== `https://opengraph.githubassets.com/1/${previewProject.repo_full_name}`) {
                      e.currentTarget.src = `https://opengraph.githubassets.com/1/${previewProject.repo_full_name}`;
                    } else {
                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                    }
                  }}
                />
              </div>

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
                    <span>Visit site</span>
                  </a>
                )}
                {previewProject.show_repository_link !== false && (<a
                  href={previewProject.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="paper-button paper-button-dark text-xs py-2 px-3 font-bold inline-flex items-center space-x-1"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>View on GitHub</span>
                </a>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
