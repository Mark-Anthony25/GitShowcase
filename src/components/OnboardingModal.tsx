import React, { useState, useEffect, useCallback } from 'react';
import { 
  Check, ArrowRight, ArrowLeft, Github, User, Code2, Star, 
  GitFork, Sparkles, CheckCircle2, AlertCircle, BookmarkPlus,
  ExternalLink, Layers, RefreshCw, Eye, Edit3, Image as ImageIcon
} from 'lucide-react';
import { Profile, GitHubRepoItem, GitHubUserData } from '../types';
import { fetchUserRepos, fetchGitHubUserData } from '../lib/github';
import { addProjectToShowcase, getStudentShowcasedProjects, syncStudentShowcaseProjects } from '../lib/showcaseStore';
import { DEGREE_PROGRAM_OPTIONS, getCanonicalProgram } from '../lib/programs';

interface OnboardingModalProps {
  isOpen: boolean;
  profile: Profile;
  githubToken: string | null;
  onComplete: (updatedProfile: Profile) => void;
  onCancel?: () => void;
}

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate / Alumni'];

const HEADLINE_SUGGESTIONS = [
  'Multimedia Computing • Game Developer',
  'Computer Science • Full-Stack Developer',
  'Information Technology • Cloud & Web',
  'Accounting Information Systems • Enterprise Dev',
  'Mobile & Cross-Platform Developer'
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  profile,
  githubToken,
  onComplete,
  onCancel,
}) => {
  const draftKey = `gitshowcase_onboarding_draft_${profile.id}`;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Canonical degree program extraction
  const initialProg = getCanonicalProgram(profile.program);

  // Step 1: Profile fields
  const [username, setUsername] = useState(profile.github_username || '');
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(
    profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  );
  const [headline, setHeadline] = useState(profile.headline || 'Student Developer');
  const [aboutMe, setAboutMe] = useState(
    (profile.bio || '').slice(0, 50)
  );
  const [selectedProgramOption, setSelectedProgramOption] = useState(initialProg.selectedOptionValue);
  const [customProgramName, setCustomProgramName] = useState(initialProg.customProgramName);
  const [yearLevel, setYearLevel] = useState(profile.year_level || '1st Year');
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [isSyncingGitHubUser, setIsSyncingGitHubUser] = useState(false);
  const [githubSyncSuccess, setGithubSyncSuccess] = useState(false);

  // Step 2: Repository selection
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepoMap, setSelectedRepoMap] = useState<Record<string, {
    customTitle: string;
    customDescription: string;
    isFeatured: boolean;
  }>>({});
  const [savingShowcase, setSavingShowcase] = useState(false);

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        if (draft.step) setCurrentStep(draft.step);
        if (draft.username) setUsername(draft.username);
        if (draft.fullName) setFullName(draft.fullName);
        if (draft.avatarUrl) setAvatarUrl(draft.avatarUrl);
        if (draft.headline) setHeadline(draft.headline);
        if (draft.aboutMe) setAboutMe(draft.aboutMe);
        if (draft.selectedProgramOption) setSelectedProgramOption(draft.selectedProgramOption);
        if (draft.customProgramName) setCustomProgramName(draft.customProgramName);
        if (draft.yearLevel) setYearLevel(draft.yearLevel);
        if (draft.selectedRepoMap) setSelectedRepoMap(draft.selectedRepoMap);
      }
    } catch (e) {
      console.warn('Failed to load onboarding draft:', e);
    }
  }, [draftKey]);

  // Persist draft to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen || currentStep === 4) return;
    try {
      const draft = {
        step: currentStep,
        username,
        fullName,
        avatarUrl,
        headline,
        aboutMe,
        selectedProgramOption,
        customProgramName,
        yearLevel,
        selectedRepoMap,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save onboarding draft:', e);
    }
  }, [
    draftKey,
    isOpen,
    currentStep,
    username,
    fullName,
    avatarUrl,
    headline,
    aboutMe,
    selectedProgramOption,
    customProgramName,
    yearLevel,
    selectedRepoMap,
  ]);

  // Pre-fill / Synchronize from real GitHub profile
  const syncFromGitHub = useCallback(async (isInitial = false) => {
    setIsSyncingGitHubUser(true);
    setGithubSyncSuccess(false);
    try {
      const gitUser = await fetchGitHubUserData(githubToken, username || profile.github_username);
      if (gitUser) {
        if (gitUser.login) setUsername(gitUser.login);
        if (gitUser.name && (!fullName || !isInitial)) setFullName(gitUser.name);
        if (gitUser.avatar_url) setAvatarUrl(gitUser.avatar_url);
        if (gitUser.bio && (!aboutMe || !isInitial || aboutMe.length === 0)) {
          setAboutMe(gitUser.bio.slice(0, 50));
        }
        setGithubSyncSuccess(true);
        setTimeout(() => setGithubSyncSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to sync from GitHub user profile:', err);
    } finally {
      setIsSyncingGitHubUser(false);
    }
  }, [githubToken, username, profile.github_username, fullName, aboutMe]);

  // On first open, auto-sync from GitHub if avatar or name looks default
  useEffect(() => {
    if (isOpen && (!profile.full_name || profile.full_name === 'student' || !profile.avatar_url)) {
      syncFromGitHub(true);
    }
  }, [isOpen, profile.full_name, profile.avatar_url, syncFromGitHub]);

  // Load repositories when advancing to Step 2
  const loadRepos = useCallback(async () => {
    setLoadingRepos(true);
    setRepoError(null);
    try {
      const fetched = await fetchUserRepos(githubToken, username || profile.github_username);
      setRepos(fetched);

      // Pre-select already showcased repos or first 2 if none selected yet
      if (Object.keys(selectedRepoMap).length === 0) {
        const existing = await getStudentShowcasedProjects(profile.id);
        const preSelected: Record<string, any> = {};
        
        if (existing.length > 0) {
          existing.forEach(p => {
            preSelected[p.repo_full_name] = {
              customTitle: p.custom_title || '',
              customDescription: p.custom_description || '',
              isFeatured: p.is_featured,
            };
          });
        } else if (fetched.length > 0) {
          fetched.slice(0, 2).forEach((r, idx) => {
            preSelected[r.full_name] = {
              customTitle: r.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              customDescription: r.description ? r.description.slice(0, 120) : '',
              isFeatured: idx === 0,
            };
          });
        }
        setSelectedRepoMap(preSelected);
      }
    } catch (err: any) {
      console.error('Error loading repos in onboarding:', err);
      setRepoError(err?.message || 'Unable to retrieve repositories from GitHub.');
    } finally {
      setLoadingRepos(false);
    }
  }, [githubToken, username, profile.github_username, profile.id, selectedRepoMap]);

  useEffect(() => {
    if (isOpen && currentStep === 2 && repos.length === 0) {
      loadRepos();
    }
  }, [isOpen, currentStep, repos.length, loadRepos]);

  if (!isOpen) return null;

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    if (!username.trim()) {
      setStep1Error('GitHub Username is required.');
      return;
    }

    if (aboutMe.length > 50) {
      setStep1Error(`About Me exceeds the 50-character maximum (${aboutMe.length}/50).`);
      return;
    }

    setCurrentStep(2);
  };

  const toggleRepoSelection = (repo: GitHubRepoItem) => {
    const updated = { ...selectedRepoMap };
    const existingKey = Object.keys(updated).find(k => k.trim().toLowerCase() === repo.full_name.trim().toLowerCase());
    if (existingKey) {
      delete updated[existingKey];
    } else {
      updated[repo.full_name] = {
        customTitle: repo.name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        customDescription: repo.description ? repo.description.slice(0, 120) : '',
        isFeatured: Object.keys(updated).length === 0, // First selected is featured
      };
    }
    setSelectedRepoMap(updated);
  };

  const handleProceedToReview = () => {
    setCurrentStep(3);
  };

  const handleFinishOnboarding = async () => {
    if (savingShowcase) return;
    setSavingShowcase(true);
    try {
      // 1. Prepare repository mappings with direct URLs
      const repoPayloadMap: Record<string, {
        customTitle?: string;
        customDescription?: string;
        isFeatured?: boolean;
        repoUrl?: string;
      }> = {};

      for (const [repoFullName, meta] of Object.entries(selectedRepoMap) as [string, { customTitle: string; customDescription: string; isFeatured: boolean }][]) {
        const repoObj = repos.find(r => r.full_name.toLowerCase() === repoFullName.toLowerCase());
        repoPayloadMap[repoFullName] = {
          customTitle: meta.customTitle || undefined,
          customDescription: meta.customDescription || undefined,
          isFeatured: meta.isFeatured,
          repoUrl: repoObj?.html_url || `https://github.com/${repoFullName}`,
        };
      }

      // 2. Safely sync and persist projects (upsert selected, remove deselected, zero duplicates)
      await syncStudentShowcaseProjects(profile.id, repoPayloadMap);

      // 3. Prepare updated profile with is_onboarded: true
      const effectiveProgram =
        selectedProgramOption === 'Other Programs'
          ? (customProgramName.trim() || 'Other Programs')
          : selectedProgramOption;

      const updatedProfile: Profile = {
        ...profile,
        github_username: username.trim().toLowerCase() || profile.github_username,
        full_name: fullName.trim() || profile.full_name || username.trim(),
        avatar_url: avatarUrl.trim() || profile.avatar_url,
        headline: headline.trim() || profile.headline,
        bio: aboutMe.trim().slice(0, 50) || profile.bio,
        program: effectiveProgram,
        year_level: yearLevel || profile.year_level,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      };

      // 4. Clear draft from localStorage
      try {
        localStorage.removeItem(draftKey);
      } catch {}

      setCurrentStep(4);
      setTimeout(() => {
        onComplete(updatedProfile);
      }, 1200);
    } catch (err) {
      console.error('Error saving onboarding data:', err);
    } finally {
      setSavingShowcase(false);
    }
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.language && r.language.toLowerCase().includes(repoSearch.toLowerCase())) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  const selectedCount = Object.keys(selectedRepoMap).length;

  const effectiveProgramDisplay =
    selectedProgramOption === 'Other Programs'
      ? (customProgramName.trim() || 'Other Programs')
      : selectedProgramOption;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FEFCF6] paper-card max-w-2xl w-full p-3.5 sm:p-5 shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] my-auto text-[#212121] max-h-[90dvh] overflow-y-auto">
        
        {/* Step Indicator Header */}
        <div className="border-b border-dashed border-[#212121] pb-3 mb-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="paper-badge bg-[#212121] text-white text-[9px] font-bold">
                GITSHOWCASE ONBOARDING
              </span>
              <span className="text-xs font-sketch text-stone-700 font-bold">
                ISU Cauayan Campus
              </span>
            </div>
            <div className="flex items-center space-x-1 font-mono text-xs font-bold text-stone-800">
              <span className={`px-1.5 py-0.5 rounded-xs ${currentStep === 1 ? 'bg-[#212121] text-white' : 'bg-stone-200'}`}>1. Profile</span>
              <span>→</span>
              <span className={`px-1.5 py-0.5 rounded-xs ${currentStep === 2 ? 'bg-[#212121] text-white' : 'bg-stone-200'}`}>2. Repositories</span>
              <span>→</span>
              <span className={`px-1.5 py-0.5 rounded-xs ${currentStep === 3 ? 'bg-[#212121] text-white' : 'bg-stone-200'}`}>3. Review</span>
            </div>
          </div>

          <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title mt-2 text-[#212121]">
            {currentStep === 1 && 'Step 1: Set Up Student Identity & Profile'}
            {currentStep === 2 && 'Step 2: Select Repositories from GitHub'}
            {currentStep === 3 && 'Step 3: Review & Publish Your Showcase'}
            {currentStep === 4 && 'Publishing Your Portfolio...'}
          </h2>
          <p className="text-xs font-serif-body text-stone-700 mt-0.5">
            {currentStep === 1 && 'Information is pre-filled from your authenticated GitHub account. Review and adjust your details.'}
            {currentStep === 2 && 'Choose which public repositories to showcase, write custom project summaries, and pin your featured project.'}
            {currentStep === 3 && 'Double-check all imported information before launching your public showcase page.'}
            {currentStep === 4 && 'Saving your student profile and connecting your showcase projects.'}
          </p>
        </div>

        {/* STEP 1: Profile Setup Form */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-3.5">
            {step1Error && (
              <div className="p-2.5 bg-red-100 border border-red-500 text-red-950 text-xs font-mono flex items-center space-x-1.5 rounded-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{step1Error}</span>
              </div>
            )}

            {/* GitHub Auto-Sync Banner */}
            <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 rounded-xs border border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 shadow-[1px_1px_0px_#212121]">
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-[10px] font-sketch uppercase font-bold text-stone-700 block">Connected Account</span>
                  <span className="font-mono font-bold text-[#212121]">@{username || 'github-user'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
                {githubSyncSuccess && (
                  <span className="text-[10px] font-mono text-emerald-800 flex items-center space-x-1">
                    <Check className="w-3 h-3 text-emerald-700" />
                    <span>Imported from GitHub!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => syncFromGitHub(false)}
                  disabled={isSyncingGitHubUser}
                  className="paper-button text-xs py-1 px-2.5 font-bold flex items-center space-x-1 cursor-pointer"
                  title="Re-import latest avatar, name, and bio from GitHub"
                >
                  <RefreshCw className={`w-3 h-3 text-stone-800 ${isSyncingGitHubUser ? 'animate-spin' : ''}`} />
                  <span>Re-sync GitHub</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* GitHub Username */}
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  GitHub Username <span className="text-stone-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600 font-mono text-xs pointer-events-none">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="github_username"
                    className="w-full pl-7 pr-2.5 py-1.5 paper-input text-xs font-mono text-[#212121] min-h-[34px]"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Display / Full Name <span className="text-stone-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px]"
                />
              </div>
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                Profile Avatar URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-mono text-[#212121] min-h-[34px]"
                />
                <button
                  type="button"
                  onClick={() => setAvatarUrl(`https://github.com/${username}.png`)}
                  className="paper-button text-xs py-1 px-2.5 font-bold whitespace-nowrap min-h-[34px]"
                  title="Reset to GitHub avatar"
                >
                  Use GitHub Avatar
                </button>
              </div>
            </div>

            {/* Headline */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                  Professional / Student Headline
                </label>
                <span className="text-[9px] font-sketch text-stone-600 font-bold">e.g. Program &amp; Specialization</span>
              </div>
              <input
                type="text"
                required
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. BS Computer Science • Full-Stack Developer"
                className="w-full px-2.5 py-1.5 paper-input text-xs font-mono text-[#212121] min-h-[34px]"
              />
              {/* Quick Headline Suggestions */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[9px] font-sketch text-stone-700 self-center font-bold">Suggestions:</span>
                {HEADLINE_SUGGESTIONS.map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setHeadline(sugg)}
                    className="paper-button text-[10px] font-mono py-0.5 px-2 min-h-[26px] cursor-pointer"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* About Me (Bio) - STRICT 50 Characters MAX */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                  About Me <span className="text-stone-600 font-normal">(Strict Max 50 Characters)</span>
                </label>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    aboutMe.length > 50 ? 'text-red-600' : aboutMe.length >= 45 ? 'text-amber-800' : 'text-stone-700'
                  }`}
                >
                  {aboutMe.length} / 50 characters
                </span>
              </div>
              <input
                type="text"
                maxLength={50}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value.slice(0, 50))}
                placeholder="Crisp 50-character summary of your tech passion..."
                className={`w-full px-2.5 py-1.5 paper-input text-xs font-serif-body min-h-[34px] ${
                  aboutMe.length >= 50 ? 'border-amber-600 ring-1 ring-amber-600' : ''
                }`}
              />
              <p className="text-[10px] font-serif-body italic text-stone-600 mt-0.5">
                Keep it concise and punchy for visiting students and faculty mentors.
              </p>
            </div>

            {/* Program & Year Level */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                    ISU Degree Program
                  </label>
                  <select
                    id="onboarding-program-select"
                    value={selectedProgramOption}
                    onChange={(e) => setSelectedProgramOption(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px] cursor-pointer"
                  >
                    {DEGREE_PROGRAM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                    Year Level
                  </label>
                  <select
                    id="onboarding-year-select"
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px] cursor-pointer"
                  >
                    {YEAR_OPTIONS.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional custom program input when Other Programs is selected */}
              {selectedProgramOption === 'Other Programs' && (
                <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] space-y-1 animate-in fade-in duration-100">
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                    Specify Degree Program Name
                  </label>
                  <input
                    id="onboarding-custom-program-input"
                    type="text"
                    value={customProgramName}
                    onChange={(e) => setCustomProgramName(e.target.value)}
                    placeholder="e.g. BS Information Systems"
                    className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px]"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-dashed border-[#212121]">
              <div>
                {onCancel && (
                  <button
                    type="button"
                    id="onboarding-skip-all-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCancel();
                    }}
                    className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center w-full sm:w-auto cursor-pointer"
                  >
                    Skip for Now
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  id="onboarding-step1-skip-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setStep1Error(null);
                    setCurrentStep(2);
                  }}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center cursor-pointer"
                >
                  <span>Skip to Repositories</span>
                </button>
                <button
                  type="submit"
                  id="onboarding-step1-next-btn"
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px] justify-center flex items-center space-x-1 cursor-pointer"
                >
                  <span>Continue to Select Repositories</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: Choose Repositories to Showcase */}
        {currentStep === 2 && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter repositories by name or language..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-mono min-h-[34px]"
                />
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs text-stone-700">
                <button
                  onClick={loadRepos}
                  disabled={loadingRepos}
                  className="paper-button text-xs py-1 px-2.5 font-bold flex items-center space-x-1"
                  title="Reload GitHub Repositories"
                >
                  <RefreshCw className={`w-3 h-3 text-stone-800 ${loadingRepos ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <span className="paper-badge bg-stone-200 text-[#212121] font-bold">
                  {selectedCount} Selected
                </span>
              </div>
            </div>

            {repoError && (
              <div className="p-2.5 bg-amber-50 border border-amber-600 text-amber-950 text-xs font-mono flex items-center justify-between gap-2">
                <span>{repoError}</span>
                <button onClick={loadRepos} className="paper-button text-xs py-1 px-2 font-bold">
                  Retry
                </button>
              </div>
            )}

            {/* Repos List */}
            <div className="paper-card bg-[#FEFCF6] max-h-64 overflow-y-auto divide-y divide-dashed divide-stone-300 p-1.5">
              {loadingRepos ? (
                <div className="p-8 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-stone-700" />
                  <p className="text-xs font-sketch uppercase text-stone-700 font-bold">
                    Connecting to GitHub repositories for @{username}...
                  </p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-stone-600 space-y-2">
                  <p>No repositories found on GitHub for @{username}.</p>
                  <p className="text-[11px] text-stone-500">
                    You can still continue setup and publish repositories anytime from your dashboard.
                  </p>
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const isSelected = Boolean(selectedRepoMap[repo.full_name]);
                  const meta = selectedRepoMap[repo.full_name];

                  return (
                    <div
                      key={repo.id}
                      className={`p-2.5 transition-colors ${
                        isSelected ? 'bg-[#FAF6EC]' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <label className="flex items-start space-x-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRepoSelection(repo)}
                            className="w-3.5 h-3.5 mt-0.5 border-1.5 border-[#212121] rounded-xs accent-black cursor-pointer"
                          />
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="font-newspaper-title font-[900] text-xs uppercase text-[#212121]">
                                {repo.name}
                              </span>
                              {repo.language && (
                                <span className="paper-badge text-[9px] font-mono bg-stone-200">
                                  {repo.language}
                                </span>
                              )}
                              <div className="flex items-center space-x-1.5 font-mono text-[9px] text-stone-700 font-bold">
                                <span className="flex items-center"><Star className="w-2.5 h-2.5 mr-0.5" /> {repo.stargazers_count}</span>
                                <span className="flex items-center"><GitFork className="w-2.5 h-2.5 mr-0.5" /> {repo.forks_count}</span>
                              </div>
                            </div>
                            <p className="text-xs font-serif-body text-stone-700 line-clamp-1">
                              {repo.description || 'No description provided on GitHub.'}
                            </p>
                          </div>
                        </label>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRepoMap({
                                ...selectedRepoMap,
                                [repo.full_name]: {
                                  ...meta,
                                  isFeatured: !meta?.isFeatured,
                                },
                              });
                            }}
                            title="Pin as Featured Project"
                            className={`paper-button text-xs py-1 px-2 min-h-[30px] font-bold flex-shrink-0 ${
                              meta?.isFeatured ? 'paper-button-dark' : ''
                            }`}
                          >
                            <Star className={`w-3 h-3 mr-0.5 inline-block ${meta?.isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
                            <span>{meta?.isFeatured ? 'FEATURED PROJECT' : 'Pin Feature'}</span>
                          </button>
                        )}
                      </div>

                      {/* Inline title/desc customizer if selected */}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-dashed border-stone-300 pl-6 space-y-1.5">
                          <input
                            type="text"
                            value={meta?.customTitle || ''}
                            onChange={(e) => {
                              setSelectedRepoMap({
                                ...selectedRepoMap,
                                [repo.full_name]: {
                                  ...meta,
                                  customTitle: e.target.value,
                                },
                              });
                            }}
                            placeholder="Custom Display Title..."
                            className="w-full px-2 py-1 paper-input text-[11px] font-mono min-h-[28px]"
                          />
                          <input
                            type="text"
                            value={meta?.customDescription || ''}
                            onChange={(e) => {
                              setSelectedRepoMap({
                                ...selectedRepoMap,
                                [repo.full_name]: {
                                  ...meta,
                                  customDescription: e.target.value,
                                },
                              });
                            }}
                            placeholder="Custom summary description for portfolio..."
                            className="w-full px-2 py-1 paper-input text-[11px] font-serif-body min-h-[28px]"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-dashed border-[#212121]">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span>Back to Profile</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  id="onboarding-step2-skip-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentStep(3);
                  }}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center cursor-pointer"
                >
                  <span>Skip Repositories</span>
                </button>

                <button
                  type="button"
                  id="onboarding-step2-next-btn"
                  onClick={handleProceedToReview}
                  className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px] justify-center flex items-center space-x-1 cursor-pointer"
                >
                  <span>Review &amp; Publish</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Confirmation Screen */}
        {currentStep === 3 && (
          <div className="space-y-3.5">
            <div className="bg-[#FAF6EC] paper-card p-3.5 sm:p-4 border border-[#212121] space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[2px_2px_0px_#212121]">
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-[9px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                    STUDENT IDENTITY PREVIEW
                  </span>
                  <h3 className="text-base font-[900] uppercase font-newspaper-title text-[#212121] truncate">
                    {fullName || username}
                  </h3>
                  <p className="text-xs font-mono font-bold text-stone-800">
                    @{username} • {yearLevel}
                  </p>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-dashed border-[#212121] text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-sketch font-bold uppercase text-stone-600 text-[10px]">Program:</span>
                  <span className="font-serif-body font-bold text-[#212121]">{effectiveProgramDisplay}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="font-sketch font-bold uppercase text-stone-600 text-[10px]">Headline:</span>
                  <span className="font-mono text-[#212121] text-[11px] truncate">{headline}</span>
                </div>
                <div className="flex items-start space-x-2 pt-0.5">
                  <span className="font-sketch font-bold uppercase text-stone-600 text-[10px] flex-shrink-0">About Me:</span>
                  <span className="font-serif-body text-stone-800 italic">"{aboutMe}"</span>
                </div>
              </div>

              {/* Showcased Repos Review */}
              <div className="pt-2 border-t border-dashed border-[#212121] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-sketch font-bold uppercase text-stone-700">
                    Showcased Repositories ({selectedCount})
                  </span>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-stone-700 hover:text-black text-[11px] underline font-mono font-bold"
                  >
                    Change selection
                  </button>
                </div>

                {selectedCount === 0 ? (
                  <p className="text-xs font-serif-body text-stone-600 italic">
                    No repositories selected yet. You can add them anytime after setup.
                  </p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {(Object.entries(selectedRepoMap) as [string, { customTitle: string; customDescription: string; isFeatured: boolean }][]).map(([repoName, meta]) => (
                      <div
                        key={repoName}
                        className="p-1.5 bg-[#FEFCF6] paper-card text-xs flex items-center justify-between border border-[#212121]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-newspaper-title font-[900] text-[11px] uppercase block truncate">
                            {meta.customTitle || repoName}
                          </span>
                          <span className="text-[10px] font-mono text-stone-600 truncate block">
                            {repoName}
                          </span>
                        </div>
                        {meta.isFeatured && (
                          <span className="paper-badge bg-amber-200 text-amber-950 text-[9px] font-bold ml-2">
                            FEATURED PROJECT
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-dashed border-[#212121]">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span>Back to Repositories</span>
              </button>

              <button
                type="button"
                id="complete-onboarding-btn"
                disabled={savingShowcase}
                onClick={handleFinishOnboarding}
                className="paper-button paper-button-dark text-xs py-1.5 px-5 font-bold disabled:opacity-50 min-h-[34px] justify-center flex items-center space-x-1.5"
              >
                {savingShowcase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing Showcase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>Confirm &amp; Launch Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Confirmation */}
        {currentStep === 4 && (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 paper-card bg-emerald-100 border-emerald-600 flex items-center justify-center mx-auto text-emerald-800">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
              GitShowcase Portfolio Published!
            </h3>
            <p className="text-xs font-serif-body text-stone-700 max-w-sm mx-auto">
              Your profile and showcased projects are published. Redirecting to your public profile...
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
