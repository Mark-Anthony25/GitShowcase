import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';
import { fetchLiveRepoStats } from './github';

const LOCAL_STORAGE_KEY_PROFILES = 'showcase_demo_profiles';
const LOCAL_STORAGE_KEY_PROJECTS = 'showcase_demo_projects';

// Observable state for when Supabase credentials exist but database tables are not yet created in SQL editor
let schemaMissingDetected = false;
const schemaListeners: Array<(missing: boolean) => void> = [];

export function subscribeSchemaStatus(fn: (missing: boolean) => void) {
  schemaListeners.push(fn);
  fn(schemaMissingDetected);
  return () => {
    const idx = schemaListeners.indexOf(fn);
    if (idx >= 0) schemaListeners.splice(idx, 1);
  };
}

export function reportSchemaMissing() {
  if (!schemaMissingDetected) {
    schemaMissingDetected = true;
    schemaListeners.forEach(fn => fn(true));
  }
}

export function isSchemaError(err: any): boolean {
  if (!err) return false;
  const msg = (typeof err === 'string' ? err : err.message || '').toLowerCase();
  const isErr = (
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('pgrst204') ||
    msg.includes('pgrst205') ||
    msg.includes('42p01') ||
    msg.includes('not found') ||
    msg.includes('could not find the table')
  );
  if (isErr) {
    reportSchemaMissing();
  }
  return isErr;
}

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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as Profile;
      }

      if (error) {
        if (isSchemaError(error)) {
          console.warn('Supabase profiles table not found. Using local fallback.');
        } else {
          console.warn('Error fetching profile from Supabase:', error.message);
        }
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception querying Supabase profile:', err);
    }
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
    try {
      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('github_username', normalizedUsername)
        .maybeSingle();

      if (!profileErr && profileData) {
        // 2. Fetch Showcased Projects
        const { data: projectsData, error: projErr } = await supabase
          .from('showcased_projects')
          .select('*')
          .eq('profile_id', profileData.id)
          .order('is_featured', { ascending: false })
          .order('display_order', { ascending: true })
          .order('added_at', { ascending: false });

        if (projErr) {
          isSchemaError(projErr);
          console.warn('Error fetching showcase projects from Supabase:', projErr.message);
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

      if (profileErr) {
        isSchemaError(profileErr);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception querying student showcase from Supabase:', err);
    }
  }

  // Fallback demo local store
  const { profiles, projects } = getLocalDemoData();
  const profile = profiles[normalizedUsername] || 
    (normalizedUsername === defaultDemoProfile.github_username.toLowerCase() ? defaultDemoProfile : null);

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
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, showcased_projects(*)')
        .order('created_at', { ascending: false });

      if (!error && profiles && profiles.length > 0) {
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

      if (error) {
        isSchemaError(error);
        console.warn('Error fetching all showcases from Supabase, using demo directory:', error.message);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception fetching showcases from Supabase:', err);
    }
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
    try {
      const { data, error } = await supabase
        .from('showcased_projects')
        .select('*')
        .eq('profile_id', profileId)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('added_at', { ascending: false });

      if (!error && data) {
        return data as ShowcasedProject[];
      }

      if (error) {
        isSchemaError(error);
        console.warn('Notice: Falling back to local storage for showcased projects (Supabase table not found or unavailable):', error.message);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception fetching student projects from Supabase:', err);
    }
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
    try {
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

      if (!error && data) {
        return data as ShowcasedProject;
      }

      if (error) {
        isSchemaError(error);
        console.warn('Error adding project to Supabase, saving locally instead:', error.message);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception inserting project to Supabase:', err);
    }
  }

  // Local demo fallback
  const { profiles, projects } = getLocalDemoData();
  const newProj: ShowcasedProject = {
    id: `local-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
    try {
      const { error } = await supabase
        .from('showcased_projects')
        .delete()
        .eq('id', projectId);

      if (!error) {
        return true;
      }
      isSchemaError(error);
      console.warn('Error deleting project in Supabase, removing locally:', error.message);
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception deleting project in Supabase:', err);
    }
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
    try {
      const { data, error } = await supabase
        .from('showcased_projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single();

      if (!error && data) {
        return data as ShowcasedProject;
      }
      isSchemaError(error);
      console.warn('Error updating project in Supabase, updating locally:', error?.message);
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception updating project in Supabase:', err);
    }
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profileId)
        .select()
        .single();

      if (!error && data) {
        return data as Profile;
      }
      isSchemaError(error);
      console.warn('Error updating profile in Supabase, updating locally:', error?.message);
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception updating profile in Supabase:', err);
    }
  }

  const { profiles, projects } = getLocalDemoData();
  let foundKey = Object.keys(profiles).find(key => profiles[key].id === profileId);
  if (!foundKey && updates.github_username) {
    foundKey = updates.github_username.toLowerCase();
  }

  if (foundKey && profiles[foundKey]) {
    profiles[foundKey] = { ...profiles[foundKey], ...updates, updated_at: new Date().toISOString() };
    saveLocalDemoData(profiles, projects);
    return profiles[foundKey];
  } else {
    const newProfile: Profile = {
      ...defaultDemoProfile,
      id: profileId,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    profiles[(newProfile.github_username || 'isabela-coder').toLowerCase()] = newProfile;
    saveLocalDemoData(profiles, projects);
    return newProfile;
  }
}

