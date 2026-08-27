import { GitHubRepoItem, RepoLiveStats } from '../types';

/**
 * Fetch repos belonging to the logged-in student using their GitHub provider token
 */
export async function fetchUserRepos(
  githubToken?: string | null,
  username?: string | null
): Promise<GitHubRepoItem[]> {
  try {
    let url = 'https://api.github.com/user/repos?sort=updated&per_page=100&type=all';
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    } else if (username) {
      url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    } else {
      return getDemoRepos();
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.warn('GitHub API rate limited or unauthorized, falling back to public user repo list or demo data');
        if (username) {
          const publicRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`);
          if (publicRes.ok) {
            return await publicRes.json();
          }
        }
      }
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const repos: GitHubRepoItem[] = await res.json();
    return repos;
  } catch (error) {
    console.error('Error fetching repos from GitHub:', error);
    return getDemoRepos();
  }
}

/**
 * Fetch live single repo metadata for public profile view
 */
export async function fetchLiveRepoStats(repoFullName: string, token?: string | null): Promise<RepoLiveStats | null> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers });
    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return {
      stars: data.stargazers_count ?? 0,
      forks: data.forks_count ?? 0,
      language: data.language ?? null,
      topics: data.topics || [],
      last_commit_at: data.pushed_at || data.updated_at,
      description: data.description,
      homepage: data.homepage,
      open_issues: data.open_issues_count ?? 0,
      license: data.license?.spdx_id || data.license?.name || null,
    };
  } catch (err) {
    console.error(`Error fetching live stats for ${repoFullName}:`, err);
    return null;
  }
}

/**
 * Fetch public GitHub user profile details
 */
export async function fetchPublicGitHubUser(username: string) {
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error fetching GitHub user:', err);
    return null;
  }
}

/**
 * Demo repositories for initial demonstration / preview before GitHub login
 */
export function getDemoRepos(): GitHubRepoItem[] {
  return [
    {
      id: 101,
      name: 'campus-event-navigator',
      full_name: 'isu-student/campus-event-navigator',
      html_url: 'https://github.com/isu-student/campus-event-navigator',
      description: 'Interactive campus map & real-time seminar schedule manager for students with push alerts.',
      stargazers_count: 24,
      forks_count: 5,
      language: 'TypeScript',
      topics: ['react', 'tailwindcss', 'campus-life', 'maps'],
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      private: false,
      fork: false,
      homepage: 'https://events.example.edu'
    },
    {
      id: 102,
      name: 'ai-code-reviewer-cli',
      full_name: 'isu-student/ai-code-reviewer-cli',
      html_url: 'https://github.com/isu-student/ai-code-reviewer-cli',
      description: 'A developer CLI tool that analyzes pull requests for security vulnerabilities and code smells.',
      stargazers_count: 58,
      forks_count: 12,
      language: 'Rust',
      topics: ['cli', 'developer-tools', 'rust', 'code-review'],
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
      private: false,
      fork: false,
      homepage: null
    },
    {
      id: 103,
      name: 'agri-crop-vision',
      full_name: 'isu-student/agri-crop-vision',
      html_url: 'https://github.com/isu-student/agri-crop-vision',
      description: 'Computer vision pipeline for early disease detection in regional rice and corn crops.',
      stargazers_count: 42,
      forks_count: 8,
      language: 'Python',
      topics: ['machine-learning', 'pytorch', 'agriculture', 'computer-vision'],
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      private: false,
      fork: false,
      homepage: 'https://agrivision.example.org'
    },
    {
      id: 104,
      name: 'smart-attendance-rfid',
      full_name: 'isu-student/smart-attendance-rfid',
      html_url: 'https://github.com/isu-student/smart-attendance-rfid',
      description: 'IoT and RFID based automated classroom attendance system connected via WebSocket server.',
      stargazers_count: 17,
      forks_count: 3,
      language: 'C++',
      topics: ['iot', 'esp32', 'rfid', 'embedded'],
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
      private: false,
      fork: false,
      homepage: null
    },
    {
      id: 105,
      name: 'algo-visualizer-web',
      full_name: 'isu-student/algo-visualizer-web',
      html_url: 'https://github.com/isu-student/algo-visualizer-web',
      description: 'Step-by-step interactive animations for graph algorithms (Dijkstra, A*, BFS, DFS).',
      stargazers_count: 89,
      forks_count: 19,
      language: 'TypeScript',
      topics: ['algorithms', 'visualization', 'canvas', 'education'],
      updated_at: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
      private: false,
      fork: false,
      homepage: 'https://algoviz.example.app'
    }
  ];
}
