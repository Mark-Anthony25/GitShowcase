/** Normalize a public contact destination; never render arbitrary URL schemes. */
export function normalizeContactLink(value: string | null | undefined): string | null {
  const input = value?.trim();
  if (!input) return null;
  const invalid = () => new Error('Enter a valid web link or email address.');
  if (/[\s\u0000-\u001f\u007f]/.test(input)) throw invalid();
  const isMailto = /^mailto:/i.test(input);
  const email = isMailto ? new URL(input).pathname : input;
  if (/^[^@<>:?#/\\]+@[^@<>:?#/\\]+\.[^@<>:?#/\\]+$/.test(email)) return isMailto ? new URL(input).href : `mailto:${email}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) throw invalid();
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password || url.hostname.startsWith('.') || url.hostname.endsWith('.')) throw invalid();
    return url.href;
  } catch { throw invalid(); }
}
