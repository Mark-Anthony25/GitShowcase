import { deleteProjectScreenshot } from './imageCompression';
import { supabase, isSupabaseConfigured } from './supabase';
import { Profile, ShowcasedProject, StudentShowcaseData, PublicDirectoryPage, RepoLiveStats } from '../types';
import { getCachedOrFetch, invalidateCache, CACHE_TTL } from './cache';
import { getDemoShowcaseByUsername, getDemoStudentsShowcase } from './demoData';
import { fetchLiveRepoStats } from './github';

const LOCAL_STORAGE_KEY_PROFILES = 'gitshowcase_profiles';
const LOCAL_STORAGE_KEY_PROJECTS = 'gitshowcase_projects';

export class ShowcaseLoadError extends Error {
  readonly kind = 'unavailable' as const;

  constructor(message = 'Profile service unavailable. Please try again.') {
    super(message);
    this.name = 'ShowcaseLoadError';
  }
}

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
  if (['PGRST202','PGRST204','42703'].includes(err.code) || msg.includes('function') || msg.includes('column')) {
    return false;
  }
  const isErr = (
    ['42P01','PGRST205'].includes(err.code) ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    (msg.includes('table') && msg.includes('does not exist')) ||
    msg.includes('could not find the table') ||
    msg.includes('42p01') ||
    msg.includes('pgrst205')
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

export function normalizeRepoKey(repoFullName: string): string {
  return repoFullName.trim().toLowerCase();
}

function cachedStats(row: any): RepoLiveStats | undefined {
  const cache = row?.repo_stats_cache;
  if (!cache) return undefined;
  return { stars: cache.stars || 0, forks: cache.forks || 0, language: cache.language || null, topics: cache.topics || [], last_commit_at: cache.last_commit_at, description: cache.description || null, homepage: cache.homepage || null };
}

function publicItem(row: any): StudentShowcaseData {
  const p = row.profiles;
  return { profile: { id: p.id, github_username: p.github_username, full_name: p.full_name, headline: p.headline || null, avatar_url: p.avatar_url, bio: p.bio, website_url: p.website_url || null, program: p.program, year_level: p.year_level, is_onboarded: Boolean(p.is_onboarded), created_at: p.created_at, updated_at: p.updated_at }, projects: [{ id: row.id, profile_id: row.profile_id, repo_full_name: row.repo_full_name, repo_key: row.repo_key, repo_url: row.repo_url, custom_title: row.custom_title, custom_description: row.custom_description, screenshot_url: row.screenshot_url || null, display_order: row.display_order, added_at: row.added_at, live_stats: cachedStats(row) }] };
}

export async function getPublicDirectoryPage({ query = '', program = 'all', offset = 0, limit = 24 }: { query?: string; program?: string; offset?: number; limit?: number }): Promise<PublicDirectoryPage> {
  const take = Math.min(Math.max(limit, 1), 24);
  if (!isSupabaseConfigured || !supabase) {
    const projects = getDemoStudentsShowcase().flatMap(s => s.projects.map(project => ({ profile: s.profile, projects: [project] })));
    return { items: projects.slice(offset, offset + take), hasMore: projects.length > offset + take };
  }
  let request: any = supabase.from('showcased_projects').select('id,profile_id,repo_full_name,repo_key,repo_url,custom_title,custom_description,screenshot_url,display_order,added_at,profiles!inner(*)').order('added_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + take);
  if (program !== 'all') request = request.eq('profiles.program', program);
  if (query.trim()) request = request.or(`repo_full_name.ilike.%${query.trim()}%,custom_title.ilike.%${query.trim()}%,custom_description.ilike.%${query.trim()}%`);
  const { data, error } = await request;
  if (error) { isSchemaError(error); throw new ShowcaseLoadError('Unable to load projects. Please try again.'); }
  const rows = (data || []) as any[];
  const keys = rows.map(row => normalizeRepoKey(row.repo_key || row.repo_full_name));
  const { data: statsRows } = keys.length ? await supabase.from('repo_stats_cache').select('repo_full_name,stars,forks,language,topics,last_commit_at,description,homepage').in('repo_full_name', keys) : { data: [] };
  const stats = new Map((statsRows || []).map((row: any) => [normalizeRepoKey(row.repo_full_name), row]));
  rows.forEach(row => { row.repo_stats_cache = stats.get(normalizeRepoKey(row.repo_key || row.repo_full_name)); });
  const items = rows.slice(0, take).map(publicItem);
  const enrichedItems = await Promise.all(
    items.map(async (item) => {
      const enrichedProjects = await enrichProjectsWithLiveStats(item.projects);
      return { ...item, projects: enrichedProjects };
    })
  );
  return { items: enrichedItems, hasMore: rows.length > take };
}

// In-memory fallback for environments where localStorage is not available (Node.js test runners, SSR)
let inMemoryProfiles: Record<string, Profile> = {};
let inMemoryProjects: ShowcasedProject[] = [];

function getLocalData(): { profiles: Record<string, Profile>; projects: ShowcasedProject[] } {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return { profiles: inMemoryProfiles, projects: inMemoryProjects };
  }

  let rawProfiles: string | null, rawProjects: string | null;
  try {
    rawProfiles = localStorage.getItem(LOCAL_STORAGE_KEY_PROFILES);
    rawProjects = localStorage.getItem(LOCAL_STORAGE_KEY_PROJECTS);
  } catch {
    return {profiles: inMemoryProfiles, projects: inMemoryProjects};
  }

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

function saveLocalData(profiles: Record<string, Profile>, projects: ShowcasedProject[]): boolean {
  const cleanProjects = deduplicateProjectsList(projects);

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_PROFILES, JSON.stringify(profiles));
      localStorage.setItem(LOCAL_STORAGE_KEY_PROJECTS, JSON.stringify(cleanProjects));
    } catch (e) {
      console.warn('Could not write to localStorage:', e);
      return false;
    }
  }

  inMemoryProfiles = profiles;
  inMemoryProjects = cleanProjects;
  return true;
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
 * Remove one student's app-local profile mirror and showcased projects.
 * Remote account removal is handled by the protected AuthContext flow.
 */
