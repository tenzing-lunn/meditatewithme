'use client';

import type { ReactNode } from 'react';
import Screen from './Screen';
import Switch from './Switch';
import Wordmark from './Wordmark';

/**
 * The first screen a guest sees. The name, an invitation, and one button.
 *
 * When the count knows that people are here it says so, in one line; when it
 * does not, it says nothing rather than something made up. A guest who has
 * sat before sees the settings that sitting used and a switch to skip the
 * questions next time, so the rail does not ask what it already knows.
 */
export default function WelcomeScreen({
  current,
  count,
  usualLine,
  usual,
  onUsual,
  onJoin,
  menu,
}: {
  current: boolean;
  /** People here now. Null when unknown. */
  count: number | null;
  /** "10 minutes · singing bowl · in silence", once there is one to show. */
  usualLine: string | null;
  usual: boolean;
  onUsual: (next: boolean) => void;
  onJoin: () => void;
  menu?: ReactNode;
}) {
  return (
    <Screen
      current={current}
      menu={menu}
      title={<Wordmark />}
      titleClassName=""
      lede="A session begins at the top of every hour, and everyone in it sits together. Join this one, or sit on your own."
      onNext={onJoin}
      nextLabel="Join a session"
    >
      <div className="flex flex-col gap-6">
        {count !== null && count >= 2 && (
          <p className="text-[0.9375rem] font-semibold text-ember" role="status">
            {count} people are sitting right now.
          </p>
        )}
        {usualLine && (
          <div className="rounded-card border border-rule bg-surface p-5">
            <p className="text-[0.8125rem] text-ink-3">Your usual</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-ink">{usualLine}</p>
            <div className="mt-4">
              <Switch
                checked={usual}
                onChange={onUsual}
                label="Skip the questions next time"
              />
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
