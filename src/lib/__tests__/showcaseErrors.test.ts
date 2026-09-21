import { ShowcaseLoadError } from '../showcaseStore';

async function runTests() {
  const error = new ShowcaseLoadError('Profile service unavailable');

  if (error.kind !== 'unavailable' || error.message !== 'Profile service unavailable') {
    throw new Error('Showcase error test failed: unavailable error classification missing');
  }

  console.log('All showcase error tests passed');
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
