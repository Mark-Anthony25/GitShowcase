import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const onboarding = readFileSync(join(sourceRoot, 'components', 'OnboardingModal.tsx'), 'utf8');
const authContext = readFileSync(join(sourceRoot, 'context', 'AuthContext.tsx'), 'utf8');
const exploreView = readFileSync(join(sourceRoot, 'components', 'ExploreView.tsx'), 'utf8');
const landingView = readFileSync(join(sourceRoot, 'components', 'LandingView.tsx'), 'utf8');

if (onboarding.includes('github_username: username.trim().toLowerCase()')) {
  throw new Error('Onboarding must preserve GitHub username capitalization rather than force lowercase.');
}

if (!authContext.includes('canonicalGithubUsername') || !authContext.includes('liveGitUser.login')) {
  throw new Error('Auth must use the canonical GitHub login when creating or reconciling a profile.');
}

if (exploreView.includes('font-sketch uppercase tracking-wider text-stone-700 font-bold hover:underline truncate max-w-[130px]')) {
  throw new Error('Explore bylines must not force GitHub usernames to uppercase.');
}

if (landingView.includes('font-headline uppercase tracking-wider underline cursor-pointer flex items-center space-x-1 font-bold truncate max-w-[150px]')) {
  throw new Error('Landing-page GitHub usernames must not be forced to uppercase.');
}

console.log('GitHub username casing test passed');
