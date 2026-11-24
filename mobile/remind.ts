// The note before the bell: once a day, at the hour the person chose, ten
// minutes before that hour's shared bell at :55. Ten, not five: the site's
// `nextSharedBellAt` sends anyone with under five minutes' lead to the bell
// after, so a note at :50 opened a few seconds late would point at a bell
// already out of reach.
//
// The answer is kept under `REMIND_KEY`: the hour as a number, or `no`, or
// `denied` when the phone refused. The phone keeps the schedule itself; it is
// laid again at every start, so a reinstall or a cleared schedule comes back.
import * as Notifications from 'expo-notifications';
import { localTime } from '../lib/format';
import { SHARED_BELL_OFFSET_MS } from '../lib/timer';

export const REMIND_KEY = 'mwm.app.remind';

const NOTE_MINUTE = SHARED_BELL_OFFSET_MS / 60_000 - 10;

/** The hour chosen, or null for no reminder. */
export function remindHour(): number | null {
  const raw = localStorage.getItem(REMIND_KEY);
  if (raw === null || !/^\d{1,2}$/.test(raw)) return null;
  const hour = Number(raw);
  return hour < 24 ? hour : null;
}

/** Whether the question has been answered at all, either way. */
export function remindAsked(): boolean {
  return localStorage.getItem(REMIND_KEY) !== null;
}

/** That hour's bell in the phone's own time: `7:55 AM`, or `07:55`. */
export function bellLabel(hour: number): string {
  const at = new Date();
  at.setHours(hour, 0, 0, 0);
  return localTime(at.getTime() + SHARED_BELL_OFFSET_MS);
}

/** Every hour of the day, by its bell. */
export const HOURS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: bellLabel(h) }));

/** Asks the phone if it has not been asked; true when notes may be shown. */
export async function allowNotes(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/** Keep the answer and lay the schedule to match it. */
export async function setReminder(answer: number | 'no' | 'denied'): Promise<void> {
  localStorage.setItem(REMIND_KEY, String(answer));
  await lay();
}

/** The phone's schedule made to match the answer: one daily note, or none. */
export async function lay(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const hour = remindHour();
  if (hour === null) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `The bell at ${bellLabel(hour)}`,
      body: 'Ten minutes. Sit until the bell, with everyone who does.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: NOTE_MINUTE },
  });
}
