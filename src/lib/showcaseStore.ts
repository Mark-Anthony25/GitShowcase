import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';
import { fetchLiveRepoStats } from './github';

const LOCAL_STORAGE_KEY_PROFILES = 'showcase_demo_profiles';
const LOCAL_STORAGE_KEY_PROJECTS = 'showcase_demo_projects';

// Initial demo profile for preview testability
const defaultDemoProfile: Profile = {
  id: 'demo-student-uuid-001',
  github_username: 'isabela-coder',
  full_name: 'Mark Anthony Reyes',
  headline: 'BS Computer Science • Full-Stack Developer',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  bio: 'Passionate CS student crafting web & IoT systems.',
  program: 'BS Computer Science',
  year_level: '3rd Year',
  is_onboarded: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultDemoProjects: ShowcasedProject[] = [
  {
    id: 'proj-1',
    profile_id: 'demo-student-uuid-001',
    repo_full_name: 'isu-student/campus-event-navigator',
    repo_url: 'https://github.com/isu-student/campus-event-navigator',
    custom_title: 'Campus Navigator & Event Hub',
    custom_description: 'Full-stack interactive mapping application designed for university events with real-time room navigation.',
    is_featured: true,
    display_order: 1,
    added_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'proj-2',
    profile_id: 'demo-student-uuid-001',
    repo_full_name: 'isu-student/ai-code-reviewer-cli',
    repo_url: 'https://github.com/isu-student/ai-code-reviewer-cli',
    custom_title: 'AI Code Reviewer Engine (Rust)',
    custom_description: 'High performance CLI that executes automated AST scans on git diffs before merging.',
    is_featured: true,
    display_order: 2,
    added_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'proj-3',
    profile_id: 'demo-student-uuid-001',
    repo_full_name: 'isu-student/agri-crop-vision',
    repo_url: 'https://github.com/isu-student/agri-crop-vision',
    custom_title: 'Regional Agri-Vision AI',
    custom_description: 'Deep learning model trained to classify leaf blights in regional crops with 94.2% accuracy.',
    is_featured: false,
    display_order: 3,
    added_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  }
];

function getLocalDemoData(): { profiles: Record<string, Profile>; projects: ShowcasedProject[] } {
  if (typeof window === 'undefined') {
    return {
      profiles: { [defaultDemoProfile.github_username.toLowerCase()]: defaultDemoProfile },
      projects: defaultDemoProjects,
    };
  }

  const rawProfiles = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
  const rawProjects = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);

  let profiles: Record<string, Profile> = {};
  let projects: ShowcasedProject[] = [];

  if (rawProfiles) {
    try {
      profiles = JSON.parse(rawProfiles);
    } catch {
      profiles = {};
    }
  }

  if (rawProjects) {
    try {
      projects = JSON.parse(rawProjects);
    } catch {
      projects = [];
    }
  }

  if (!profiles[defaultDemoProfile.github_username.toLowerCase()]) {
    profiles[defaultDemoProfile.github_username.toLowerCase()] = defaultDemoProfile;
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  }

  if (projects.length === 0) {
    projects = defaultDemoProjects;
    localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  }

  return { profiles, projects };
}

function saveLocalDemoData(profiles: Record<string, Profile>, projects: ShowcasedProject[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

/**
 * Fetch profile by user ID
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Error fetching profile from Supabase:', error.message);
      return null;
    }
    return data as Profile;
  }

  const { profiles } = getLocalDemoData();
  const match = Object.values(profiles).find(p => p.id === userId);
  return match || defaultDemoProfile;
}

/**
 * Fetch public showcase data by student GitHub username
 */
export async function getStudentShowcaseByUsername(username: string): Promise<StudentShowcaseData | null> {
  const normalizedUsername = username.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    // 1. Fetch Profile
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .ilike('github_username', normalizedUsername)
      .maybeSingle();

    if (profileErr || !profileData) {
      console.warn(`Profile not found for ${username} in Supabase:`, profileErr?.message);
      return null;
    }

    // 2. Fetch Showcased Projects
    const { data: projectsData, error: projErr } = await supabase
      .from('showcased_projects')
      .select('*')
      .eq('profile_id', profileData.id)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('added_at', { ascending: false });

    if (projErr) {
      console.error('Error fetching showcase projects:', projErr.message);
    }

    const rawProjects = (projectsData || []) as ShowcasedProject[];

    // 3. Enrich projects with live GitHub stats
    const enrichedProjects = await Promise.all(
      rawProjects.map(async (p) => {
        const stats = await fetchLiveRepoStats(p.repo_full_name);
        return {
          ...p,
          live_stats: stats || undefined,
        };
      })
    );

    return {
      profile: profileData as Profile,
      projects: enrichedProjects,
    };
  }

  // Fallback demo local store
  const { profiles, projects } = getLocalDemoData();
  const profile = profiles[normalizedUsername];

  if (!profile) {
    return null;
  }

  const studentProjects = projects.filter(p => p.profile_id === profile.id);

  // Enrich with live stats where possible
  const enriched = await Promise.all(
    studentProjects.map(async (p) => {
      const stats = await fetchLiveRepoStats(p.repo_full_name);
      return {
        ...p,
        live_stats: stats || undefined,
      };
    })
  );

  return {
    profile,
    projects: enriched,
  };
}

/**
 * Fetch all students for Explore / Showcase Directory
 */
export async function getAllStudentsShowcase(): Promise<StudentShowcaseData[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*, showcased_projects(*)')
      .order('created_at', { ascending: false });

    if (error || !profiles) {
      console.error('Error fetching all showcases from Supabase:', error?.message);
      return [];
    }

    return profiles.map((p: any) => ({
      profile: {
        id: p.id,
        github_username: p.github_username,
        full_name: p.full_name,
        headline: p.headline || null,
        avatar_url: p.avatar_url,
        bio: p.bio,
        program: p.program,
        year_level: p.year_level,
        is_onboarded: Boolean(p.is_onboarded),
        created_at: p.created_at,
        updated_at: p.updated_at,
      },
      projects: p.showcased_projects || [],
    }));
  }

  // Fallback local demo directory
  const { profiles, projects } = getLocalDemoData();
  return Object.values(profiles).map(profile => ({
    profile,
    projects: projects.filter(p => p.profile_id === profile.id),
  }));
}

