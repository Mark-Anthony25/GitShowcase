import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const exploreView = readFileSync(join(process.cwd(), 'src', 'components', 'ExploreView.tsx'), 'utf8');

if (exploreView.includes('browseMode')) {
  throw new Error('Explore must not retain a competing student/project browse mode.');
}

if (!/>\s*Projects\s*</.test(exploreView)) {
  throw new Error('Explore must present the single browse destination as Projects.');
}

if (!exploreView.includes('paginatedProjects.map') && !exploreView.includes('filteredProjects.map')) {
  throw new Error('Explore must keep project cards as the sole result surface.');
}

if (!exploreView.includes("id=\"explore-prev-page\"") || !exploreView.includes("id=\"explore-next-page\"")) {
  throw new Error('Explore must include pagination controls.');
}

if (!exploreView.includes("navigate(`/u/${student.profile.github_username}`)")) {
  throw new Error('Project cards must retain navigation to the project author profile.');
}

if (!exploreView.includes("id=\"explore-language-filter\"")) {
  throw new Error('Explore must include a language filter dropdown.');
}

if (!exploreView.includes("id=\"explore-sort-select\"")) {
  throw new Error('Explore must include a sort dropdown.');
}

if (exploreView.includes("DEGREE_PROGRAM_OPTIONS")) {
  throw new Error('Explore must not retain legacy degree program options.');
}

console.log('Explore projects-only test passed');
