import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('Running Screenshot Requirement & 3-Column Layout Verification...');

const root = process.cwd();

// 1. Verify schema.sql
const schemaSql = fs.readFileSync(path.join(root, 'supabase/schema.sql'), 'utf-8');
assert.ok(schemaSql.includes('alter table public.showcased_projects add column if not exists screenshot_url text;'), 'schema.sql has screenshot_url column');
assert.ok(schemaSql.includes('p_screenshot_url text default null'), 'schema.sql RPC accepts p_screenshot_url');
assert.ok(schemaSql.includes("'project-screenshots'"), 'schema.sql creates project-screenshots bucket');
console.log('✓ Test 1: Database schema & storage bucket policies validated');

// 2. Verify DashboardView.tsx 3-column grid & required screenshot validation
const dashboardSrc = fs.readFileSync(path.join(root, 'src/components/DashboardView.tsx'), 'utf-8');
assert.ok(dashboardSrc.includes('lg:grid-cols-3'), 'DashboardView has 3-column layout');
assert.ok(!dashboardSrc.includes('xl:grid-cols-4'), 'DashboardView removed 4-column layout');
assert.ok(dashboardSrc.includes('A sample project screenshot or UI image is required before publishing.'), 'DashboardView enforces screenshot before publishing');
assert.ok(dashboardSrc.includes('disabled={addingInProgress || !screenshotFile}'), 'Publish button disabled when screenshot missing');
assert.ok(dashboardSrc.includes('proj.screenshot_url'), 'DashboardView displays screenshot_url');
console.log('✓ Test 2: DashboardView 3-column grid and mandatory screenshot upload validated');

// 3. Verify ExploreView.tsx 3-column grid & screenshot rendering
const exploreSrc = fs.readFileSync(path.join(root, 'src/components/ExploreView.tsx'), 'utf-8');
assert.ok(exploreSrc.includes('lg:grid-cols-3'), 'ExploreView has 3-column layout');
assert.ok(!exploreSrc.includes('lg:grid-cols-4'), 'ExploreView removed 4-column layout');
assert.ok(exploreSrc.includes('project.screenshot_url'), 'ExploreView displays project.screenshot_url');
console.log('✓ Test 3: ExploreView 3-column grid and screenshot rendering validated');

// 4. Verify PublicProfileView.tsx 3-column grid & screenshot rendering
const profileSrc = fs.readFileSync(path.join(root, 'src/components/PublicProfileView.tsx'), 'utf-8');
assert.ok(profileSrc.includes('lg:grid-cols-3'), 'PublicProfileView has 3-column layout');
assert.ok(profileSrc.includes('project.screenshot_url'), 'PublicProfileView displays project.screenshot_url');
console.log('✓ Test 4: PublicProfileView 3-column grid and screenshot rendering validated');

// 5. Verify LandingView.tsx 3-column grid & screenshot rendering
const landingSrc = fs.readFileSync(path.join(root, 'src/components/LandingView.tsx'), 'utf-8');
assert.ok(landingSrc.includes('lg:grid-cols-3'), 'LandingView has 3-column layout');
assert.ok(!landingSrc.includes('lg:grid-cols-4'), 'LandingView removed 4-column layout');
assert.ok(landingSrc.includes('proj.screenshot_url'), 'LandingView displays proj.screenshot_url');
console.log('✓ Test 5: LandingView 3-column grid and screenshot rendering validated');

console.log('All Screenshot & 3-Column Layout Validations Passed Successfully!');
