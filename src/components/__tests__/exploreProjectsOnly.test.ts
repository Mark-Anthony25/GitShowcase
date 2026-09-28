import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const exploreView = readFileSync(join(process.cwd(), 'src', 'components', 'ExploreView.tsx'), 'utf8');

if (exploreView.includes('browseMode')) {
  throw new Error('Explore must not retain a competing student/project browse mode.');
}

if (!/>\s*Projects\s*</.test(exploreView)) {
  throw new Error('Explore must present the single browse destination as Projects.');
}

if (!exploreView.includes('filteredProjects.map')) {
  throw new Error('Explore must keep project cards as the sole result surface.');
}

if (!exploreView.includes("navigate(`/u/${student.profile.github_username}`)")) {
  throw new Error('Project cards must retain navigation to the project author profile.');
}

console.log('Explore projects-only test passed');
