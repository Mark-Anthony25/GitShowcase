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

export function deduplicateProjectsList(projects: ShowcasedProject[]): ShowcasedProject[] {
  if (!Array.isArray(projects)) return [];
  const seen = new Set<string>();
  const deduped: ShowcasedProject[] = [];
  for (const p of projects) {
    if (!p || !p.profile_id || !p.repo_full_name) continue;
    const key = `${p.profile_id}::${p.repo_full_name.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }
  return deduped;
}

// In-memory fallback for environments where localStorage is not available (Node.js test runners, SSR)
let inMemoryProfiles: Record<string, Profile> = {};
let inMemoryProjects: ShowcasedProject[] = [];

function getLocalData(): { profiles: Record<string, Profile>; projects: ShowcasedProject[] } {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { profiles: inMemoryProfiles, projects: inMemoryProjects };
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
      if (Array.isArray(projects)) {
        projects = deduplicateProjectsList(projects);
      } else {
        projects = [];
      }
    } catch {
      projects = [];
    }
  }

  return { profiles, projects };
}

function saveLocalData(profiles: Record<string, Profile>, projects: ShowcasedProject[]) {
  const cleanProjects = deduplicateProjectsList(projects);
  inMemoryProfiles = profiles;
  inMemoryProjects = cleanProjects;

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(cleanProjects));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
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
  }
  invalidateCache('showcase_user_');
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
            .maybeSingle();

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
    { ttlMs: CACHE_TTL.USER_SESSION, skipCache: forceRefresh, persistLocal: false }
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
    { ttlMs: CACHE_TTL.PUBLIC_DATA, skipCache: forceRefresh, persistLocal: false }
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
    { ttlMs: CACHE_TTL.PUBLIC_DATA, skipCache: forceRefresh, persistLocal: false }
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
            .order('display_order', { ascending: true })
            .order('added_at', { ascending: false });

          if (!error && data) {
            rawProjects = deduplicateProjectsList(data as ShowcasedProject[]);
          } else if (error) {
            isSchemaError(error);
            console.warn('Notice: Falling back to local storage for showcased projects:', error.message);
            const { projects } = getLocalData();
            rawProjects = deduplicateProjectsList(projects.filter(p => p.profile_id === profileId));
          }
        } catch (err) {
          isSchemaError(err);
          console.warn('Exception fetching student projects from Supabase:', err);
          const { projects } = getLocalData();
          rawProjects = deduplicateProjectsList(projects.filter(p => p.profile_id === profileId));
        }
      } else {
        const { projects } = getLocalData();
        rawProjects = deduplicateProjectsList(projects.filter(p => p.profile_id === profileId));
      }

      return await enrichProjectsWithLiveStats(rawProjects, token, forceRefresh);
    },
    { ttlMs: CACHE_TTL.USER_SESSION, skipCache: forceRefresh, persistLocal: false }
  );
}

/**
 * Add or update a repository in showcase & invalidate affected caches
 * Automatically makes the project publicly visible and protects against duplicate additions
 */
export async function addProjectToShowcase(params: {
  profileId: string;
  repoFullName: string;
  repoUrl: string;
  customTitle?: string | null;
  customDescription?: string | null;
}): Promise<ShowcasedProject | null> {
  let createdProject: ShowcasedProject | null = null;
  const normalizedRepoName = params.repoFullName.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check if a project with the same repo name already exists for this profile
      const { data: existingRows } = await supabase
        .from('showcased_projects')
        .select('*')
        .eq('profile_id', params.profileId)
        .ilike('repo_full_name', normalizedRepoName);

      if (existingRows && existingRows.length > 0) {
        const primaryRow = existingRows[0];

        // Clean up any extraneous duplicate rows if they existed prior to constraint
        if (existingRows.length > 1) {
          const dupIds = existingRows.slice(1).map(r => r.id);
          await supabase.from('showcased_projects').delete().in('id', dupIds);
        }

        const updatePayload: Partial<ShowcasedProject> = {
          repo_url: params.repoUrl,
          custom_title: params.customTitle !== undefined ? (params.customTitle || null) : primaryRow.custom_title,
          custom_description: params.customDescription !== undefined ? (params.customDescription || null) : primaryRow.custom_description,
        };

        const { data: updated, error: updateErr } = await supabase
          .from('showcased_projects')
          .update(updatePayload)
          .eq('id', primaryRow.id)
          .select()
          .single();

        if (!updateErr && updated) {
          createdProject = updated as ShowcasedProject;
        }
      } else {
        const newRow = {
          profile_id: params.profileId,
          repo_full_name: normalizedRepoName,
          repo_url: params.repoUrl,
          custom_title: params.customTitle || null,
          custom_description: params.customDescription || null,
          display_order: 0,
        };

        // Attempt upsert with conflict key
        const { data, error } = await supabase
          .from('showcased_projects')
          .upsert(newRow, { onConflict: 'profile_id,repo_full_name' })
          .select()
          .single();

        if (!error && data) {
          createdProject = data as ShowcasedProject;
        } else if (error) {
          isSchemaError(error);
          console.warn('Upsert fallback to insert in Supabase:', error.message);
          const { data: insertData, error: insertError } = await supabase
            .from('showcased_projects')
            .insert(newRow)
            .select()
            .single();

          if (!insertError && insertData) {
            createdProject = insertData as ShowcasedProject;
          }
        }
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception inserting project to Supabase:', err);
    }
  }

  // Local storage synchronization and fallback
  const { profiles, projects } = getLocalData();
  const normalizedKey = `${params.profileId}::${normalizedRepoName.toLowerCase()}`;
  const existingIdx = projects.findIndex(
    p => `${p.profile_id}::${p.repo_full_name.trim().toLowerCase()}` === normalizedKey
  );

  if (existingIdx >= 0) {
    projects[existingIdx] = {
      ...projects[existingIdx],
      repo_url: params.repoUrl,
      custom_title: params.customTitle !== undefined ? (params.customTitle || null) : projects[existingIdx].custom_title,
      custom_description: params.customDescription !== undefined ? (params.customDescription || null) : projects[existingIdx].custom_description,
    };
    if (!createdProject) {
      createdProject = projects[existingIdx];
    }
  } else {
    const newProj: ShowcasedProject = {
      id: createdProject?.id || `local-proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      profile_id: params.profileId,
      repo_full_name: normalizedRepoName,
      repo_url: params.repoUrl,
      custom_title: params.customTitle || null,
      custom_description: params.customDescription || null,
      display_order: projects.filter(p => p.profile_id === params.profileId).length + 1,
      added_at: new Date().toISOString(),
    };
    projects.unshift(newProj);
    if (!createdProject) {
      createdProject = newProj;
    }
  }

  saveLocalData(profiles, projects);

  if (createdProject) {
    // Fetch live stats immediately for the newly added/updated repo
    const stats = await fetchLiveRepoStats(createdProject.repo_full_name, undefined, true);
    createdProject.live_stats = stats || undefined;
  }

  // Invalidate affected caches immediately so changes reflect everywhere
  invalidateShowcaseCaches(params.profileId);

  return createdProject;
}

