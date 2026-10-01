import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const header = readFileSync(join(process.cwd(), 'src', 'components', 'Header.tsx'), 'utf8');

if (!header.includes('Explore. Build. Collaborate.')) {
  throw new Error('Header must retain the neutral product tagline.');
}

if (!header.includes('mt-2 sm:mt-3')) {
  throw new Error('Header must sit below page top edge.');
}

console.log('Header masthead UI test passed');
