import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const components = join(process.cwd(), 'src', 'components');
const landing = readFileSync(join(components, 'LandingView.tsx'), 'utf8');
const header = readFileSync(join(components, 'Header.tsx'), 'utf8');
const authGate = readFileSync(join(components, 'AuthGateView.tsx'), 'utf8');

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

console.log('Unified GitHub entry UI test passed');
