import { getAllStudentsShowcaseCacheKey } from '../showcaseStore';

function runTests() {
  if (getAllStudentsShowcaseCacheKey(null) === getAllStudentsShowcaseCacheKey('github-token')) {
    throw new Error('Showcase directory cache must separate public and authenticated GitHub stats');
  }

  if (getAllStudentsShowcaseCacheKey(null) !== 'showcase_all_students_public') {
    throw new Error('Public showcase directory cache key is incorrect');
  }

  if (getAllStudentsShowcaseCacheKey('github-token') !== 'showcase_all_students_authenticated') {
    throw new Error('Authenticated showcase directory cache key is incorrect');
  }

  console.log('All showcase store tests passed');
}

runTests();
