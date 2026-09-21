import { Profile, ShowcasedProject, StudentShowcaseData } from '../types';

const DEMO_PROFILES: Profile[] = [
  {
    id: 'demo-profile-ava-santos',
    github_username: 'ava-santos-isu',
    full_name: 'Ava Santos',
    headline: 'BS Computer Science • Full-Stack Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
    bio: 'Building tools for campus life',
    program: 'BS Computer Science',
    year_level: '4th Year',
    is_onboarded: true,
    created_at: '2026-01-12T08:00:00.000Z',
    updated_at: '2026-01-12T08:00:00.000Z',
  },
  {
    id: 'demo-profile-noah-cruz',
    github_username: 'noah-cruz-isu',
    full_name: 'Noah Cruz',
    headline: 'BS Information Technology • Mobile Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
    bio: 'Making student services easier to reach',
    program: 'BS Information Technology',
    year_level: '3rd Year',
    is_onboarded: true,
    created_at: '2026-01-18T08:00:00.000Z',
    updated_at: '2026-01-18T08:00:00.000Z',
  },
];

const DEMO_PROJECTS: ShowcasedProject[] = [
  {
    id: 'demo-project-campus-pulse',
    profile_id: 'demo-profile-ava-santos',
    repo_full_name: 'ava-santos-isu/campus-pulse',
    repo_url: 'https://github.com/ava-santos-isu/campus-pulse',
    custom_title: 'Campus Pulse',
    custom_description: 'A campus noticeboard for announcements, events, and student-led activities.',
    is_featured: true,
    display_order: 1,
    added_at: '2026-01-13T08:00:00.000Z',
    live_stats: {
      stars: 24,
      forks: 6,
      language: 'TypeScript',
      topics: ['react', 'campus', 'supabase'],
      last_commit_at: '2026-09-18T08:00:00.000Z',
      homepage: 'https://campus-pulse.example.com',
    },
  },
  {
    id: 'demo-project-thesis-finder',
    profile_id: 'demo-profile-ava-santos',
    repo_full_name: 'ava-santos-isu/thesis-finder',
    repo_url: 'https://github.com/ava-santos-isu/thesis-finder',
    custom_title: 'Thesis Finder',
    custom_description: 'A searchable archive for discovering undergraduate capstones across cohorts.',
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
    repo_full_name: 'noah-cruz-isu/routewise',
    repo_url: 'https://github.com/noah-cruz-isu/routewise',
    custom_title: 'RouteWise',
    custom_description: 'A mobile guide for finding classrooms, offices, and student services on campus.',
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
