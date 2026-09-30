/** Email and Google failures return to the app through the URL. */
export function readLinkError(hash: string, search: string): string | null {
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const query = new URLSearchParams(search.replace(/^\?/, ''));
  const value = (key: string) => fragment.get(key) ?? query.get(key);
  const code = value('error_code');
  if (!code && !value('error_description') && !value('error')) return null;
  if (code === 'otp_expired') {
    return 'That link had already been used, or a newer email replaced it. Each one works once — send yourself a fresh one.';
  }
  // Google consent cancellation is access_denied too; it is not an expired
  // email. Avoid displaying arbitrary provider text from the URL.
  return 'Sign-in was not completed. Try Google again, or use an email code.';
}
