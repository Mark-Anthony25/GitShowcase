import { completeOAuthCallback, getOAuthCallbackCode } from '../authCallback';

async function runTests() {
  if (getOAuthCallbackCode('?state=kept&code=abc-123') !== 'abc-123') {
    throw new Error('Callback code was not read from the query string');
  }
  if (getOAuthCallbackCode('?state=kept') !== null) {
    throw new Error('Callback accepted a request without an OAuth code');
  }

  let exchangedCode = '';
  const success = await completeOAuthCallback('?code=one-time-code', async (code) => {
    exchangedCode = code;
    return { error: null };
  });
  if (success.status !== 'success' || exchangedCode !== 'one-time-code') {
    throw new Error('Callback did not exchange its single returned code');
  }

  const failure = await completeOAuthCallback('?code=expired-code', async () => ({
    error: { message: 'Code has expired' },
  }));
  if (failure.status !== 'exchange-failed' || !failure.message.includes('Please try again')) {
    throw new Error('Callback did not expose a retryable exchange failure');
  }
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
