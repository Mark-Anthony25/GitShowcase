import { GitHubRepoItem, RepoLiveStats, ContributionCalendar, ContributionDay, GitHubUserData } from '../types';

// In-memory cache for contribution calendars and repo stats to minimize API rate-limits
const contributionCache = new Map<string, { data: ContributionCalendar; timestamp: number }>();
const repoStatsCache = new Map<string, { data: RepoLiveStats; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 30; // 30 seconds transient cache for burst rendering

let globalGitHubToken: string | null = null;

export function setActiveGitHubToken(token: string | null) {
  globalGitHubToken = token;
}

export function getActiveGitHubToken(): string | null {
  return globalGitHubToken;
}

export function clearRepoStatsCache(repoFullName?: string) {
  if (repoFullName) {
    for (const key of repoStatsCache.keys()) {
      if (key.startsWith(`${repoFullName}_`)) {
        repoStatsCache.delete(key);
      }
    }
  } else {
    repoStatsCache.clear();
  }
}

/**
 * Fetch authenticated or public user details from GitHub
 */
export async function fetchGitHubUserData(
  token?: string | null,
  username?: string | null
): Promise<GitHubUserData | null> {
  try {
    const effectiveToken = token !== undefined ? token : globalGitHubToken;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let url = 'https://api.github.com/user';
    if (effectiveToken) {
      headers.Authorization = `Bearer ${effectiveToken}`;
    } else if (username) {
      url = `https://api.github.com/users/${encodeURIComponent(username)}`;
    } else {
      return null;
    }

    const res = await fetch(url, { headers, cache: 'no-cache' });
    if (!res.ok) {
      if (effectiveToken && username && (res.status === 401 || res.status === 403)) {
        // Fallback to public endpoint if token is unauthorized
        const publicRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          cache: 'no-cache',
        });
        if (publicRes.ok) {
          const pubData = await publicRes.json();
          return {
            login: pubData.login,
            name: pubData.name || null,
            avatar_url: pubData.avatar_url,
            bio: pubData.bio || null,
            public_repos: pubData.public_repos || 0,
            followers: pubData.followers || 0,
            following: pubData.following || 0,
            company: pubData.company || null,
            location: pubData.location || null,
            blog: pubData.blog || null,
            html_url: pubData.html_url || `https://github.com/${pubData.login}`,
          };
        }
      }
      return null;
    }

    const data = await res.json();
    return {
      login: data.login,
      name: data.name || null,
      avatar_url: data.avatar_url,
      bio: data.bio || null,
      public_repos: data.public_repos || 0,
      followers: data.followers || 0,
      following: data.following || 0,
      company: data.company || null,
      location: data.location || null,
      blog: data.blog || null,
      html_url: data.html_url || `https://github.com/${data.login}`,
    };
  } catch (err) {
    console.error('Error fetching GitHub user data:', err);
    return null;
  }
}

/**
 * Fetch repos belonging to the logged-in student using their GitHub provider token or public username
 */
