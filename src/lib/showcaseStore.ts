import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';
import { fetchLiveRepoStats, fetchGitHubUserData, fetchUserRepos } from './github';
import { getCachedOrFetch, invalidateCache, CACHE_TTL } from './cache';

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
 * Invalidate all cached data related to showcases and profiles
 */
export function invalidateShowcaseCaches(profileId?: string, username?: string) {
  invalidateCache('showcase_all_students');
  if (profileId) {
    invalidateCache(`profile_id_${profileId}`);
    invalidateCache(`student_projects_${profileId}`);
  }
  if (username) {
    invalidateCache(`showcase_user_${username.toLowerCase()}`);
  } else {
    invalidateCache('showcase_user_');
  }
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
 * Fetch profile by user ID with caching
 */
export async function getProfileById(userId: string, forceRefresh = false): Promise<Profile | null> {
  const cacheKey = `profile_id_${userId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
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
    },
    { ttlMs: CACHE_TTL.USER_SESSION, skipCache: forceRefresh }
  );
}

/**
 * Fetch public showcase data by student GitHub username with live enriched stats and multi-tier cache
 */
export async function getStudentShowcaseByUsername(
  username: string,
  token?: string | null,
  forceRefresh = false
): Promise<StudentShowcaseData | null> {
  const normalizedUsername = username.trim().toLowerCase();
  const cacheKey = `showcase_user_${normalizedUsername}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
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

      if (profile) {
        const studentProjects = projects.filter(p => p.profile_id === profile.id);
        const enriched = await enrichProjectsWithLiveStats(studentProjects, token, forceRefresh);

        return {
          profile,
          projects: enriched,
        };
      }

      // 3. Fallback: Fetch directly from GitHub for any real GitHub username
      try {
        const ghUser = await fetchGitHubUserData(token, normalizedUsername, forceRefresh);
        if (!ghUser || !ghUser.login) {
          return null;
        }

        const fallbackProfile: Profile = {
          id: `gh_${ghUser.login.toLowerCase()}`,
          github_username: ghUser.login,
          full_name: ghUser.name || ghUser.login,
          headline: ghUser.company 
            ? `${ghUser.company}${ghUser.location ? ' • ' + ghUser.location : ''}`
            : ghUser.location || (ghUser.bio ? ghUser.bio.slice(0, 45) : 'Student / Developer'),
          avatar_url: ghUser.avatar_url,
          bio: ghUser.bio ? ghUser.bio.slice(0, 50) : 'Developer on GitHub',
          program: 'BS Computer Science',
          year_level: 'Student Developer',
          is_onboarded: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const ghRepos = await fetchUserRepos(token, ghUser.login, forceRefresh);
        const nonForkRepos = ghRepos.filter(r => !r.fork).slice(0, 12);
        
        const convertedProjects: ShowcasedProject[] = nonForkRepos.map((repo, idx) => ({
          id: `gh_repo_${repo.id || repo.name}`,
          profile_id: fallbackProfile.id,
          repo_full_name: repo.full_name,
          custom_title: repo.name,
          custom_description: repo.description || '',
          is_featured: idx === 0 && (repo.stargazers_count || 0) > 0,
          display_order: idx,
          added_at: repo.updated_at || new Date().toISOString(),
          repo_url: repo.html_url,
          live_stats: {
            stars: typeof repo.stargazers_count === 'number' ? repo.stargazers_count : 0,
            forks: typeof repo.forks_count === 'number' ? repo.forks_count : 0,
            language: repo.language ?? null,
            topics: Array.isArray(repo.topics) ? repo.topics : [],
            last_commit_at: repo.pushed_at || repo.updated_at,
            description: repo.description || null,
            homepage: repo.homepage || null,
            open_issues: typeof repo.open_issues_count === 'number' ? repo.open_issues_count : 0,
            license: repo.license?.spdx_id || repo.license?.name || null,
          },
        }));

        return {
          profile: fallbackProfile,
          projects: convertedProjects,
        };
      } catch (err) {
        console.warn(`Could not resolve public GitHub profile for ${normalizedUsername}:`, err);
        return null;
      }
    },
    { ttlMs: CACHE_TTL.PUBLIC_DATA, skipCache: forceRefresh }
  );
}

/**
 * Fetch all students for Explore / Showcase Directory with caching and live telemetry
 */
export async function getAllStudentsShowcase(
  token?: string | null,
  forceRefresh = false
): Promise<StudentShowcaseData[]> {
  const cacheKey = 'showcase_all_students';

  return getCachedOrFetch(
    cacheKey,
    async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*, showcased_projects(*)')
            .order('created_at', { ascending: false });

          if (!error && profiles && profiles.length > 0) {
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
                    program: p.program || 'BS Computer Science',
                    year_level: p.year_level || 'Student',
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
    },
    { ttlMs: CACHE_TTL.PUBLIC_DATA, skipCache: forceRefresh }
  );
}

/**
 * Fetch showcased projects for the logged in student with live enriched stats & user session caching
 */
export async function getStudentShowcasedProjects(
  profileId: string,
  token?: string | null,
  forceRefresh = false
): Promise<ShowcasedProject[]> {
  const cacheKey = `student_projects_${profileId}`;

  return getCachedOrFetch(
    cacheKey,
    async () => {
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
            console.warn('Notice: Falling back to local storage for showcased projects:', error.message);
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
    },
    { ttlMs: CACHE_TTL.USER_SESSION, skipCache: forceRefresh }
  );
}

/**
 * Add a repository to showcase & invalidate affected caches
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

  // Invalidate affected caches immediately
  invalidateShowcaseCaches(params.profileId);

  return createdProject;
}

/**
 * Remove project from showcase & invalidate affected caches
 */
export async function removeProjectFromShowcase(projectId: string, profileId?: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('showcased_projects')
        .delete()
        .eq('id', projectId);

      if (!error) {
        invalidateShowcaseCaches(profileId);
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

  invalidateShowcaseCaches(profileId);
  return true;
}

/**
 * Update showcase project item (title, description, is_featured, display_order) & invalidate caches
 */
export async function updateShowcaseProject(
  projectId: string,
  updates: Partial<ShowcasedProject>,
  profileId?: string
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
        invalidateShowcaseCaches(profileId);
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
    invalidateShowcaseCaches(profileId);
    return projects[index];
  }
  return null;
}

/**
 * Update student profile info & invalidate affected caches
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
        invalidateShowcaseCaches(profileId, updates.github_username);
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

  let resultProfile: Profile;

  if (foundKey && profiles[foundKey]) {
    profiles[foundKey] = { ...profiles[foundKey], ...updates, updated_at: new Date().toISOString() };
    saveLocalData(profiles, projects);
    resultProfile = profiles[foundKey];
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
    resultProfile = newProfile;
  }

  invalidateShowcaseCaches(profileId, updates.github_username);
  return resultProfile;
}
