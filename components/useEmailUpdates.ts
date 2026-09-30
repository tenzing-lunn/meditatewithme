'use client';

import { useEffect } from 'react';
import { browserClient } from '@/lib/supabase';

const KEY = 'mwm.emailUpdates';

/**
 * Hold the sign-in screen's answer until there is an account to put it on.
 *
 * Google takes the tab away and brings it back as a fresh page, and the email
 * code signs in some moments later, so the switch cannot write to `profiles`
 * itself. Called as sign-in starts, on either path.
 */
export function askEmailUpdates(yes: boolean) {
  try {
    localStorage.setItem(KEY, yes ? '1' : '0');
  } catch {
    // Private mode: the answer is lost, and nobody is emailed by default.
  }
}

/**
 * Once signed in, write the held answer to `profiles.email_updates` and
 * forget it. A yes always lands; a no only where nothing was answered
 * before, so signing in elsewhere without ticking it unsubscribes nobody.
 */
export function useEmailUpdates(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    let held: string | null;
    try {
      held = localStorage.getItem(KEY);
    } catch {
      return;
    }
    if (held !== '1' && held !== '0') return;
    (async () => {
      try {
        const update = (await browserClient())
          .from('profiles')
          .update({ email_updates: held === '1' })
          .eq('id', userId);
        const { error } = await (held === '1' ? update : update.is('email_updates', null));
        if (error) throw error;
        localStorage.removeItem(KEY);
      } catch {
        // Kept, and tried again on the next visit.
      }
    })();
  }, [userId]);
}