/**
 * Fetch showcased projects for the logged in student
 */
export async function getStudentShowcasedProjects(profileId: string): Promise<ShowcasedProject[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('showcased_projects')
      .select('*')
      .eq('profile_id', profileId)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching showcased projects:', error.message);
      return [];
    }
    return data as ShowcasedProject[];
  }

  const { projects } = getLocalDemoData();
  return projects.filter(p => p.profile_id === profileId);
}

/**
 * Add a repository to showcase
 */
export async function addProjectToShowcase(params: {
  profileId: string;
  repoFullName: string;
  repoUrl: string;
  customTitle?: string | null;
  customDescription?: string | null;
  isFeatured?: boolean;
}): Promise<ShowcasedProject | null> {
  if (isSupabaseConfigured && supabase) {
    const newRow = {
      profile_id: params.profileId,
      repo_full_name: params.repoFullName,
      repo_url: params.repoUrl,
      custom_title: params.customTitle || null,
      custom_description: params.customDescription || null,
      is_featured: Boolean(params.isFeatured),
      display_order: 0,
    };

    const { data, error } = await supabase
      .from('showcased_projects')
      .insert(newRow)
      .select()
      .single();

    if (error) {
      console.error('Error adding project to Supabase:', error.message);
      throw error;
    }
    return data as ShowcasedProject;
  }

  // Local demo fallback
  const { profiles, projects } = getLocalDemoData();
  const newProj: ShowcasedProject = {
    id: `local-proj-${Date.now()}`,
    profile_id: params.profileId,
    repo_full_name: params.repoFullName,
    repo_url: params.repoUrl,
    custom_title: params.customTitle || null,
    custom_description: params.customDescription || null,
    is_featured: Boolean(params.isFeatured),
    display_order: projects.filter(p => p.profile_id === params.profileId).length + 1,
    added_at: new Date().toISOString(),
  };

  projects.unshift(newProj);
  saveLocalDemoData(profiles, projects);
  return newProj;
}

/**
 * Remove project from showcase
 */
export async function removeProjectFromShowcase(projectId: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('showcased_projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('Error deleting project:', error.message);
      throw error;
    }
    return true;
  }

  const { profiles, projects } = getLocalDemoData();
  const filtered = projects.filter(p => p.id !== projectId);
  saveLocalDemoData(profiles, filtered);
  return true;
}

/**
 * Update showcase project item (title, description, is_featured, display_order)
 */
export async function updateShowcaseProject(
  projectId: string,
  updates: Partial<ShowcasedProject>
): Promise<ShowcasedProject | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('showcased_projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project in Supabase:', error.message);
      throw error;
    }
    return data as ShowcasedProject;
  }

  const { profiles, projects } = getLocalDemoData();
  const index = projects.findIndex(p => p.id === projectId);
  if (index >= 0) {
    projects[index] = { ...projects[index], ...updates };
    saveLocalDemoData(profiles, projects);
    return projects[index];
  }
  return null;
}

/**
 * Update student profile info
 */
export async function updateStudentProfile(
  profileId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile in Supabase:', error.message);
      throw error;
    }
    return data as Profile;
  }

  const { profiles, projects } = getLocalDemoData();
  const username = Object.keys(profiles).find(key => profiles[key].id === profileId);
  if (username && profiles[username]) {
    profiles[username] = { ...profiles[username], ...updates, updated_at: new Date().toISOString() };
    saveLocalDemoData(profiles, projects);
    return profiles[username];
  }
  return null;
}
