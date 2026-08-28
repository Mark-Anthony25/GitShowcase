import React, { useState, useEffect } from 'react';
import { 
  Check, ArrowRight, ArrowLeft, Github, User, Code2, Star, 
  GitFork, Sparkles, CheckCircle2, AlertCircle, BookmarkPlus,
  ExternalLink, Layers
} from 'lucide-react';
import { Profile, GitHubRepoItem } from '../types';
import { fetchUserRepos } from '../lib/github';
import { addProjectToShowcase, getStudentShowcasedProjects } from '../lib/showcaseStore';

interface OnboardingModalProps {
  isOpen: boolean;
  profile: Profile;
  githubToken: string | null;
  onComplete: (updatedProfile: Profile) => void;
  onCancel?: () => void;
}

const PROGRAM_OPTIONS = [
  'BS Computer Science',
  'BS Information Technology',
  'BS Information Systems',
  'BS Computer Engineering',
  'Associate in Computer Technology',
  'Other Computing Program'
];

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate / Alumni'];

const HEADLINE_SUGGESTIONS = [
  'BS Computer Science • Full-Stack Dev',
  'BS Information Technology • Cloud & Web',
  'Mobile App Developer • React Native',
  'AI & Machine Learning Researcher',
  'Cybersecurity & Systems Enthusiast'
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  profile,
  githubToken,
  onComplete,
  onCancel,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Profile fields
  const [username, setUsername] = useState(profile.github_username || '');
  const [fullName, setFullName] = useState(profile.full_name || '');
  const [headline, setHeadline] = useState(profile.headline || 'BS Computer Science • Developer');
  const [aboutMe, setAboutMe] = useState(
    (profile.bio || 'Passionate student crafting web & IoT systems.').slice(0, 50)
  );
  const [program, setProgram] = useState(profile.program || 'BS Computer Science');
  const [yearLevel, setYearLevel] = useState(profile.year_level || '3rd Year');
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2: Repository selection
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepoMap, setSelectedRepoMap] = useState<Record<string, {
    customTitle: string;
    customDescription: string;
    isFeatured: boolean;
  }>>({});
  const [savingRepos, setSavingRepos] = useState(false);

  // Load repositories when advancing to Step 2
  useEffect(() => {
    if (isOpen && currentStep === 2) {
      loadRepos();
    }
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const fetched = await fetchUserRepos(githubToken, username || profile.github_username);
      setRepos(fetched);

      // Pre-select already showcased or top 2 repos
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
        // Pre-check the first 2 repos by default to help student get started quickly
        fetched.slice(0, 2).forEach((r, idx) => {
          preSelected[r.full_name] = {
            customTitle: r.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            customDescription: r.description ? r.description.slice(0, 120) : '',
            isFeatured: idx === 0,
          };
        });
      }
      setSelectedRepoMap(preSelected);
    } catch (err) {
      console.error('Error loading repos in onboarding:', err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep1Error(null);

    if (!username.trim()) {
      setStep1Error('Username is required.');
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
    if (updated[repo.full_name]) {
      delete updated[repo.full_name];
    } else {
      updated[repo.full_name] = {
        customTitle: repo.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        customDescription: repo.description ? repo.description.slice(0, 120) : '',
        isFeatured: Object.keys(updated).length === 0, // First selected is featured
      };
    }
    setSelectedRepoMap(updated);
  };

  const handleFinishOnboarding = async () => {
    setSavingRepos(true);
    try {
      // 1. Save projects selected
      for (const [repoFullName, meta] of Object.entries(selectedRepoMap) as [string, { customTitle: string; customDescription: string; isFeatured: boolean }][]) {
        const repoObj = repos.find(r => r.full_name === repoFullName);
        await addProjectToShowcase({
          profileId: profile.id,
          repoFullName,
          repoUrl: repoObj?.html_url || `https://github.com/${repoFullName}`,
          customTitle: meta.customTitle || null,
          customDescription: meta.customDescription || null,
          isFeatured: meta.isFeatured,
        });
      }

      // 2. Prepare updated profile with is_onboarded: true
      const updatedProfile: Profile = {
        ...profile,
        github_username: username.trim().toLowerCase(),
        full_name: fullName.trim() || username.trim(),
        headline: headline.trim(),
        bio: aboutMe.trim().slice(0, 50),
        program,
        year_level: yearLevel,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      };

      setCurrentStep(3);
      setTimeout(() => {
        onComplete(updatedProfile);
      }, 1400);
    } catch (err) {
      console.error('Error saving onboarding data:', err);
    } finally {
      setSavingRepos(false);
    }
  };

  const filteredRepos = repos.filter(r => 
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    (r.language && r.language.toLowerCase().includes(repoSearch.toLowerCase())) ||
    (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  const selectedCount = Object.keys(selectedRepoMap).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FEFCF6] paper-card max-w-xl w-full p-3.5 sm:p-5 shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] my-auto text-[#212121] max-h-[90dvh] overflow-y-auto">
        
        {/* Step Indicator Header */}
        <div className="border-b border-dashed border-[#212121] pb-2.5 mb-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="paper-badge bg-[#212121] text-white text-[9px] font-bold">
                GITSHOWCASE ONBOARDING
              </span>
              <span className="text-xs font-sketch text-stone-700 font-bold">
                ISU Cauayan Campus
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-stone-800">
              Step {currentStep} of 2
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title mt-1.5 text-[#212121]">
            {currentStep === 1 && 'Set Up Your Student Profile'}
            {currentStep === 2 && 'Select Projects to Showcase'}
            {currentStep === 3 && 'Publishing Your Profile...'}
          </h2>
          <p className="text-xs font-serif-body text-stone-700 mt-0.5">
            {currentStep === 1 && 'Configure your name, headline, degree program, and a short 50-character bio.'}
            {currentStep === 2 && 'Pick your best capstones, assignments, and projects from GitHub to showcase.'}
            {currentStep === 3 && 'Finalizing your project showcase page.'}
          </p>
        </div>

        {/* STEP 1: Profile Setup Form */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-3">
            {step1Error && (
              <div className="p-2 bg-red-100 border border-red-500 text-red-950 text-xs font-mono flex items-center space-x-1.5 rounded-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{step1Error}</span>
              </div>
            )}

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
                    placeholder="username"
                    className="w-full pl-7 pr-2.5 py-1.5 paper-input text-xs font-mono text-[#212121] min-h-[34px]"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Full Name <span className="text-stone-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mark Anthony Reyes"
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px]"
                />
              </div>
            </div>

            {/* Headline */}
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                  Professional / Student Headline
                </label>
                <span className="text-[9px] font-sketch text-stone-600 font-bold">e.g. Program &amp; Focus</span>
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
                  About Me <span className="text-stone-600 font-normal">(Max 50 Characters)</span>
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
                  aboutMe.length >= 50
                    ? 'border-amber-600 ring-1 ring-amber-600'
                    : ''
                }`}
              />
              <p className="text-[10px] font-serif-body italic text-stone-600 mt-0.5">
                Keep it punchy and memorable for visiting students and faculty advisors.
              </p>
            </div>

            {/* Program & Year Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Degree Program
                </label>
                <select
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-serif-body text-[#212121] min-h-[34px] cursor-pointer"
                >
                  {PROGRAM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-0.5 font-bold">
                  Year Level
                </label>
                <select
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

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-dashed border-[#212121]">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center"
                >
                  Skip for Now
                </button>
              )}
              <button
                type="submit"
                id="onboarding-step1-next-btn"
                className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold min-h-[34px] justify-center"
              >
                <span>Continue to Select Repositories</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Choose Repositories to Showcase */}
        {currentStep === 2 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filter connected repositories by name or language..."
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 paper-input text-xs font-mono min-h-[34px]"
                />
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs text-stone-700">
                <span className="paper-badge bg-stone-200 text-[#212121] font-bold">
                  {selectedCount} Selected
                </span>
              </div>
            </div>

            {/* Repos List */}
            <div className="paper-card bg-[#FEFCF6] max-h-60 overflow-y-auto divide-y divide-dashed divide-stone-300 p-1.5">
              {loadingRepos ? (
                <div className="p-6 text-center space-y-1.5">
                  <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent mx-auto"></div>
                  <p className="text-xs font-sketch uppercase text-stone-700 font-bold">Connecting to GitHub repositories...</p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-stone-600">
                  No repositories found. You can add them later or adjust your search.
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
                                <span className="paper-badge text-[9px] font-mono">
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
                            title="Pin as Lead Capstone Project"
                            className={`paper-button text-xs py-1 px-2 min-h-[30px] font-bold flex-shrink-0 ${
                              meta?.isFeatured
                                ? 'paper-button-dark'
                                : ''
                            }`}
                          >
                            <Star className={`w-3 h-3 mr-0.5 inline-block ${meta?.isFeatured ? 'fill-amber-300 text-amber-300' : ''}`} />
                            <span>{meta?.isFeatured ? 'Featured' : 'Feature'}</span>
                          </button>
                        )}
                      </div>
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
                className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold justify-center"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span>Back to Profile</span>
              </button>

              <button
                type="button"
                id="complete-onboarding-btn"
                disabled={savingRepos}
                onClick={handleFinishOnboarding}
                className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold disabled:opacity-50 min-h-[34px] justify-center"
              >
                {savingRepos ? (
                  <span>Publishing Showcase...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400 mr-1 flex-shrink-0" />
                    <span>Complete Setup &amp; Launch</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Confirmation */}
        {currentStep === 3 && (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 paper-card bg-emerald-100 border-emerald-600 flex items-center justify-center mx-auto text-emerald-800">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
              GitShowcase Portfolio Created!
            </h3>
            <p className="text-xs font-serif-body text-stone-700 max-w-sm mx-auto">
              Your student profile, curated repositories, and GitHub commit boxes are now published and live.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