/**
 * Sync all showcased projects for a profile during onboarding / profile update:
 * - Upserts selected repositories
 * - Removes unselected/deselected repositories
 * - Deduplicates and preserves existing valid project records
 */
export async function syncStudentShowcaseProjects(
  profileId: string,
  selectedReposMap: Record<string, {
    customTitle?: string;
    customDescription?: string;
    repoUrl?: string;
  }>
): Promise<ShowcasedProject[]> {
  const currentProjects = await getStudentShowcasedProjects(profileId, undefined, true);
  const selectedKeys = new Set(Object.keys(selectedReposMap).map(k => k.trim().toLowerCase()));

  // 1. Remove projects that were unselected
  for (const existing of currentProjects) {
    if (!selectedKeys.has(existing.repo_full_name.trim().toLowerCase())) {
      await removeProjectFromShowcase(existing.id, profileId);
    }
  }

  // 2. Add or update currently selected projects
  const result: ShowcasedProject[] = [];
  for (const [repoFullName, meta] of Object.entries(selectedReposMap)) {
    const saved = await addProjectToShowcase({
      profileId,
      repoFullName: repoFullName.trim(),
      repoUrl: meta.repoUrl || `https://github.com/${repoFullName.trim()}`,
      customTitle: meta.customTitle || null,
      customDescription: meta.customDescription || null,
    });
    if (saved) {
      result.push(saved);
    }
  }

  invalidateShowcaseCaches(profileId);
  return result;
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
 * Update showcase project item (title, description, display_order) & invalidate caches
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
  if (!profileId) {
    console.error('updateStudentProfile called without profileId');
    return null;
  }

  let dbResult: Profile | null = null;
  let dbError: any = null;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Fetch current profile from Supabase first to preserve non-updated columns
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      const baseUsername = updates.github_username || existingProfile?.github_username || '';

      const payload: Record<string, any> = {
        id: profileId,
        github_username: baseUsername || profileId,
        full_name: updates.full_name !== undefined ? updates.full_name : (existingProfile?.full_name ?? null),
        headline: updates.headline !== undefined ? updates.headline : (existingProfile?.headline ?? null),
        avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : (existingProfile?.avatar_url ?? null),
        bio: updates.bio !== undefined ? updates.bio : (existingProfile?.bio ?? null),
        program: updates.program !== undefined ? updates.program : (existingProfile?.program ?? null),
        year_level: updates.year_level !== undefined ? updates.year_level : (existingProfile?.year_level ?? null),
        is_onboarded: updates.is_onboarded !== undefined ? Boolean(updates.is_onboarded) : Boolean(existingProfile?.is_onboarded),
        updated_at: new Date().toISOString(),
      };

      // 2. Perform upsert on public.profiles
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        dbResult = data as Profile;
      } else if (error) {
        dbError = error;
        // Check if error is due to missing optional columns (e.g. headline / is_onboarded on older schema)
        const errMsg = (error.message || '').toLowerCase();
        if (errMsg.includes('headline') || errMsg.includes('is_onboarded')) {
          console.warn('Retrying profile upsert without optional schema columns:', error.message);
          const legacyPayload = { ...payload };
          delete legacyPayload.headline;
          delete legacyPayload.is_onboarded;

          const { data: legacyData, error: legacyErr } = await supabase
            .from('profiles')
            .upsert(legacyPayload, { onConflict: 'id' })
            .select()
            .single();

          if (!legacyErr && legacyData) {
            dbResult = {
              ...(legacyData as Profile),
              headline: updates.headline || existingProfile?.headline || null,
              is_onboarded: updates.is_onboarded ?? existingProfile?.is_onboarded ?? false,
            };
            dbError = null;
          } else if (legacyErr) {
            dbError = legacyErr;
          }
        }
      }
    } catch (err) {
      dbError = err;
      console.error('Exception updating profile in Supabase:', err);
    }

    if (dbError) {
      isSchemaError(dbError);
      console.error('Supabase profile update failed:', dbError?.message || dbError);
      return null;
    }
  }

  // Local storage synchronization (mirror confirmed database state or offline fallback)
  const { profiles, projects } = getLocalData();
  const effectiveUsername = (dbResult?.github_username || updates.github_username || '').toLowerCase();

  let foundKey = Object.keys(profiles).find(key => profiles[key].id === profileId);
  if (!foundKey && effectiveUsername) {
    foundKey = effectiveUsername;
  }

  let finalProfile: Profile;

  if (dbResult) {
    finalProfile = dbResult;
    if (foundKey) {
      profiles[foundKey] = finalProfile;
    } else if (effectiveUsername) {
      profiles[effectiveUsername] = finalProfile;
    } else {
      profiles[profileId] = finalProfile;
    }
    saveLocalData(profiles, projects);
  } else {
    // Offline sandbox mode only (when Supabase is not configured)
    if (foundKey && profiles[foundKey]) {
      profiles[foundKey] = {
        ...profiles[foundKey],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      finalProfile = profiles[foundKey];
    } else {
      finalProfile = {
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
      if (finalProfile.github_username) {
        profiles[finalProfile.github_username.toLowerCase()] = finalProfile;
      } else {
        profiles[profileId] = finalProfile;
      }
    }
    saveLocalData(profiles, projects);
  }

  // Invalidate all related caches with complete identifiers
  invalidateShowcaseCaches(profileId, finalProfile.github_username);

  return finalProfile;
}