export function purgeStudentShowcaseData(profileId: string, username?: string): boolean {
  const { profiles, projects } = getLocalData();
  const remainingProfiles = Object.fromEntries(
    Object.entries(profiles).filter(([, profile]) => profile.id !== profileId)
  );
  const remainingProjects = projects.filter(p => p.profile_id !== profileId);

  if (!saveLocalData(remainingProfiles, remainingProjects)) {
    return false;
  }

  invalidateShowcaseCaches(profileId, username);
  return true;
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
  const { projects: localProjects } = getLocalData();

  return await Promise.all(
    projects.map(async (p) => {
      if (p.live_stats && (p.live_stats.language || p.live_stats.stars > 0)) {
        return p;
      }
      const local = localProjects.find(
        lp => normalizeRepoKey(lp.repo_full_name) === normalizeRepoKey(p.repo_full_name)
      );
      if (local?.live_stats && (local.live_stats.language || local.live_stats.stars > 0)) {
        return { ...p, live_stats: local.live_stats };
      }
      try {
        const live = await fetchLiveRepoStats(p.repo_full_name, token, forceRefresh);
        if (live) {
          if (isSupabaseConfigured && supabase) {
            supabase
              .from('repo_stats_cache')
              .upsert({
                repo_full_name: normalizeRepoKey(p.repo_full_name),
                stars: live.stars,
                forks: live.forks,
                language: live.language,
                topics: live.topics,
                last_commit_at: live.last_commit_at,
                description: live.description,
                homepage: live.homepage,
              })
              .then(() => {}, () => {});
          }
          return { ...p, live_stats: live };
        }
      } catch (err) {
        console.warn(`Failed to fetch live stats for ${p.repo_full_name}:`, err);
      }
      return p;
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
            const enriched = await enrichProjectsWithLiveStats(rawProjects, token, forceRefresh);
            return {
              profile: profileData as Profile,
              projects: enriched,
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

      const demoShowcase = getDemoShowcaseByUsername(normalizedUsername);
      if (demoShowcase) {
        return demoShowcase;
      }

      return null;
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
  const cacheKey = getAllStudentsShowcaseCacheKey(token);

  return getCachedOrFetch(
    cacheKey,
    async () => {
      if (isSupabaseConfigured && supabase) return (await getPublicDirectoryPage({ limit: 24 })).items;

      // Fallback local store
      const { profiles, projects } = getLocalData();
      if (Object.keys(profiles).length === 0) {
        return getDemoStudentsShowcase();
      }
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

export function getAllStudentsShowcaseCacheKey(token?: string | null): string {
  return token ? 'showcase_all_students_authenticated' : 'showcase_all_students_public';
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
export const MAX_SHOWCASE_PROJECTS = 3;

export async function addProjectToShowcase(params: {
  profileId: string;
  repoFullName: string;
  repoUrl: string;
  customTitle?: string | null;
  customDescription?: string | null;
  screenshotUrl?: string | null;
  token?: string | null;
}): Promise<ShowcasedProject | null> {
  if (typeof params.customDescription === 'string') params = {...params,customDescription:params.customDescription.slice(0,99)};
  let createdProject: ShowcasedProject | null = null;
  const normalizedRepoName = params.repoFullName.trim();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('save_showcased_project', {
        p_repo_full_name: normalizedRepoName,
        p_repo_url: params.repoUrl,
        p_custom_title: params.customTitle ?? null,
        p_custom_description: params.customDescription ?? null,
        p_screenshot_url: params.screenshotUrl ?? null,
      });
      if (!error && data) {
        createdProject = data as ShowcasedProject;
        try {
          const { data: stats } = await supabase.functions.invoke('refresh-repo-stats', { body: { repoFullName: normalizedRepoName } });
          if (stats) createdProject.live_stats = cachedStats({ repo_stats_cache: stats });
        } catch {}
        invalidateShowcaseCaches(params.profileId);
        return createdProject;
      }
      if (error && error.message?.includes('PROJECT_LIMIT_REACHED')) {
        throw new Error('PROJECT_LIMIT_REACHED');
      }
      if (error) {
        isSchemaError(error);
        console.warn('Project save RPC failed; trying direct table write:', {code:error.code,message:error.message});
      }
    } catch (rpcErr: any) {
      if (rpcErr?.message === 'PROJECT_LIMIT_REACHED') throw rpcErr;
      console.warn('save_showcased_project RPC unavailable, falling back to direct table write:', rpcErr);
    }
  }

  // --- Limit enforcement: max 3 projects per user ---
  // Count existing BEFORE writing. Allow if this repo is already showcased (it's an update).
  const existing = await getStudentShowcasedProjects(params.profileId);
  const alreadyIn = existing.some(
    p => p.repo_full_name.trim().toLowerCase() === normalizedRepoName.toLowerCase()
  );
  if (!alreadyIn && existing.length >= MAX_SHOWCASE_PROJECTS) {
    throw new Error(`PROJECT_LIMIT_REACHED`);
  }

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
          screenshot_url: params.screenshotUrl !== undefined ? (params.screenshotUrl || null) : primaryRow.screenshot_url,
        };

        const { data: updated, error: updateErr } = await supabase
          .from('showcased_projects')
          .update(updatePayload)
          .eq('id', primaryRow.id)
          .select()
          .single();

        if (!updateErr && updated) {
          createdProject = updated as ShowcasedProject;
        } else if (updateErr) {
          isSchemaError(updateErr);
          console.warn('Project update failed:', {code:updateErr.code,message:updateErr.message});
        }
      } else {
        const newRow = {
          profile_id: params.profileId,
          repo_full_name: normalizedRepoName,
          repo_url: params.repoUrl,
          custom_title: params.customTitle || null,
          custom_description: params.customDescription || null,
          screenshot_url: params.screenshotUrl || null,
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
          } else if (insertError) {
            isSchemaError(insertError);
            console.warn('Project insert failed:', {code:insertError.code,message:insertError.message});
          }
        }
      }
    } catch (err) {
      isSchemaError(err);
      console.warn('Exception inserting project to Supabase:', err);
    }
  }

  if (isSupabaseConfigured && supabase && !createdProject) {
    throw new ShowcaseLoadError('Could not save project to Supabase. Ask the site owner to check database setup, then retry.');
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
      screenshot_url: params.screenshotUrl !== undefined ? (params.screenshotUrl || null) : projects[existingIdx].screenshot_url,
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
      screenshot_url: params.screenshotUrl || null,
      display_order: projects.filter(p => p.profile_id === params.profileId).length + 1,
      added_at: new Date().toISOString(),
    };
    projects.unshift(newProj);
    if (!createdProject) {
      createdProject = newProj;
    }
  }

  if (!saveLocalData(profiles, projects) && !isSupabaseConfigured) throw new Error('Browser storage is full. Remove a local project or use the GitHub preview.');

  if (createdProject && isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.functions.invoke('refresh-repo-stats', { body: { repoFullName: createdProject.repo_full_name } });
      if (data) createdProject.live_stats = cachedStats({ repo_stats_cache: data });
    } catch (err) {
      console.warn('refresh-repo-stats edge function unavailable:', err);
    }
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
    const {data: project, error: readError} = await supabase.from('showcased_projects').select('profile_id,screenshot_url').eq('id',projectId).maybeSingle();
    if (readError) throw readError;
    if (project) {
      await deleteProjectScreenshot(project.profile_id,projectId,project.screenshot_url);
      const {error} = await supabase.from('showcased_projects').delete().eq('id',projectId);
      if (error) throw error;
    }
  }
  const {profiles,projects} = getLocalData();
  if (!saveLocalData(profiles,projects.filter(p => p.id !== projectId))) throw new Error('Browser storage is full. Free some space and retry.');
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
  if (typeof updates.custom_description === 'string') updates = {...updates,custom_description:updates.custom_description.slice(0,99)};
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
      throw new Error(error?.message || 'Could not save project.');
    } catch (err) {
      isSchemaError(err);
      throw err;
    }
  }

  const { profiles, projects } = getLocalData();
  const index = projects.findIndex(p => p.id === projectId);
  if (index >= 0) {
    projects[index] = { ...projects[index], ...updates };
    if (!saveLocalData(profiles, projects)) throw new Error('Browser storage is full. Remove a local project or use the GitHub preview.');
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
  if (typeof updates.bio === 'string') updates = {...updates,bio:updates.bio.slice(0,299)};
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
        website_url: updates.website_url !== undefined ? updates.website_url : (existingProfile?.website_url ?? null),
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
        // Check if error is due to missing optional columns (e.g. headline / is_onboarded / website_url on older schema)
        const errMsg = (error.message || '').toLowerCase();
        if (errMsg.includes('headline') || errMsg.includes('is_onboarded') || errMsg.includes('website_url')) {
          console.warn('Retrying profile upsert without optional schema columns:', error.message);
          const legacyPayload = { ...payload };
          delete legacyPayload.headline;
          delete legacyPayload.is_onboarded;
          delete legacyPayload.website_url;

          const { data: legacyData, error: legacyErr } = await supabase
            .from('profiles')
            .upsert(legacyPayload, { onConflict: 'id' })
            .select()
            .single();

          if (!legacyErr && legacyData) {
            dbResult = {
              ...(legacyData as Profile),
              headline: updates.headline || existingProfile?.headline || null,
              website_url: updates.website_url || existingProfile?.website_url || null,
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
        website_url: updates.website_url || null,
        program: updates.program || 'Software Development',
        year_level: updates.year_level || 'Getting Started',
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