export async function fetchUserRepos(
  githubToken?: string | null,
  username?: string | null,
  forceRefresh = false
): Promise<GitHubRepoItem[]> {
  try {
    const effectiveToken = githubToken !== undefined ? githubToken : globalGitHubToken;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    let url = 'https://api.github.com/user/repos?sort=updated&per_page=100&type=all';

    if (effectiveToken) {
      headers.Authorization = `Bearer ${effectiveToken}`;
    } else if (username) {
      url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    } else {
      return [];
    }

    const res = await fetch(url, { headers, cache: 'no-cache' });
    if (!res.ok) {
      if ((res.status === 401 || res.status === 403) && username) {
        console.warn('GitHub API rate limited or token expired, attempting public user repos');
        const publicRes = await fetch(
          `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
            cache: 'no-cache',
          }
        );
        if (publicRes.ok) {
          return await publicRes.json();
        }
      }
      throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
    }

    const repos: GitHubRepoItem[] = await res.json();
    return Array.isArray(repos) ? repos : [];
  } catch (error) {
    console.error('Error fetching repos from GitHub:', error);
    return [];
  }
}

/**
 * Fetch live single repo metadata for public profile view and dispatches
 */
export async function fetchLiveRepoStats(
  repoFullName: string,
  token?: string | null,
  forceRefresh = false
): Promise<RepoLiveStats | null> {
  const cleanRepoName = repoFullName.trim();
  if (!cleanRepoName || !cleanRepoName.includes('/')) {
    return null;
  }

  const effectiveToken = token !== undefined ? token : globalGitHubToken;
  const cacheKey = `${cleanRepoName}_${effectiveToken ? 'auth' : 'public'}`;

  if (!forceRefresh) {
    const cached = repoStatsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (effectiveToken) {
      headers.Authorization = `Bearer ${effectiveToken}`;
    }

    const res = await fetch(`https://api.github.com/repos/${cleanRepoName}`, {
      headers,
      cache: 'no-cache',
    });

    if (!res.ok) {
      // If unauthorized with token, try public fallback for public repo
      if (effectiveToken && (res.status === 401 || res.status === 403)) {
        const publicRes = await fetch(`https://api.github.com/repos/${cleanRepoName}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          cache: 'no-cache',
        });
        if (publicRes.ok) {
          const data = await publicRes.json();
          const stats: RepoLiveStats = {
            stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : 0,
            forks: typeof data.forks_count === 'number' ? data.forks_count : 0,
            language: data.language ?? null,
            topics: Array.isArray(data.topics) ? data.topics : [],
            last_commit_at: data.pushed_at || data.updated_at,
            description: data.description || null,
            homepage: data.homepage || null,
            open_issues: typeof data.open_issues_count === 'number' ? data.open_issues_count : 0,
            license: data.license?.spdx_id || data.license?.name || null,
          };
          repoStatsCache.set(cacheKey, { data: stats, timestamp: Date.now() });
          return stats;
        }
      }
      return null;
    }

    const data = await res.json();
    const stats: RepoLiveStats = {
      stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : 0,
      forks: typeof data.forks_count === 'number' ? data.forks_count : 0,
      language: data.language ?? null,
      topics: Array.isArray(data.topics) ? data.topics : [],
      last_commit_at: data.pushed_at || data.updated_at,
      description: data.description || null,
      homepage: data.homepage || null,
      open_issues: typeof data.open_issues_count === 'number' ? data.open_issues_count : 0,
      license: data.license?.spdx_id || data.license?.name || null,
    };

    repoStatsCache.set(cacheKey, { data: stats, timestamp: Date.now() });
    return stats;
  } catch (err) {
    console.error(`Error fetching live stats for ${cleanRepoName}:`, err);
    // If error occurs and we have a cached value, return it
    const lastKnown = repoStatsCache.get(cacheKey);
    return lastKnown ? lastKnown.data : null;
  }
}

/**
 * Fetch REAL GitHub Contributions for a user using:
 * 1. GitHub GraphQL API if token provided (Official exact calendar)
 * 2. Public contributions API (jogruber API - real calendar parser)
 * 3. Official GitHub public events endpoint as fallback (real commits/pushes aggregation)
 */
export async function fetchGitHubContributions(
  username: string,
  token?: string | null,
  compact = false
): Promise<ContributionCalendar> {
  const cleanUsername = username.trim().toLowerCase();
  const cacheKey = `${cleanUsername}_${compact ? 'compact' : 'full'}_${token ? 'auth' : 'anon'}`;
  
  const cached = contributionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1. Try GitHub GraphQL API first if token is available
  if (token) {
    try {
      const graphQLResult = await fetchContributionsViaGraphQL(cleanUsername, token, compact);
      if (graphQLResult) {
        contributionCache.set(cacheKey, { data: graphQLResult, timestamp: Date.now() });
        return graphQLResult;
      }
    } catch (err) {
      console.warn('GitHub GraphQL contributions fetch failed, attempting public parser fallback:', err);
    }
  }

  // 2. Try Public GitHub Contributions API parser (jogruber API)
  try {
    const publicResult = await fetchContributionsViaPublicApi(cleanUsername, compact);
    if (publicResult) {
      contributionCache.set(cacheKey, { data: publicResult, timestamp: Date.now() });
      return publicResult;
    }
  } catch (err) {
    console.warn('Public contributions API failed, attempting GitHub events parser:', err);
  }

  // 3. Try GitHub User Events API fallback
  try {
    const eventsResult = await fetchContributionsViaEventsApi(cleanUsername, token, compact);
    if (eventsResult) {
      contributionCache.set(cacheKey, { data: eventsResult, timestamp: Date.now() });
      return eventsResult;
    }
  } catch (err) {
    console.error('All GitHub contribution sources failed for user:', cleanUsername, err);
  }

  throw new Error(`Unable to load contribution data from GitHub for @${username}. Please check your connection or GitHub username.`);
}

/**
 * Method 1: Official GitHub GraphQL API
 */
async function fetchContributionsViaGraphQL(
  username: string,
  token: string,
  compact: boolean
): Promise<ContributionCalendar | null> {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                contributionLevel
                date
                weekday
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables: { username } }),
  });

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar || !calendar.weeks) {
    return null;
  }

  const rawWeeks = calendar.weeks;
  const targetWeeks = compact ? rawWeeks.slice(-26) : rawWeeks.slice(-52);

  const levelMap: Record<string, 0 | 1 | 2 | 3 | 4> = {
    NONE: 0,
    FIRST_QUARTILE: 1,
    SECOND_QUARTILE: 2,
    THIRD_QUARTILE: 3,
    FOURTH_QUARTILE: 4,
  };

  const weeks: { days: ContributionDay[] }[] = targetWeeks.map((w: any) => ({
    days: (w.contributionDays || []).map((d: any) => ({
      date: d.date,
      count: d.contributionCount ?? 0,
      level: levelMap[d.contributionLevel] ?? (d.contributionCount > 0 ? 1 : 0),
    })),
  }));

  const allDays = weeks.flatMap(w => w.days);
  const totalContributions = allDays.reduce((acc, d) => acc + d.count, 0);

  const { currentStreak, longestStreak, activeDaysCount, levelCounts } = calculateStreakStats(allDays);
  const totalTrackedDays = allDays.length;
  const weeklyAverage = (totalContributions / Math.max(1, weeks.length)).toFixed(1);
  const activePercent = totalTrackedDays > 0 ? Math.round((activeDaysCount / totalTrackedDays) * 100) : 0;

  return {
    totalContributions,
    weeks,
    currentStreak,
    longestStreak,
    activeDaysCount,
    totalTrackedDays,
    weeklyAverage,
    activePercent,
    levelCounts,
  };
}

/**
 * Method 2: Public GitHub Contribution calendar parser (jogruber API)
 */
async function fetchContributionsViaPublicApi(
  username: string,
  compact: boolean
): Promise<ContributionCalendar | null> {
  const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(username)}?y=last`);
  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.contributions) || data.contributions.length === 0) {
    return null;
  }

  const rawDays: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = data.contributions;
  const numDaysToKeep = compact ? 26 * 7 : 52 * 7;
  const targetDays = rawDays.slice(-numDaysToKeep);

  // Group into weeks (7 days each)
  const weeks: { days: ContributionDay[] }[] = [];
  for (let i = 0; i < targetDays.length; i += 7) {
    const chunk = targetDays.slice(i, i + 7).map(d => ({
      date: d.date,
      count: d.count ?? 0,
      level: (d.level ?? (d.count > 0 ? 1 : 0)) as 0 | 1 | 2 | 3 | 4,
    }));
    if (chunk.length > 0) {
      weeks.push({ days: chunk });
    }
  }

  const allDays = weeks.flatMap(w => w.days);
  const totalContributions = data.total?.lastYear ?? allDays.reduce((acc, d) => acc + d.count, 0);

  const { currentStreak, longestStreak, activeDaysCount, levelCounts } = calculateStreakStats(allDays);
  const totalTrackedDays = allDays.length;
  const weeklyAverage = (totalContributions / Math.max(1, weeks.length)).toFixed(1);
  const activePercent = totalTrackedDays > 0 ? Math.round((activeDaysCount / totalTrackedDays) * 100) : 0;

  return {
    totalContributions,
    weeks,
    currentStreak,
    longestStreak,
    activeDaysCount,
    totalTrackedDays,
    weeklyAverage,
    activePercent,
    levelCounts,
  };
}

/**
 * Method 3: GitHub User Events API fallback (computes real activity from public push/commit events)
 */
async function fetchContributionsViaEventsApi(
  username: string,
  token?: string | null,
  compact = false
): Promise<ContributionCalendar | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`, { headers });
  if (!res.ok) {
    return null;
  }

  const events = await res.json();
  if (!Array.isArray(events)) {
    return null;
  }

  // Count real events by date YYYY-MM-DD
  const dateCounts: Record<string, number> = {};
  for (const ev of events) {
    if (!ev.created_at) continue;
    const dateStr = ev.created_at.split('T')[0];
    let countToAdd = 1;
    if (ev.type === 'PushEvent' && ev.payload?.commits?.length) {
      countToAdd = ev.payload.commits.length;
    }
    dateCounts[dateStr] = (dateCounts[dateStr] || 0) + countToAdd;
  }

  const totalWeeks = compact ? 26 : 52;
  const daysPerWeek = 7;
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (totalWeeks * daysPerWeek - (7 - today.getDay())));

  const weeks: { days: ContributionDay[] }[] = [];
  let totalContributions = 0;

  for (let w = 0; w < totalWeeks; w++) {
    const days: ContributionDay[] = [];
    for (let d = 0; d < daysPerWeek; d++) {
      const cur = new Date(startDate);
      cur.setDate(startDate.getDate() + (w * daysPerWeek + d));
      const dateStr = cur.toISOString().split('T')[0];
      const isFuture = cur > today;

      const count = isFuture ? 0 : (dateCounts[dateStr] || 0);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) {
        level = count >= 8 ? 4 : count >= 5 ? 3 : count >= 3 ? 2 : 1;
        totalContributions += count;
      }

      days.push({ date: dateStr, count, level });
    }
    weeks.push({ days });
  }

  const allDays = weeks.flatMap(w => w.days);
  const { currentStreak, longestStreak, activeDaysCount, levelCounts } = calculateStreakStats(allDays);
  const totalTrackedDays = allDays.length;
  const weeklyAverage = (totalContributions / Math.max(1, weeks.length)).toFixed(1);
  const activePercent = totalTrackedDays > 0 ? Math.round((activeDaysCount / totalTrackedDays) * 100) : 0;

  return {
    totalContributions,
    weeks,
    currentStreak,
    longestStreak,
    activeDaysCount,
    totalTrackedDays,
    weeklyAverage,
    activePercent,
    levelCounts,
  };
}

/**
 * Calculate accurate streaks and distribution metrics from real days
 */
function calculateStreakStats(allDays: ContributionDay[]) {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let activeDaysCount = 0;
  const levelCounts: Record<0 | 1 | 2 | 3 | 4, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  for (let i = 0; i < allDays.length; i++) {
    const day = allDays[i];
    levelCounts[day.level] = (levelCounts[day.level] || 0) + 1;

    if (day.count > 0) {
      activeDaysCount++;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Calculate current streak counting backwards from today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIndex = allDays.findIndex(d => d.date === todayStr);
  const checkStartIndex = todayIndex >= 0 ? todayIndex : allDays.length - 1;

  for (let i = checkStartIndex; i >= 0; i--) {
    if (allDays[i].count > 0) {
      currentStreak++;
    } else if (i === checkStartIndex && allDays[i].count === 0) {
      // If today has 0 commits yet, check if yesterday was active
      continue;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    longestStreak,
    activeDaysCount,
    levelCounts,
  };
}
