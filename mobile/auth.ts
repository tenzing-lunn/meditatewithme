// Signing in, natively: the same three ways as the site's panel — Apple,
// Google, or a six-digit code by email — and the same rules underneath
// (`components/useAuth.ts`): no passwords, Gmail goes through Google, a
// connected address is asked of the site first so Supabase does not make it
// a second account. Every function returns an error string in the site's
// own words, or null; success shows up through `onAuthStateChange`.
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { GMAIL_USES_GOOGLE, SERVICE_UNREACHABLE, authErrorMessage, emailReasonMessage } from '../lib/authErrors';
import { readLinkError } from '../lib/authRedirect';
import { isGoogleMail } from '../lib/emailCode';
import { supabase } from './supabase';

export const SITE = process.env.EXPO_PUBLIC_SITE ?? 'https://www.meditatewithme.online/';

WebBrowser.maybeCompleteAuthSession();

// Addresses the site sent its own code to (connected ones, which Supabase
// does not know), so `verify` knows where to take the code.
const connected = new Set<string>();

export async function signInWithEmail(email: string, name?: string): Promise<string | null> {
  if (isGoogleMail(email)) return GMAIL_USES_GOOGLE;
  try {
    const response = await fetch(`${SITE}api/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const reply = await response.json();
    if (reply.kind === 'connected') {
      connected.add(email.trim().toLowerCase());
      return reply.ok ? null : emailReasonMessage(reply.reason);
    }
  } catch {
    // Supabase's own path below, as on the site.
  }
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // The email still carries a link as well as the code; the link lands
        // on the site, where it works as it always has.
        emailRedirectTo: SITE,
        data: name ? { name } : undefined,
      },
    });
    return error ? authErrorMessage(error.code, error.message) : null;
  } catch {
    return SERVICE_UNREACHABLE;
  }
}

export async function verifyCode(email: string, token: string): Promise<string | null> {
  try {
    if (connected.has(email.trim().toLowerCase())) {
      const response = await fetch(`${SITE}api/signin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: token }),
      });
      const reply = await response.json();
      if (!reply.ok) return emailReasonMessage(reply.reason);
      const { error } = await supabase.auth.verifyOtp({ token_hash: reply.tokenHash, type: 'magiclink' });
      return error ? authErrorMessage(error.code, error.message) : null;
    }
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    return error ? authErrorMessage(error.code, error.message) : null;
  } catch {
    return SERVICE_UNREACHABLE;
  }
}

/**
 * Google, or Apple when the native sheet is not usable: Supabase's own
 * OAuth round trip in the system's auth sheet (never an embedded web view,
 * which Google refuses), coming back on a deep link with the tokens in its
 * fragment, the implicit flow as on the site.
 *
 * Needs the deep link in the Supabase dashboard's redirect allow list:
 * `meditatewithme://**` for a build, and the `exp://` form while in Expo Go.
 */
async function signInInBrowser(provider: 'google' | 'apple'): Promise<string | null> {
  const name = provider === 'google' ? 'Google' : 'Apple';
  const redirectTo = Linking.createURL('auth');
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return `Could not start ${name} sign-in. Try again, or use an email code.`;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return null; // Closed the sheet. Nothing to say.
    return await sessionFromUrl(result.url, name);
  } catch {
    return SERVICE_UNREACHABLE;
  }
}

async function sessionFromUrl(url: string, name: string): Promise<string | null> {
  const hash = url.split('#')[1] ?? '';
  const params = new URLSearchParams(hash);
  // The site's sentence, never the provider's own text (`lib/authRedirect.ts`).
  const failed = readLinkError(hash, url.split('#')[0]?.split('?')[1] ?? '');
  if (failed) return failed;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return `${name} did not sign you in. Try again, or use an email code.`;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  return error ? authErrorMessage(error.code, error.message) : null;
}

export const signInWithGoogle = () => signInInBrowser('google');

/**
 * Apple's own sheet, with the identity token handed to Supabase directly.
 * Apple is given the SHA-256 of the nonce and Supabase the nonce itself.
 *
 * Needs the app's bundle ID (`online.meditatewithme.app`) in the Apple
 * provider's Client IDs in the Supabase dashboard; without it, or in Expo
 * Go (whose bundle ID is Expo's), Supabase rejects the token's audience
 * and this falls back to the browser round trip, which uses the web
 * Services ID that is already set up.
 */
export async function signInWithApple(): Promise<string | null> {
  if (!(await AppleAuthentication.isAvailableAsync())) return signInInBrowser('apple');
  const nonce = Crypto.randomUUID();
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce),
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    return signInInBrowser('apple');
  }
  if (!credential.identityToken) return signInInBrowser('apple');
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  if (error) return signInInBrowser('apple');
  // Apple gives the name once, on the first sign-in, and never again.
  const given = credential.fullName?.givenName?.trim();
  if (given && typeof data.user?.user_metadata?.name !== 'string') {
    await supabase.auth.updateUser({ data: { name: given } });
  }
  return null;
}

/**
 * Whether the account was ever asked where it sits: the site asks once, and
 * a skip is an answer (`share_label` false). Null when it cannot be told.
 */
export async function originAsked(userId: string): Promise<boolean | null> {
  // Null when the profile cannot be read: the caller treats that as asked,
  // so a Skip can never write over a place it could not see. The site asks
  // again at Begin if it was not (`screensFor`).
  const { data, error } = await supabase.from('profiles').select('share_label').eq('id', userId).maybeSingle();
  if (error) return null;
  return (data as { share_label: boolean | null } | null)?.share_label != null;
}

/** Where they sit and whether others may see it, to the account. */
export async function saveOrigin(userId: string, origin: string | null, share: boolean): Promise<string | null> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, origin, share_label: share });
  return error ? 'That could not be saved just now. You can set it later in Settings.' : null;
}
