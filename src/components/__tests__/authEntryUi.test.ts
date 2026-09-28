import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const components = join(process.cwd(), 'src', 'components');
const landing = readFileSync(join(components, 'LandingView.tsx'), 'utf8');
const header = readFileSync(join(components, 'Header.tsx'), 'utf8');
const authGate = readFileSync(join(components, 'AuthGateView.tsx'), 'utf8');
const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');

for (const [name, source] of [['landing', landing], ['header', header]] as const) {
  if (source.includes("navigate('/signin')") || source.includes("navigate('/signup')")) {
    throw new Error(`${name} must use the existing GitHub action instead of separate sign-in and portfolio routes.`);
  }
}

if (!landing.includes('Continue With GitHub') || !header.includes('Continue With GitHub')) {
  throw new Error('Every signed-out entry point must expose one clear Continue With GitHub action.');
}

if (authGate.includes("mode === 'signup'") || authGate.includes('Create Account With GitHub')) {
  throw new Error('The auth gate must describe one unified GitHub entry path.');
}

for (const requirement of [
  'id="delete-account-btn"',
  'id="mobile-delete-account-btn"',
  'aria-label="Delete Account Confirmation"',
  "confirmationText !== 'DELETE'",
  'Delete Account Permanently',
  'GitHub account and repositories will not be affected',
]) {
  if (!header.includes(requirement)) {
    throw new Error(`Account deletion UI is missing: ${requirement}`);
  }
}

if (!packageJson.includes('accountDeletion.test.ts')) {
  throw new Error('The account deletion regression test must run in the test suite.');
}

console.log('Unified GitHub entry UI test passed');
