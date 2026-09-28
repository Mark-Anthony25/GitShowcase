import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const css = readFileSync(join(sourceRoot, 'index.css'), 'utf8');
const avatarViews = [
  'Header.tsx',
  'ExploreView.tsx',
  'PublicProfileView.tsx',
  'OnboardingModal.tsx',
].map((file) => readFileSync(join(sourceRoot, 'components', file), 'utf8'));

if (!css.includes('.paper-avatar') || !css.includes('border-radius: 255px 15px 225px 15px/15px 225px 15px 255px')) {
  throw new Error('Profile images must use the shared hand-drawn PaperCSS avatar frame.');
}

if (avatarViews.some((source) => !source.includes('paper-avatar'))) {
  throw new Error('Every profile avatar surface must use the shared PaperCSS avatar frame.');
}

console.log('PaperCSS avatar UI test passed');
