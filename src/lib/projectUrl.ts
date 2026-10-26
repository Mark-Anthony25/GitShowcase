/** A deployed project must have an explicit, safe web URL. */
export function normalizeProjectUrl(value: string | null | undefined): string {
  const input = value?.trim() || '';
  try {
    const url = new URL(input);
    if (!/^https?:\/\//i.test(input) || /[\s\u0000-\u001f\u007f]/.test(input) || !url.hostname || url.username || url.password) throw new Error();
    return url.href;
  } catch {
    throw new Error('Enter a valid HTTP or HTTPS deployed project URL without credentials.');
  }
}
