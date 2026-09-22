export type OAuthCallbackResult =
  | { status: 'success' }
  | { status: 'invalid-callback'; message: string }
  | { status: 'exchange-failed'; message: string };

type ExchangeResult = {
  error: { message: string } | null;
};

export function getOAuthCallbackCode(search: string): string | null {
  return new URLSearchParams(search).get('code');
}

export async function completeOAuthCallback(
  search: string,
  exchangeCode: (code: string) => Promise<ExchangeResult>,
): Promise<OAuthCallbackResult> {
  const code = getOAuthCallbackCode(search);

  if (!code) {
    return {
      status: 'invalid-callback',
      message: 'GitHub did not return an authorization code. Please try again.',
    };
  }

  const { error } = await exchangeCode(code);
  if (error) {
    return {
      status: 'exchange-failed',
      message: 'GitHub sign-in could not be completed. Please try again.',
    };
  }

  return { status: 'success' };
}
