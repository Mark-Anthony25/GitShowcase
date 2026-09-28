import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');
const onboarding = readFileSync(join(sourceRoot, 'components', 'OnboardingModal.tsx'), 'utf8');
const authContext = readFileSync(join(sourceRoot, 'context', 'AuthContext.tsx'), 'utf8');

if (onboarding.includes('github_username: username.trim().toLowerCase()')) {
  throw new Error('Onboarding must preserve GitHub username capitalization rather than force lowercase.');
}

if (!authContext.includes('canonicalGithubUsername') || !authContext.includes('liveGitUser.login')) {
  throw new Error('Auth must use the canonical GitHub login when creating or reconciling a profile.');
}

console.log('GitHub username casing test passed');
