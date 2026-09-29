import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const landing = readFileSync(join(process.cwd(), 'src', 'components', 'LandingView.tsx'), 'utf8');

if (!landing.includes('Latest Uploaded Projects') || landing.includes('Latest Student Dispatches')) {
  throw new Error('Latest Dispatch heading must use latest uploaded projects copy.');
}

if (landing.includes("{proj.repo.split('/')[1] || proj.repo}")) {
  throw new Error('Latest Dispatch cards must not repeat repository name before project title.');
}

console.log('Latest Dispatch card UI test passed');
