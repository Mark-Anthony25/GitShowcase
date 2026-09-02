import React, { useState, useEffect } from 'react';
import { 
  Github, Star, ExternalLink, Share2, Check, ArrowLeft, ArrowRight,
  Code2, Globe, AlertCircle, RefreshCw, FolderGit2, Edit3, 
  User, X, ArrowUpRight, Sparkles, GraduationCap, GitFork
} from 'lucide-react';
import { StudentShowcaseData, ShowcasedProject, Profile } from '../types';
import { getStudentShowcaseByUsername, deduplicateProjectsList } from '../lib/showcaseStore';
import { CommitHeatmap } from './CommitHeatmap';
import { useAuth } from '../context/AuthContext';
import { DEGREE_PROGRAM_OPTIONS, getCanonicalProgram } from '../lib/programs';

interface PublicProfileViewProps {
  username: string;
  navigate: (route: string) => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({ username, navigate }) => {
  const { user, profile: authProfile, githubToken, updateProfileData } = useAuth();

  const [data, setData] = useState<StudentShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ShowcasedProject | null>(null);

  // Profile Edit Modal State for Owner
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editProgramOption, setEditProgramOption] = useState('BS Computer Science');
  const [editCustomProgram, setEditCustomProgram] = useState('');
  const [editYearLevel, setEditYearLevel] = useState('3rd Year');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    loadShowcase(true);
  }, [username, githubToken]);

  const loadShowcase = async (force = false) => {
    if (!username) {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentShowcaseByUsername(username, githubToken, force);
      setData(res);

      if (res?.profile) {
        setEditFullName(res.profile.full_name || '');
        setEditBio(res.profile.bio || '');
        const progInfo = getCanonicalProgram(res.profile.program);
        setEditProgramOption(progInfo.selectedOptionValue);
        setEditCustomProgram(progInfo.customProgramName);
        setEditYearLevel(res.profile.year_level || '3rd Year');
      }
    } catch (err: any) {
      console.error('Error loading student showcase:', err);
      setError(err?.message || 'Failed to load student profile. Please check your connection.');
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

  const isOwner = Boolean(
    user && authProfile && (
      (data?.profile && authProfile.id === data.profile.id) ||
      authProfile.github_username?.toLowerCase() === username.toLowerCase()
    )
  );

  const handleOpenEditModal = () => {
    setProfileError(null);
    setProfileSaved(false);
    if (data?.profile) {
      setEditFullName(data.profile.full_name || '');
      setEditBio(data.profile.bio || '');
      const progInfo = getCanonicalProgram(data.profile.program);
      setEditProgramOption(progInfo.selectedOptionValue);
      setEditCustomProgram(progInfo.customProgramName);
      setEditYearLevel(data.profile.year_level || '3rd Year');
    }
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const effectiveProgram =
        editProgramOption === 'Other Programs'
          ? (editCustomProgram.trim() || 'Other Programs')
          : editProgramOption;

      const updated = await updateProfileData({
        full_name: editFullName.trim() || null,
        bio: editBio.trim().slice(0, 50) || null,
        program: effectiveProgram,
        year_level: editYearLevel.trim() || null,
        is_onboarded: true,
      });

      if (!updated) {
        throw new Error('Failed to persist profile changes to database. Please check your connection.');
      }

      if (data) {
        setData({
          ...data,
          profile: updated,
        });
      }

      setProfileSaved(true);
      setTimeout(() => {
        setProfileSaved(false);
        setIsEditProfileOpen(false);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setProfileError(err?.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3 paper-card bg-[#FEFCF6]">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-stone-700" />
        <h2 className="text-xl font-[900] uppercase font-newspaper-title text-[#212121]">
          Loading profile...
        </h2>
        <p className="text-xs font-sketch uppercase tracking-wider text-stone-700 font-bold">
          Retrieving student identity and coding activity for @{username}...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-xl mx-auto px-6 py-12 text-center space-y-4 paper-card bg-[#FEFCF6]">
        <div className="w-12 h-12 paper-card bg-rose-50 border-rose-600 flex items-center justify-center mx-auto text-rose-700">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
            Unable to Load Profile
          </h1>
          <p className="text-xs sm:text-sm font-serif-body text-stone-700 leading-relaxed">
            {error}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={() => loadShowcase(true)}
            className="paper-button paper-button-dark text-xs py-2 px-4 font-bold flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="paper-button text-xs py-2 px-4 font-bold"
          >
            Browse Projects
          </button>
        </div>
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
            No profile exists for @{username} on GitHub or GitShowcase.
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

  const { profile } = data;
  const projects = deduplicateProjectsList(data.projects || []);

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
            <span>Back to Browse Projects</span>
          </button>

          <div className="flex items-center space-x-2">
            {isOwner && (
              <button
                id="profile-edit-btn"
                onClick={handleOpenEditModal}
                className="paper-button text-xs py-1.5 px-3 font-bold min-h-[34px] flex items-center space-x-1.5 cursor-pointer text-[#212121]"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-800 flex-shrink-0" />
                <span>Edit Profile</span>
              </button>
            )}

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
        </div>

        {/* Responsive Two-Column Layout on Desktop: Left Identity Sidebar, Right Telemetry & Projects */}
        <div className="flex flex-col lg:flex-row items-start gap-4 sm:gap-5 lg:gap-6 w-full">
          {/* Left Column: Personal Identity & Academic Profile (PERSON) */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 lg:sticky lg:top-4">
            <div className="bg-[#FAF6EC] paper-card p-3.5 sm:p-5 space-y-3.5">
              {/* Avatar & Names */}
              <div className="flex items-center space-x-3.5">
                <div className="w-16 h-16 sm:w-18 sm:h-18 border-2 border-[#212121] overflow-hidden bg-stone-300 flex-shrink-0 rounded-xs shadow-[2px_2px_0px_#212121]">
                  <img
                    src={profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                    alt={profile.full_name || profile.github_username}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-[9px] sm:text-[10px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                    {isOwner ? 'YOUR PUBLIC PROFILE' : 'STUDENT DEVELOPER'}
                  </span>
                  <h1 className="text-lg sm:text-xl font-[900] uppercase font-newspaper-title text-[#212121] truncate leading-tight">
                    {profile.full_name || profile.github_username}
                  </h1>
                  <p className="text-xs font-mono font-bold text-stone-800 truncate">
                    @{profile.github_username}
                  </p>
                </div>
              </div>

              {/* Academic & Identity Info */}
              <div className="space-y-2 pt-2.5 border-t border-dashed border-[#212121]">
                {profile.bio && (
                  <p className="text-xs sm:text-sm font-serif-body text-stone-800 leading-relaxed italic">
                    "{profile.bio}"
                  </p>
                )}

                <div className="flex items-center space-x-1.5 text-xs font-serif-body text-stone-700 flex-wrap gap-y-1">
                  {profile.program && (
                    <span className="paper-badge font-bold bg-[#EFE9DB] text-[#212121]">
                      {profile.program}
                    </span>
                  )}
                  {profile.year_level && (
                    <span className="paper-badge bg-stone-200 font-mono font-bold text-stone-800">
                      {profile.year_level}
                    </span>
                  )}
                </div>
              </div>

              {/* Public Portfolio Metrics Summary */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2.5 border-t border-dashed border-[#212121] text-center">
                <div className="p-2 bg-[#FEFCF6] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                  <span className="text-[8.5px] sm:text-[9px] font-sketch uppercase text-stone-600 block font-bold truncate">Projects</span>
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121]">{projects.length}</span>
                </div>
                <div className="p-2 bg-[#FEFCF6] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                  <span className="text-[8.5px] sm:text-[9px] font-sketch uppercase text-stone-600 block font-bold truncate">Total Stars</span>
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121] flex items-center justify-center space-x-0.5">
                    <Star className="w-3 h-3 fill-amber-500 text-amber-700 inline" />
                    <span>{projects.reduce((acc, p) => acc + (p.live_stats?.stars ?? 0), 0)}</span>
                  </span>
                </div>
                <div className="p-2 bg-[#FEFCF6] paper-card border border-[#212121] shadow-[1px_1px_0px_#212121]">
                  <span className="text-[8.5px] sm:text-[9px] font-sketch uppercase text-stone-600 block font-bold truncate">Total Forks</span>
                  <span className="text-base sm:text-lg font-[900] font-newspaper-title text-[#212121]">{projects.reduce((acc, p) => acc + (p.live_stats?.forks ?? 0), 0)}</span>
                </div>
              </div>

              {/* Action Buttons: View All Projects (My Projects) and View GitHub */}
              <div className="space-y-2 pt-2.5 border-t border-dashed border-[#212121]">
                {isOwner && (
                  <button
                    id="profile-view-all-projects-btn"
                    onClick={() => navigate('/dashboard')}
                    className="w-full paper-button paper-button-dark text-xs py-2 px-3 font-bold justify-center min-h-[36px] flex items-center"
                    title="Open My Projects workbench"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    <span>My Projects</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
                  </button>
                )}

                <a
                  href={`https://github.com/${profile.github_username}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full paper-button text-xs py-2 px-3 font-bold justify-center min-h-[36px] flex items-center bg-[#FEFCF6] text-[#212121] hover:bg-[#FAF6EC]"
                >
                  <Github className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                  <span>View GitHub Profile</span>
                  <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0" />
                </a>
              </div>
            </div>
          </aside>

          {/* Right Column: Coding Activity & Public Projects Spotlight */}
          <main className="flex-1 min-w-0 space-y-4 sm:space-y-5 w-full">
            {/* 52-Week Commit Activity Heatmap */}
            <CommitHeatmap username={profile.github_username} totalProjects={projects.length} />

            {/* Public Projects Preview & Spotlight Section */}
            <section className="space-y-3.5 pt-1">
              <div className="flex items-center justify-between border-b border-dashed border-[#212121] pb-2">
                <div className="flex items-center space-x-2">
                  <FolderGit2 className="w-4 h-4 text-[#212121] stroke-[2] flex-shrink-0" />
                  <h2 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                    {isOwner ? 'My Public Projects' : 'Public Projects'} — {projects.length}
                  </h2>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="p-8 text-center paper-card bg-[#FEFCF6] border-dashed space-y-2">
                  <FolderGit2 className="w-7 h-7 text-stone-500 mx-auto" />
                  <p className="text-sm font-[900] uppercase font-newspaper-title text-[#212121]">
                    No public projects published yet
                  </p>
                  <p className="text-xs font-serif-body text-stone-600 max-w-sm mx-auto">
                    {isOwner
                      ? 'Add repositories from your GitHub account to showcase them here.'
                      : 'This student has not published any projects yet.'}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="paper-button paper-button-dark text-xs py-1.5 px-3.5 font-bold min-h-[34px] mt-1"
                    >
                      Go to My Projects
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Spotlight Project Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {projects.map(project => (
                      <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onClick={() => setSelectedProject(project)} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* MODAL: Owner Profile Edit Controls */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-xs">
          <div className="bg-[#FEFCF6] paper-card max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-[5px_5px_0px_#000] max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-dashed border-[#212121] pb-2.5">
              <div>
                <span className="text-[9px] font-sketch uppercase tracking-widest text-stone-700 block font-bold">
                  IDENTITY SETTINGS
                </span>
                <h3 className="text-base sm:text-lg font-[900] uppercase font-newspaper-title text-[#212121]">
                  Edit Profile Information
                </h3>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              {profileError && (
                <div className="p-2.5 bg-red-100 border border-red-500 text-red-950 text-xs font-mono flex items-center space-x-1.5 rounded-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-600" />
                  <span>{profileError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs font-serif-body min-h-[34px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                    Degree Program
                  </label>
                  <select
                    value={editProgramOption}
                    onChange={(e) => setEditProgramOption(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs font-serif-body min-h-[34px] cursor-pointer"
                  >
                    {DEGREE_PROGRAM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] mb-1 font-bold">
                    Year Level
                  </label>
                  <select
                    value={editYearLevel}
                    onChange={(e) => setEditYearLevel(e.target.value)}
                    className="w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs font-serif-body min-h-[34px]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Graduate / Alumni">Graduate / Alumni</option>
                  </select>
                </div>
              </div>

              {editProgramOption === 'Other Programs' && (
                <div className="p-2.5 bg-[#FAF6EC] paper-card border border-[#212121] space-y-1">
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                    Specify Degree Program Name
                  </label>
                  <input
                    type="text"
                    value={editCustomProgram}
                    onChange={(e) => setEditCustomProgram(e.target.value)}
                    placeholder="e.g. BS Information Systems"
                    className="w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs font-serif-body min-h-[34px]"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-headline uppercase tracking-wider text-[#212121] font-bold">
                    About Me <span className="text-stone-600 font-normal">(Max 50 Characters)</span>
                  </label>
                  <span
                    className={`text-[11px] font-mono font-bold ${
                      editBio.length > 50 ? 'text-red-600' : editBio.length >= 45 ? 'text-amber-800' : 'text-stone-700'
                    }`}
                  >
                    {editBio.length} / 50 characters
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value.slice(0, 50))}
                  placeholder="Crisp 50-character summary of your tech passion..."
                  className={`w-full px-2.5 py-1.5 paper-input text-[#212121] text-xs font-serif-body min-h-[34px] ${
                    editBio.length >= 50 ? 'border-amber-600 ring-1 ring-amber-600' : ''
                  }`}
                />
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-dashed border-[#212121]">
                {profileSaved ? (
                  <span className="paper-badge bg-emerald-100 text-emerald-950 border-emerald-800 text-[10px] font-bold py-0.5 px-2">
                    <Check className="w-3.5 h-3.5 mr-1 inline-block text-emerald-700" />
                    Profile Updated
                  </span>
                ) : (
                  <span></span>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="paper-button text-xs py-1.5 px-3 min-h-[34px] font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="paper-button paper-button-dark text-xs py-1.5 px-4 font-bold disabled:opacity-50 min-h-[34px]"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-black/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setSelectedProject(null)}
        >
          <div 
            className="bg-[#FEFCF6] paper-card max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col shadow-[6px_6px_0px_#000]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start border-b border-dashed border-[#212121] p-4 sm:p-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-[900] uppercase font-newspaper-title text-[#212121]">
                  {selectedProject.custom_title || selectedProject.repo_full_name.split('/')[1]}
                </h2>
                <p className="text-xs font-mono text-stone-700 mt-0.5">
                  {selectedProject.repo_full_name}
                </p>
              </div>
              <button 
                onClick={() => setSelectedProject(null)} 
                className="paper-button-icon min-w-[32px] min-h-[32px] p-1 flex items-center justify-center text-stone-800 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {/* Live GitHub Telemetry Bar */}
              <div className="flex items-center space-x-3 text-xs font-mono text-stone-800 font-bold py-1 border-b border-dashed border-[#212121]/50 pb-2">
                <span className="flex items-center space-x-1" title="Actual GitHub Stars">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-700" />
                  <span>{selectedProject.live_stats?.stars ?? 0} stars</span>
                </span>
                <span className="flex items-center space-x-1" title="GitHub Forks">
                  <GitFork className="w-3.5 h-3.5 text-stone-600" />
                  <span>{selectedProject.live_stats?.forks ?? 0} forks</span>
                </span>
                {selectedProject.live_stats?.language && (
                  <span className="paper-badge text-[10px] bg-stone-200">
                    {selectedProject.live_stats.language}
                  </span>
                )}
                {selectedProject.live_stats?.open_issues !== undefined && selectedProject.live_stats.open_issues > 0 && (
                  <span className="text-[10px] text-stone-600 font-normal">
                    ({selectedProject.live_stats.open_issues} open issues)
                  </span>
                )}
              </div>

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
              
              <div className="flex items-center space-x-3 pt-3 border-t border-dashed border-[#212121]">
                {selectedProject.live_stats?.homepage && (
                  <a
                    href={selectedProject.live_stats.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="paper-button text-xs py-2 px-4 font-bold inline-flex items-center space-x-1"
                  >
                    <Globe className="w-4 h-4 mr-1" />
                    <span>Visit Live Site</span>
                  </a>
                )}
                <a
                  href={selectedProject.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="paper-button paper-button-dark text-xs py-2 px-4 font-bold inline-flex items-center space-x-1"
                >
                  <Github className="w-4 h-4 mr-1" />
                  <span>View on GitHub</span>
                </a>
              </div>
              
              {/* More Projects by Developer */}
              {projects.filter(p => p.id !== selectedProject.id).length > 0 && (
                <div className="mt-6 border-t border-dashed border-[#212121] pt-5">
                  <h3 className="text-xs font-[900] uppercase font-newspaper-title text-[#212121] mb-2.5">
                    More Projects by {profile.full_name || profile.github_username}
                  </h3>
                  <div className="space-y-2">
                    {projects.filter(p => p.id !== selectedProject.id).map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProject(p)}
                        className="w-full text-left p-3 paper-card bg-[#FAF6EC] hover:bg-[#FEFCF6] transition-colors flex justify-between items-center cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold font-newspaper-title uppercase text-sm truncate">
                            {p.custom_title || p.repo_full_name.split('/')[1]}
                          </div>
                          <div className="text-xs font-serif-body text-stone-600 mt-0.5">
                            {p.custom_description || p.live_stats?.description || 'No description provided.'}
                          </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-stone-600 flex-shrink-0 ml-2" />
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
  onClick: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const stats = project.live_stats;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3.5 sm:p-4 paper-card bg-[#FEFCF6] transition-all flex flex-col justify-between space-y-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#212121]"
    >
      <div className="space-y-2 w-full">
        {/* Header Badge */}
        <div className="flex items-start justify-between gap-2 border-b border-dashed border-[#212121] pb-2">
          <div className="space-y-0.5 w-full min-w-0">
            <h3 className="text-sm sm:text-base font-[900] uppercase font-newspaper-title text-[#212121] leading-snug truncate">
              {project.custom_title || project.repo_full_name.split('/')[1]}
            </h3>
            <p className="text-[10px] font-mono text-stone-600 truncate">
              {project.repo_full_name}
            </p>
          </div>
        </div>

        {/* Custom description */}
        <p className="text-xs font-serif-body text-stone-800 leading-relaxed">
          {project.custom_description || stats?.description || 'No description provided.'}
        </p>

        {/* Live GitHub Telemetry (Stars, Forks, Language) */}
        <div className="flex items-center space-x-2 font-mono text-[10px] text-stone-700 font-bold pt-0.5">
          {stats?.language && (
            <span className="paper-badge text-[9px] bg-stone-200">
              {stats.language}
            </span>
          )}
          <span className="flex items-center space-x-0.5" title="Actual GitHub Stars">
            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-700" />
            <span>{stats !== undefined ? stats.stars : '...'}</span>
          </span>
          {stats && (
            <span className="flex items-center space-x-0.5" title="GitHub Forks">
              <GitFork className="w-2.5 h-2.5 text-stone-600" />
              <span>{stats.forks}</span>
            </span>
          )}
        </div>

        {/* Topics / Tags */}
        {stats && stats.topics && stats.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {stats.topics.slice(0, 3).map((topic, i) => (
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
      <div className="pt-2 border-t border-dashed border-[#212121] flex items-center justify-between text-xs font-mono">
        <span className="text-[10px] font-headline uppercase font-bold text-stone-600">
          View Details &rarr;
        </span>

        <div className="flex items-center space-x-2">
          {stats?.homepage && (
            <span
              className="text-stone-800 hover:text-black underline flex items-center space-x-0.5 font-bold min-h-[28px] py-0.5 px-1 text-xs"
              onClick={(e) => { e.stopPropagation(); window.open(stats.homepage, '_blank', 'noreferrer'); }}
            >
              <Globe className="w-3 h-3 mr-0.5 flex-shrink-0" />
              <span>Live</span>
            </span>
          )}
          <span
            className="inline-flex items-center space-x-0.5 text-stone-800 hover:text-black underline font-bold min-h-[28px] py-0.5 px-1 text-xs"
            onClick={(e) => { e.stopPropagation(); window.open(project.repo_url, '_blank', 'noreferrer'); }}
          >
            <Github className="w-3.5 h-3.5 mr-0.5 flex-shrink-0" />
            <span>GitHub</span>
            <ExternalLink className="w-2.5 h-2.5 ml-0.5 flex-shrink-0" />
          </span>
        </div>
      </div>
    </button>
  );
};
