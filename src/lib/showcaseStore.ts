import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';
import { fetchLiveRepoStats } from './github';

const LOCAL_STORAGE_KEY_PROFILES = 'gitshowcase_profiles';
const LOCAL_STORAGE_KEY_PROJECTS = 'gitshowcase_projects';

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

function getLocalData(): { profiles: Record<string, Profile>; projects: ShowcasedProject[] } {
  if (typeof window === 'undefined') {
    return { profiles: {}, projects: [] };
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

  return { profiles, projects };
}

function saveLocalData(profiles: Record<string, Profile>, projects: ShowcasedProject[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(projects));
}

/**
 * Enrich projects with live GitHub stats (real-time stars, forks, language, topics)
 */
export async function enrichProjectsWithLiveStats(
  projects: ShowcasedProject[],
  token?: string | null,
  forceRefresh = false
): Promise<ShowcasedProject[]> {
  if (!projects || projects.length === 0) return [];
  return await Promise.all(
    projects.map(async (p) => {
      try {
        const stats = await fetchLiveRepoStats(p.repo_full_name, token, forceRefresh);
        return {
          ...p,
          live_stats: stats || p.live_stats || undefined,
        };
      } catch (err) {
        console.warn(`Error enriching live stats for ${p.repo_full_name}:`, err);
        return p;
      }
    })
  );
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

  const { profiles } = getLocalData();
  const match = Object.values(profiles).find(p => p.id === userId);
  return match || null;
}

/**
 * Fetch public showcase data by student GitHub username with live enriched stats
 */
export async function getStudentShowcaseByUsername(
  username: string,
  token?: string | null,
  forceRefresh = false
): Promise<StudentShowcaseData | null> {
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
        const enrichedProjects = await enrichProjectsWithLiveStats(rawProjects, token, forceRefresh);

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

  // Fallback local store
  const { profiles, projects } = getLocalData();
  const profile = profiles[normalizedUsername] || Object.values(profiles).find(p => p.github_username?.toLowerCase() === normalizedUsername) || null;

  if (!profile) {
    return null;
  }

  const studentProjects = projects.filter(p => p.profile_id === profile.id);
  const enriched = await enrichProjectsWithLiveStats(studentProjects, token, forceRefresh);

  return {
    profile,
    projects: enriched,
  };
}

/**
 * Fetch all students for Explore / Showcase Directory with live enriched stats
 */
export async function getAllStudentsShowcase(
  token?: string | null,
  forceRefresh = false
): Promise<StudentShowcaseData[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, showcased_projects(*)')
        .order('created_at', { ascending: false });

      if (!error && profiles) {
        return await Promise.all(
          profiles.map(async (p: any) => {
            const rawProjects = (p.showcased_projects || []) as ShowcasedProject[];
            const enrichedProjects = await enrichProjectsWithLiveStats(rawProjects, token, forceRefresh);
            return {
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
              projects: enrichedProjects,
            };
          })
        );
      }

      if (error) {
        isSchemaError(error);
        console.warn('Error fetching all showcases from Supabase:', error.message);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception fetching showcases from Supabase:', err);
    }
  }

  // Fallback local store
  const { profiles, projects } = getLocalData();
  return await Promise.all(
    Object.values(profiles).map(async (profile) => {
      const studentProjects = projects.filter(p => p.profile_id === profile.id);
      const enrichedProjects = await enrichProjectsWithLiveStats(studentProjects, token, forceRefresh);
      return {
        profile,
        projects: enrichedProjects,
      };
    })
  );
}

/**
 * Fetch showcased projects for the logged in student with live enriched stats
 */
export async function getStudentShowcasedProjects(
  profileId: string,
  token?: string | null,
  forceRefresh = false
): Promise<ShowcasedProject[]> {
  let rawProjects: ShowcasedProject[] = [];

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
        rawProjects = data as ShowcasedProject[];
      } else if (error) {
        isSchemaError(error);
        console.warn('Notice: Falling back to local storage for showcased projects (Supabase table not found or unavailable):', error.message);
        const { projects } = getLocalData();
        rawProjects = projects.filter(p => p.profile_id === profileId);
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception fetching student projects from Supabase:', err);
      const { projects } = getLocalData();
      rawProjects = projects.filter(p => p.profile_id === profileId);
    }
  } else {
    const { projects } = getLocalData();
    rawProjects = projects.filter(p => p.profile_id === profileId);
  }

  return await enrichProjectsWithLiveStats(rawProjects, token, forceRefresh);
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
  let createdProject: ShowcasedProject | null = null;

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
        createdProject = data as ShowcasedProject;
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

  if (!createdProject) {
    // Local store fallback
    const { profiles, projects } = getLocalData();
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
    saveLocalData(profiles, projects);
    createdProject = newProj;
  }

  if (createdProject) {
    // Fetch live stats immediately for the newly added repo
    const stats = await fetchLiveRepoStats(createdProject.repo_full_name, undefined, true);
    createdProject.live_stats = stats || undefined;
  }

  return createdProject;
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

  const { profiles, projects } = getLocalData();
  const filtered = projects.filter(p => p.id !== projectId);
  saveLocalData(profiles, filtered);
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

  const { profiles, projects } = getLocalData();
  const index = projects.findIndex(p => p.id === projectId);
  if (index >= 0) {
    projects[index] = { ...projects[index], ...updates };
    saveLocalData(profiles, projects);
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

  const { profiles, projects } = getLocalData();
  let foundKey = Object.keys(profiles).find(key => profiles[key].id === profileId);
  if (!foundKey && updates.github_username) {
    foundKey = updates.github_username.toLowerCase();
  }

  if (foundKey && profiles[foundKey]) {
    profiles[foundKey] = { ...profiles[foundKey], ...updates, updated_at: new Date().toISOString() };
    saveLocalData(profiles, projects);
    return profiles[foundKey];
  } else {
    const newProfile: Profile = {
      id: profileId,
      github_username: updates.github_username || '',
      full_name: updates.full_name || null,
      headline: updates.headline || null,
      avatar_url: updates.avatar_url || null,
      bio: updates.bio || null,
      program: updates.program || 'BS Computer Science',
      year_level: updates.year_level || '1st Year',
      is_onboarded: updates.is_onboarded ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
    if (newProfile.github_username) {
      profiles[newProfile.github_username.toLowerCase()] = newProfile;
    } else {
      profiles[profileId] = newProfile;
    }
    saveLocalData(profiles, projects);
    return newProfile;
  }
}

