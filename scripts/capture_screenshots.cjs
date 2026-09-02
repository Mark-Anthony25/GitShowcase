const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const mockUserId = '74268065-0000-0000-0000-000000000000';
const projectRef = 'zoykybevkkhypkivgrvh';

const mockProfiles = {
  'mark-anthony25': {
    id: mockUserId,
    github_username: 'Mark-Anthony25',
    full_name: 'Mark Anthony Reyes',
    headline: 'BS Computer Science • Full-Stack & Systems Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/74268065?v=4',
    bio: 'Building intelligent student tools & campus platforms',
    program: 'BS Computer Science',
    year_level: '4th Year',
    is_onboarded: true,
    created_at: new Date('2025-08-15').toISOString(),
    updated_at: new Date().toISOString()
  }
};

const mockProjects = [
  {
    id: 'proj-001',
    profile_id: mockUserId,
    repo_full_name: 'Mark-Anthony25/GitShowcase',
    repo_url: 'https://github.com/Mark-Anthony25/GitShowcase',
    custom_title: 'GitShowcase • Campus Portfolio Registry',
    custom_description: 'Centralized repository showcase and academic portfolio registry linking ISU Cauayan student GitHub telemetry.',
    is_featured: true,
    display_order: 1,
    added_at: new Date('2026-01-10').toISOString(),
    live_stats: {
      stars: 38,
      forks: 9,
      language: 'TypeScript',
      topics: ['react19', 'typescript', 'tailwindv4', 'papercss', 'supabase'],
      last_commit_at: new Date().toISOString(),
      homepage: 'https://gitshowcase.vercel.app'
    }
  },
  {
    id: 'proj-002',
    profile_id: mockUserId,
    repo_full_name: 'Mark-Anthony25/campuslink-mobile',
    repo_url: 'https://github.com/Mark-Anthony25/campuslink-mobile',
    custom_title: 'CampusLink • Student Hub Mobile App',
    custom_description: 'Cross-platform mobile application for real-time university announcements, grade inquiries, and student schedules.',
    is_featured: true,
    display_order: 2,
    added_at: new Date('2026-01-20').toISOString(),
    live_stats: {
      stars: 24,
      forks: 5,
      language: 'Flutter',
      topics: ['flutter', 'dart', 'firebase', 'mobile'],
      last_commit_at: new Date().toISOString()
    }
  },
  {
    id: 'proj-003',
    profile_id: mockUserId,
    repo_full_name: 'Mark-Anthony25/isu-thesis-archiver',
    repo_url: 'https://github.com/Mark-Anthony25/isu-thesis-archiver',
    custom_title: 'ISU Thesis Archiver & Search Engine',
    custom_description: 'Digital catalog and semantic citation indexing engine for undergraduate capstone projects.',
    is_featured: false,
    display_order: 3,
    added_at: new Date('2026-02-01').toISOString(),
    live_stats: {
      stars: 17,
      forks: 3,
      language: 'Python',
      topics: ['python', 'fastapi', 'postgresql', 'search'],
      last_commit_at: new Date().toISOString()
    }
  }
];

const mockSession = {
  access_token: 'mock-access-token-gitshowcase',
  token_type: 'bearer',
  expires_in: 7200,
  expires_at: Math.floor(Date.now() / 1000) + 7200,
  refresh_token: 'mock-refresh-token',
  user: {
    id: mockUserId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'markanthony@isu.edu.ph',
    user_metadata: {
      user_name: 'Mark-Anthony25',
      full_name: 'Mark Anthony Reyes',
      avatar_url: 'https://avatars.githubusercontent.com/u/74268065?v=4'
    }
  }
};

async function run() {
  console.log('Starting Vite server on port 3456...');
  const viteProcess = spawn('npx', ['vite', '--port', '3456', '--host', '127.0.0.1'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'pipe'
  });

  // Wait for server to boot
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('Launching Chromium...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  }).catch(() => chromium.launch({ headless: true }));

  // 1. Unauthenticated Context for Landing, Explore, Public Profile
  const publicContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const publicPage = await publicContext.newPage();

  console.log('1. Capturing Home / Landing Page...');
  await publicPage.goto('http://127.0.0.1:3456/', { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  await publicPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'home.png'),
    fullPage: false
  });

  console.log('2. Capturing Explore / Browse Projects...');
  await publicPage.goto('http://127.0.0.1:3456/explore', { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  await publicPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'browse-projects.png'),
    fullPage: false
  });

  console.log('3. Capturing Project Details Modal...');
  // Switch to Projects Only tab and click Details
  const projectsOnlyTab = publicPage.locator('button', { hasText: 'Projects Only' });
  if (await projectsOnlyTab.count() > 0) {
    await projectsOnlyTab.click();
    await publicPage.waitForTimeout(500);
    const detailCard = publicPage.locator('.paper-card').filter({ hasText: 'GitShowcase' }).first();
    if (await detailCard.count() > 0) {
      await detailCard.click();
      await publicPage.waitForTimeout(600);
      await publicPage.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'project-details.png'),
        fullPage: false
      });
      await publicPage.keyboard.press('Escape');
    }
  }

  console.log('4. Capturing Public Student Profile...');
  await publicPage.goto('http://127.0.0.1:3456/u/Mark-Anthony25', { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1500);
  await publicPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'profile.png'),
    fullPage: false
  });

  console.log('5. Capturing Mobile Responsive View...');
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto('http://127.0.0.1:3456/u/Mark-Anthony25', { waitUntil: 'networkidle' });
  await publicPage.waitForTimeout(1000);
  await publicPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'mobile-view.png'),
    fullPage: false
  });

  // 2. Authenticated Context for Dashboard / Workbench
  console.log('6. Capturing Dashboard / Project Workbench...');
  const authContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  await authContext.addInitScript(({ session, ref, profiles, projects, userId }) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session));
    localStorage.setItem('gitshowcase_profiles', JSON.stringify(profiles));
    localStorage.setItem('gitshowcase_projects', JSON.stringify(projects));
    // Cache user profile and student projects in gitshowcase cache layer
    localStorage.setItem(`gitshowcase_cache_v2_profile_id_${userId}`, JSON.stringify({
      data: profiles['mark-anthony25'],
      timestamp: Date.now(),
      ttlMs: 300000
    }));
    localStorage.setItem(`gitshowcase_cache_v2_student_projects_${userId}`, JSON.stringify({
      data: projects,
      timestamp: Date.now(),
      ttlMs: 300000
    }));
  }, { session: mockSession, ref: projectRef, profiles: mockProfiles, projects: mockProjects, userId: mockUserId });

  const authPage = await authContext.newPage();
  await authPage.goto('http://127.0.0.1:3456/dashboard', { waitUntil: 'networkidle' });
  await authPage.waitForTimeout(1500);
  await authPage.screenshot({
    path: path.join(SCREENSHOTS_DIR, 'dashboard.png'),
    fullPage: false
  });

  console.log('All screenshots captured and saved in docs/screenshots/!');
  await browser.close();
  viteProcess.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
