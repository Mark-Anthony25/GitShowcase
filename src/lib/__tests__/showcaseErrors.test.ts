import assert from 'node:assert/strict';
import { ShowcaseLoadError, isSchemaError } from '../showcaseStore';

async function runTests() {
  assert.equal(isSchemaError({code:'PGRST202',message:'Could not find the function public.save_showcased_project in the schema cache'}),false,'missing RPC is not a missing table');
  assert.equal(isSchemaError({code:'PGRST204',message:"Could not find the 'screenshot_url' column in the schema cache"}),false,'missing column is not a missing table');
  assert.equal(isSchemaError({code:'42P01',message:'unavailable'}),true,'table absence must use structured error code');
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
