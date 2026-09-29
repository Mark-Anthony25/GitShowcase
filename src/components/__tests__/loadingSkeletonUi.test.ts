import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const componentRoot = join(process.cwd(), 'src', 'components');
const loadingViews = [
  'LandingView.tsx',
  'ExploreView.tsx',
  'DashboardView.tsx',
  'PublicProfileView.tsx',
  'CommitHeatmap.tsx',
  'OnboardingModal.tsx',
  'AuthGateView.tsx',
  'SupabaseGuideModal.tsx',
];

for (const file of loadingViews) {
  const source = readFileSync(join(componentRoot, file), 'utf8');
  if (!source.includes('Skeleton')) {
    throw new Error(`${file} must use a skeleton placeholder while loading.`);
  }
  if (source.includes('animate-spin')) {
    throw new Error(`${file} must not use a spinner for loading states.`);
  }
}

console.log('All loading states use skeleton placeholders');
