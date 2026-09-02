import { getFromCache, setInCache, invalidateCache, dedupeRequest, getCachedOrFetch, CACHE_TTL } from '../cache';
import { PROFILE_COLUMNS, PROJECT_COLUMNS } from '../showcaseStore';

async function runTests() {
  console.log('Running Cache & Optimization Unit Tests...');

  // 1. Basic Set & Get
  setInCache('test_key_1', { hello: 'world' }, 5000, false);
  const val1 = getFromCache<{ hello: string }>('test_key_1');
  if (!val1 || val1.hello !== 'world') {
    throw new Error('Test 1 Failed: Memory cache set/get mismatch');
  }
  console.log('✓ Test 1: Memory cache set and get works correctly');

  // 2. Expiration (TTL)
  setInCache('test_key_exp', { expired: true }, -100, false); // already expired
  const valExp = getFromCache('test_key_exp');
  if (valExp !== null) {
    throw new Error('Test 2 Failed: Expired cache entry was not cleaned up');
  }
  console.log('✓ Test 2: Expired cache entries are properly evicted');

  // 3. Request Deduplication
  let executionCount = 0;
  const expensiveFetcher = async () => {
    executionCount++;
    await new Promise(r => setTimeout(r, 50));
    return { count: executionCount };
  };

  const [resA, resB, resC] = await Promise.all([
    dedupeRequest('dedupe_test', expensiveFetcher),
    dedupeRequest('dedupe_test', expensiveFetcher),
    dedupeRequest('dedupe_test', expensiveFetcher),
  ]);

  if (executionCount !== 1 || resA.count !== 1 || resB.count !== 1 || resC.count !== 1) {
    throw new Error(`Test 3 Failed: Request deduplication failed. Expected 1 execution, got ${executionCount}`);
  }
  console.log('✓ Test 3: In-flight request deduplication successfully coalesced 3 simultaneous requests into 1 execution');

  // 4. Invalidation
  setInCache('prefix_item_1', 'val1', 5000, false);
  setInCache('prefix_item_2', 'val2', 5000, false);
  setInCache('other_item', 'val3', 5000, false);

  invalidateCache('prefix_');
  if (getFromCache('prefix_item_1') !== null || getFromCache('prefix_item_2') !== null) {
    throw new Error('Test 4 Failed: Prefix invalidation did not clear matching keys');
  }
  if (getFromCache('other_item') !== 'val3') {
    throw new Error('Test 4 Failed: Invalidation affected unrelated keys');
  }
  console.log('✓ Test 4: Prefix cache invalidation accurately clears only target keys');

  // 5. Explicit Projection Check
  if (PROFILE_COLUMNS.includes('*') || PROJECT_COLUMNS.includes('*')) {
    throw new Error('Test 5 Failed: Column projections contain wildcard *');
  }
  if (!PROFILE_COLUMNS.includes('github_username') || !PROJECT_COLUMNS.includes('repo_full_name')) {
    throw new Error('Test 5 Failed: Missing required columns in projection string');
  }
  console.log('✓ Test 5: Explicit column projections are defined and verified');

  console.log('\nAll cache & optimization tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
