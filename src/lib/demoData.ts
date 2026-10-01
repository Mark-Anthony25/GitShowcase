import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';

const DEMO_PROFILES: Profile[] = [
  {
    id: 'demo-profile-ava-santos',
    github_username: 'ava-cole',
    full_name: 'Ava Cole',
    headline: 'Full-Stack Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
    bio: 'Building useful tools for communities',
    program: 'Software Development',
    year_level: 'Independent Creator',
    is_onboarded: true,
    created_at: '2026-01-12T08:00:00.000Z',
    updated_at: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'demo-profile-noah-cruz',
    github_username: 'noah-park',
    full_name: 'Noah Park',
    headline: 'Mobile Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    bio: 'Making everyday services easier to reach',
    program: 'Software Development',
    year_level: 'Building Experience',
    is_onboarded: true,
    created_at: '2026-01-18T08:00:00.000Z',
    updated_at: '2026-01-18T08:00:00.000Z',
  },
];

const DEMO_PROJECTS: ShowcasedProject[] = [
  {
    id: 'demo-project-campus-pulse',
    profile_id: 'demo-profile-ava-santos',
    repo_full_name: 'ava-cole/community-pulse',
    repo_url: 'https://github.com/ava-cole/community-pulse',
    custom_title: 'Community Pulse',
    custom_description: 'A shared noticeboard for announcements, events, and local activities.',
    is_featured: true,
    display_order: 1,
    added_at: '2026-01-13T08:00:00.000Z',
    live_stats: {
      stars: 24,
      forks: 6,
      language: 'TypeScript',
      topics: ['react', 'community', 'supabase'],
      last_commit_at: '2026-09-18T08:00:00.000Z',
      homepage: 'https://community-pulse.example.com',
    },
  },
  {
    id: 'demo-project-thesis-finder',
    profile_id: 'demo-profile-ava-santos',
    repo_full_name: 'ava-cole/project-finder',
    repo_url: 'https://github.com/ava-cole/project-finder',
    custom_title: 'Project Finder',
    custom_description: 'A searchable archive for discovering community-built projects.',
    is_featured: true,
    display_order: 2,
    added_at: '2026-01-14T08:00:00.000Z',
    live_stats: {
      stars: 17,
      forks: 3,
      language: 'Python',
      topics: ['fastapi', 'search', 'postgresql'],
      last_commit_at: '2026-09-16T08:00:00.000Z',
    },
  },
  {
    id: 'demo-project-routewise',
    profile_id: 'demo-profile-noah-cruz',
    repo_full_name: 'noah-park/routewise',
    repo_url: 'https://github.com/noah-park/routewise',
    custom_title: 'RouteWise',
    custom_description: 'A mobile guide for finding nearby places and useful local services.',
    is_featured: true,
    display_order: 1,
    added_at: '2026-01-19T08:00:00.000Z',
    live_stats: {
      stars: 31,
      forks: 8,
      language: 'Dart',
      topics: ['flutter', 'maps', 'mobile'],
      last_commit_at: '2026-09-17T08:00:00.000Z',
      homepage: 'https://routewise.example.com',
    },
  },
];

export function getDemoStudentsShowcase(): StudentShowcaseData[] {
  return DEMO_PROFILES.map((profile) => ({
    profile: { ...profile },
    projects: DEMO_PROJECTS
      .filter((project) => project.profile_id === profile.id)
      .map((project) => ({ ...project, live_stats: project.live_stats ? { ...project.live_stats, topics: [...project.live_stats.topics] } : undefined })),
  }));
}

export function getDemoShowcaseByUsername(username: string): StudentShowcaseData | null {
  const normalized = username.trim().toLowerCase();
  return getDemoStudentsShowcase().find((student) => student.profile.github_username.toLowerCase() === normalized) || null;
}
