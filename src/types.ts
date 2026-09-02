export interface Profile {
  id: string;
  github_username: string;
  full_name: string | null;
  headline?: string | null;
  avatar_url: string | null;
  bio: string | null; // Max 50 characters for About Me
  program: string | null;
  year_level: string | null;
  is_onboarded?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // 0 = no commits, 4 = heavy commits
}

export interface ContributionCalendar {
  totalContributions: number;
  weeks: {
    days: ContributionDay[];
  }[];
  currentStreak: number;
  longestStreak: number;
  activeDaysCount: number;
  totalTrackedDays: number;
  weeklyAverage: string;
  activePercent: number;
  levelCounts: Record<0 | 1 | 2 | 3 | 4, number>;
}

export interface GitHubUserData {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  company?: string | null;
  location?: string | null;
  blog?: string | null;
  html_url: string;
}

export interface ShowcasedProject {
  id: string;
  profile_id: string;
  repo_full_name: string;
  repo_url: string;
  custom_title: string | null;
  custom_description: string | null;
  is_featured?: boolean;
  display_order: number;
  added_at?: string;
  // Enriched live metadata from GitHub
  live_stats?: RepoLiveStats;
}

export interface RepoLiveStats {
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  last_commit_at?: string;
  description?: string | null;
  homepage?: string | null;
  open_issues?: number;
  license?: string | null;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  updated_at: string;
  pushed_at?: string;
  homepage?: string | null;
  private: boolean;
  fork: boolean;
  open_issues_count?: number;
  license?: { spdx_id?: string; name?: string } | null;
}

export interface StudentShowcaseData {
  profile: Profile;
  projects: ShowcasedProject[];
}
