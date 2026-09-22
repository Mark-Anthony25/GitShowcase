const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const out = __dirname;
const base = 'http://127.0.0.1:3000';
const mockUserId = '74268065-0000-0000-0000-000000000000';
const projectRef = 'zoykybevkkhypkivgrvh';
const profile = { id: mockUserId, github_username: 'Mark-Anthony25', full_name: 'Mark Anthony Reyes', headline: 'BS Computer Science • Full-Stack & Systems Developer', avatar_url: 'https://avatars.githubusercontent.com/u/74268065?v=4', bio: 'Building intelligent student tools & campus platforms', program: 'BS Computer Science', year_level: '4th Year', is_onboarded: true, created_at: new Date('2025-08-15').toISOString(), updated_at: new Date().toISOString() };
const projects = [
  { id: 'proj-001', profile_id: mockUserId, repo_full_name: 'Mark-Anthony25/GitShowcase', repo_url: 'https://github.com/Mark-Anthony25/GitShowcase', custom_title: 'GitShowcase • Campus Portfolio Registry', custom_description: 'Centralized repository showcase and academic portfolio registry linking ISU Cauayan student GitHub telemetry.', is_featured: true, display_order: 1, added_at: new Date('2026-01-10').toISOString(), live_stats: { stars: 38, forks: 9, language: 'TypeScript', topics: ['react19', 'typescript', 'tailwindv4', 'papercss', 'supabase'], last_commit_at: new Date().toISOString(), homepage: 'https://gitshowcase.vercel.app' } },
  { id: 'proj-002', profile_id: mockUserId, repo_full_name: 'Mark-Anthony25/campuslink-mobile', repo_url: 'https://github.com/Mark-Anthony25/campuslink-mobile', custom_title: 'CampusLink • Student Hub Mobile App', custom_description: 'Cross-platform mobile application for real-time university announcements, grade inquiries, and student schedules.', is_featured: true, display_order: 2, added_at: new Date('2026-01-20').toISOString(), live_stats: { stars: 24, forks: 5, language: 'Flutter', topics: ['flutter', 'dart', 'firebase', 'mobile'], last_commit_at: new Date().toISOString() } },
  { id: 'proj-003', profile_id: mockUserId, repo_full_name: 'Mark-Anthony25/isu-thesis-archiver', repo_url: 'https://github.com/Mark-Anthony25/isu-thesis-archiver', custom_title: 'ISU Thesis Archiver & Search Engine', custom_description: 'Digital catalog and semantic citation indexing engine for undergraduate capstone projects.', is_featured: false, display_order: 3, added_at: new Date('2026-02-01').toISOString(), live_stats: { stars: 17, forks: 3, language: 'Python', topics: ['python', 'fastapi', 'postgresql', 'search'], last_commit_at: new Date().toISOString() } }
];
const session = { access_token: 'mock-access-token-gitshowcase', token_type: 'bearer', expires_in: 7200, expires_at: Math.floor(Date.now() / 1000) + 7200, refresh_token: 'mock-refresh-token', user: { id: mockUserId, aud: 'authenticated', role: 'authenticated', email: 'markanthony@isu.edu.ph', user_metadata: { user_name: 'Mark-Anthony25', full_name: 'Mark Anthony Reyes', avatar_url: profile.avatar_url } } };

async function shot(page, name, width, height, route, auth = false) {
  await page.setViewportSize({ width, height });
  if (auth) await page.addInitScript(({ session, ref, profile, projects, userId }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
    localStorage.setItem('gitshowcase_profiles', JSON.stringify({ 'mark-anthony25': profile }));
    localStorage.setItem('gitshowcase_projects', JSON.stringify(projects));
    localStorage.setItem(`gitshowcase_cache_v2_profile_id_${userId}`, JSON.stringify({ data: profile, timestamp: Date.now(), ttlMs: 300000 }));
    localStorage.setItem(`gitshowcase_cache_v2_student_projects_${userId}`, JSON.stringify({ data: projects, timestamp: Date.now(), ttlMs: 300000 }));
  }, { session, ref: projectRef, profile, projects, userId: mockUserId });
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, name), fullPage: false });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const pub = await browser.newPage();
  await shot(pub, '01-landing-laptop.png', 1440, 900, '/');
  await shot(pub, '02-explore-laptop.png', 1440, 900, '/explore');
  await shot(pub, '03-profile-tablet.png', 834, 1112, '/u/Mark-Anthony25');
  await shot(pub, '04-profile-mobile.png', 390, 844, '/u/Mark-Anthony25');
  await shot(pub, '05-explore-mobile.png', 390, 844, '/explore');
  await shot(pub, '06-explore-tablet.png', 834, 1112, '/explore');
  const auth = await browser.newPage();
  await shot(auth, '07-dashboard-laptop.png', 1440, 900, '/dashboard', true);
  await shot(auth, '08-dashboard-tablet.png', 834, 1112, '/dashboard', true);
  await shot(auth, '09-dashboard-mobile.png', 390, 844, '/dashboard', true);
  await browser.close();
})();
