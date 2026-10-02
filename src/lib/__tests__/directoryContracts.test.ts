import { normalizeRepoKey } from '../showcaseStore';

if (normalizeRepoKey(' Owner/Repo ') !== 'owner/repo') {
  throw new Error('Repository keys must be canonical lowercase values');
}

console.log('Directory contracts passed');
