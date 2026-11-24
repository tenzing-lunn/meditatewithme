// The account, native: the site's corner (`AccountCorner.tsx`) as three
// pages on the phone — Account, Settings, Layout — in the site's words. It
// reads and writes through `account.ts`, which holds the session and syncs
// the account; the guide's server and key come from the site's own route
// with the session's token.
//
// Not here yet: connecting a second email address (the site's `Emails`),
// and Copy buttons — the server and key are selectable instead (press and
// hold), since a clipboard needs a native module and a new build.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { localTime } from '../lib/format';
import { NAME_MAX, ORIGIN_MAX, cleanText, composeLabel } from '../lib/label';
import { humanMinutes, recentDays, summarise, type PracticeEntry } from '../lib/practice';
import { SERVICE_UNREACHABLE } from '../lib/authErrors';
import { siteApi, type Account } from './account';
import Picker from './Picker';
import { HOURS, allowNotes, bellLabel, remindHour, setReminder } from './remind';
import { Back, Button, EMBER, EMBER_SOFT, INK, INK2, INK3, PAPER, RULE, SERIF, SURFACE, Word, type } from './ui';

type Page = 'account' | 'settings' | 'layout';
const PAGES: { page: Page; label: string }[] = [
  { page: 'account', label: 'Account' },
  { page: 'settings', label: 'Settings' },
  { page: 'layout', label: 'Layout' },
];

export default function AccountScreen({ account, onClose }: { account: Account; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState<Page>('account');
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: PAPER }]}>
      <View style={[s.head, { paddingTop: insets.top + 8 }]}>
        <Back onPress={onClose} />
        <View style={s.tabs}>
          {PAGES.map((p) => (
            <Pressable key={p.page} onPress={() => setPage(p.page)} hitSlop={8} accessibilityRole="tab" accessibilityState={{ selected: page === p.page }}>
              <Text style={[type.control, { color: page === p.page ? INK : INK3, textDecorationLine: page === p.page ? 'underline' : 'none' }]}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 48 }} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
        {page === 'account' && <AccountPage account={account} />}
        {page === 'settings' && <SettingsPage account={account} />}
        {page === 'layout' && (
          <Text style={[type.body, { marginTop: 24 }]}>
            Themes are on their way. Soon you will be able to change how the whole place looks, from the water to the words.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function Heading({ children }: { children: string }) {
  return <Text style={s.heading}>{children}</Text>;
}

function Note({ children }: { children: string | null }) {
  return <Text style={[type.caption, { minHeight: 20, marginTop: 8 }]}>{children ?? ''}</Text>;
}

// ---- Account -----------------------------------------------------------------

function AccountPage({ account }: { account: Account }) {
  const [name, setName] = useState(account.name ?? '');
  const [nameNote, setNameNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteNote, setDeleteNote] = useState<string | null>(null);

  const saveName = async () => {
    setBusy(true);
    const error = await account.saveName(cleanText(name, NAME_MAX));
    setBusy(false);
    setNameNote(error ?? 'Saved.');
  };

  const remove = async () => {
    setBusy(true);
    const error = await account.deleteAccount();
    setBusy(false);
    // Gone: the session ends and the corner says Sign in again.
    if (error) setDeleteNote(error);
  };

  return (
    <View>
      <Heading>Your name</Heading>
      <View style={s.row}>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={INK3} maxLength={NAME_MAX} style={s.field} returnKeyType="done" onSubmitEditing={saveName} />
        <Button small kind="quiet" label={busy ? 'Save…' : 'Save'} onPress={saveName} disabled={busy} />
      </View>
      <Note>{nameNote}</Note>

      <Heading>Email</Heading>
      <Text style={type.body} selectable>{account.user?.email ?? ''}</Text>

      <Heading>Your practice</Heading>
      <Practice entries={account.entries} />

      <Heading>Guiding</Heading>
      <Guiding />

      <View style={{ marginTop: 40, gap: 16 }}>
        <Button kind="quiet" label="Sign out" onPress={() => void account.signOut()} />
        {!deleting ? (
          <Word label="Delete account" onPress={() => setDeleting(true)} style={{ alignSelf: 'center' }} />
        ) : (
          <View style={s.card}>
            <Text style={[type.control, { color: INK, lineHeight: 22 }]}>
              This removes your account and everything it holds: your email address, your name, where you are from, your settings, and the sittings synced to it. It cannot be undone.
            </Text>
            <Text style={[type.caption, { marginTop: 8 }]}>Your practice log stays on this device. Closing the account only removes the copy we hold.</Text>
            <View style={[s.row, { marginTop: 16 }]}>
              <Button small label="Keep it" onPress={() => setDeleting(false)} disabled={busy} style={{ flex: 1 }} />
              <Button small kind="quiet" label={busy ? 'Delete my account…' : 'Delete my account'} onPress={remove} disabled={busy} style={{ flex: 1 }} />
            </View>
            <Note>{deleteNote}</Note>
          </View>
        )}
      </View>
    </View>
  );
}

/** The site's `Practice` and `RecentSittings`: the streak, the totals, thirteen weeks, the last eight. */
function Practice({ entries }: { entries: PracticeEntry[] }) {
  const now = Date.now();
  if (!entries.length) return <Text style={type.body}>Your first sitting will show up here.</Text>;
  const sum = summarise(entries, now);
  const days = recentDays(entries, now, 91);
  const weeks = Array.from({ length: 13 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return (
    <View>
      <Text style={[type.body, { color: INK }]}>
        {sum.currentStreak > 0 ? `${sum.currentStreak} day${sum.currentStreak === 1 ? '' : 's'} in a row` : 'Begin again whenever you like'}
      </Text>
      <Text style={type.caption}>
        {sum.sittings} sitting{sum.sittings === 1 ? '' : 's'} · {humanMinutes(sum.totalMinutes)}
      </Text>
      <View style={[s.row, { gap: 3, marginTop: 16 }]}>
        {weeks.map((week, i) => (
          <View key={i} style={{ gap: 3 }}>
            {week.map((d) => (
              <View key={d.key} style={[s.cell, { backgroundColor: d.minutes ? EMBER : RULE, opacity: intensity(d.minutes) }]} />
            ))}
          </View>
        ))}
      </View>
      <View style={{ marginTop: 20, gap: 6 }}>
        {entries.slice(0, 8).map((e) => (
          <Text key={e.id} style={type.caption}>
            {dayLabel(e.startedAt)} · {localTime(e.startedAt)} — {humanMinutes(e.minutes)}{e.completed ? '' : ' · ended early'}
          </Text>
        ))}
      </View>
    </View>
  );
}

function intensity(minutes: number): number {
  if (minutes === 0) return 0.55;
  if (minutes < 15) return 0.45;
  if (minutes < 30) return 0.7;
  return 1;
}

function dayLabel(atMs: number): string {
  const d = new Date(atMs);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', ...(d.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }) });
}

// ---- Guiding: the site's `Streaming` ----------------------------------------------

type Stream =
  | { ok: true; approved: false; application: 'pending' | 'declined' | null }
  | { ok: true; approved: true; name: string; showName: boolean; server: string; streamKey: string; url: string };

function Guiding() {
  const [stream, setStream] = useState<Stream | null | 'failed'>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [reveal, setReveal] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    void siteApi<Stream>('account/stream', 'GET').then((r) => setStream(r?.body.ok ? r.body : 'failed'));
  }, []);

  if (stream === null) return <ActivityIndicator color={INK3} style={{ alignSelf: 'flex-start' }} />;
  if (stream === 'failed') return <Text style={type.body}>{SERVICE_UNREACHABLE}</Text>;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await work();
    } finally {
      setBusy(false);
    }
  };

  if (!stream.approved) {
    if (stream.application === 'pending') {
      return <Text style={type.body}>Your request to guide is with us. If it is accepted you will get an email, and your server and key will appear here.</Text>;
    }
    const send = () => run(async () => {
      const r = await siteApi<{ ok?: boolean; reason?: string }>('account/stream', 'PUT', { name, about });
      if (r?.body.ok) setStream({ ok: true, approved: false, application: 'pending' });
      else setNote(r?.body.reason === 'empty' ? 'Both are needed.' : SERVICE_UNREACHABLE);
    });
    return (
      <View>
        <Text style={type.body}>
          {stream.application === 'declined'
            ? 'Your last request to guide was not taken up this time. You are welcome to ask again.'
            : 'Lead sittings on camera, for everyone who chooses to sit with a guide.'}
        </Text>
        {!open ? (
          <Button small kind="quiet" label="Ask to guide" onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
        ) : (
          <View style={{ marginTop: 12, gap: 12 }}>
            <Text style={type.caption}>The name viewers would know you by</Text>
            <TextInput value={name} onChangeText={setName} maxLength={60} style={s.field} />
            <Text style={type.caption}>Your practice, and how you would stream</Text>
            <TextInput value={about} onChangeText={setAbout} maxLength={1000} multiline style={[s.field, { minHeight: 120, textAlignVertical: 'top' }]} />
            <View style={s.row}>
              <Button small label={busy ? 'Send…' : 'Send'} onPress={send} disabled={busy} />
              <Word label="Cancel" onPress={() => setOpen(false)} disabled={busy} />
            </View>
            <Note>{note}</Note>
          </View>
        )}
      </View>
    );
  }

  const masked = `${stream.streamKey.split('?')[0]}?key=${'•'.repeat(12)}`;
  const toggleName = (next: boolean) => run(async () => {
    const r = await siteApi<{ ok?: boolean }>('account/stream', 'PATCH', { showName: next });
    if (!r?.body.ok) return setNote(SERVICE_UNREACHABLE);
    setStream({ ...stream, showName: next });
    setNote(next ? `Viewers will see “${stream.name} is guiding.”` : 'Viewers will not see your name.');
  });
  const renew = () => run(async () => {
    const r = await siteApi<{ ok?: boolean; server?: string; streamKey?: string; url?: string }>('account/stream', 'POST');
    if (!r?.body.ok || !r.body.server || !r.body.streamKey || !r.body.url) return setNote(SERVICE_UNREACHABLE);
    setStream({ ...stream, server: r.body.server, streamKey: r.body.streamKey, url: r.body.url });
    setRenewing(false);
    setReveal(true);
    setNote('This is your new key. Put it in your streaming app; the old one no longer works.');
  });

  return (
    <View style={{ gap: 14 }}>
      <Text style={type.body}>You can guide. Point your streaming app here, and you are on the water for everyone sitting with a guide.</Text>
      <Field label="Server" value={stream.server} />
      <Field label="Stream key" value={reveal ? stream.streamKey : masked} action={<Word label={reveal ? 'Hide' : 'Show'} onPress={() => setReveal(!reveal)} />} />
      <Field label="Moblin, or any app that takes one address" value={reveal ? stream.url : `${stream.server}/${masked}`} />
      <Text style={type.caption}>Press and hold to copy.</Text>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text style={[type.body, { color: INK, flex: 1 }]}>Show my name to viewers</Text>
        <Switch value={stream.showName} onValueChange={toggleName} disabled={busy} trackColor={{ true: EMBER, false: EMBER_SOFT }} />
      </View>
      {!renewing ? (
        <Word label="Make a new key" onPress={() => { setNote(null); setRenewing(true); }} disabled={busy} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <View style={s.card}>
          <Text style={[type.control, { color: INK, lineHeight: 22 }]}>
            Your old key stops working the next time you connect, so do this only if it got out. A stream already running carries on.
          </Text>
          <View style={[s.row, { marginTop: 16 }]}>
            <Button small label="Keep it" onPress={() => setRenewing(false)} disabled={busy} style={{ flex: 1 }} />
            <Button small kind="quiet" label={busy ? 'Make a new key…' : 'Make a new key'} onPress={renew} disabled={busy} style={{ flex: 1 }} />
          </View>
        </View>
      )}
      <Note>{note}</Note>
    </View>
  );
}

function Field({ label, value, action }: { label: string; value: string; action?: React.ReactNode }) {
  return (
    <View>
      <Text style={[type.caption, { marginBottom: 6 }]}>{label}</Text>
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <Text selectable style={[s.mono, { flex: 1 }]}>{value}</Text>
        {action}
      </View>
    </View>
  );
}

// ---- Settings ----------------------------------------------------------------

function SettingsPage({ account }: { account: Account }) {
  const [origin, setOrigin] = useState(account.profile.origin ?? '');
  const [share, setShare] = useState(account.profile.share === true);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hour, setHour] = useState(remindHour());
  const [choosing, setChoosing] = useState(false);
  const [remindNote, setRemindNote] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    const error = await account.saveProfile({ origin: cleanText(origin, ORIGIN_MAX), share });
    setBusy(false);
    setNote(error ?? 'Saved.');
  };

  const choose = async () => {
    if (!(await allowNotes())) {
      await setReminder('denied');
      return setRemindNote('The phone is not letting us. Allow notifications for Meditate With Me in Settings, then try again.');
    }
    setChoosing(true);
  };

  const shown = composeLabel(account.name, cleanText(origin, ORIGIN_MAX)) ?? 'you';
  return (
    <View>
      <Heading>Privacy</Heading>
      <Text style={[type.caption, { marginBottom: 6 }]}>Where you are from</Text>
      <TextInput value={origin} onChangeText={setOrigin} placeholder="Lisbon, Portugal" placeholderTextColor={INK3} maxLength={ORIGIN_MAX} style={s.field} />
      <View style={[s.row, { justifyContent: 'space-between', marginTop: 16 }]}>
        <Text style={[type.body, { color: INK, flex: 1 }]}>
          Let others see <Text style={{ fontStyle: 'italic' }}>{shown}</Text> while you sit with them
        </Text>
        <Switch value={share} onValueChange={setShare} trackColor={{ true: EMBER, false: EMBER_SOFT }} />
      </View>
      <Text style={[type.caption, { marginTop: 4 }]}>Off, and nobody sees your name or where you are from.</Text>
      <Button small label={busy ? 'Save…' : 'Save'} onPress={save} disabled={busy} style={{ alignSelf: 'flex-start', marginTop: 16 }} />
      <Note>{note}</Note>

      <Heading>Before the bell</Heading>
      <Text style={type.body}>
        {hour === null ? 'No note. The bell rings at five to every hour, for everyone who sits until it.' : `A note ten minutes before the bell at ${bellLabel(hour)}, every day.`}
      </Text>
      <View style={[s.row, { marginTop: 12 }]}>
        <Button small kind="quiet" label={hour === null ? 'Remind me' : 'Change the hour'} onPress={() => void choose()} />
        {hour !== null && (
          <Word label="No note" onPress={() => void setReminder('no').then(() => setHour(null))} />
        )}
      </View>
      <Note>{remindNote}</Note>

      {choosing && (
        <Picker
          title="Which bell?"
          value={String(hour ?? 7)}
          options={HOURS}
          onConfirm={(v) => {
            setChoosing(false);
            void setReminder(Number(v)).then(() => setHour(Number(v)));
          }}
          onCancel={() => setChoosing(false)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', gap: 20, paddingRight: 8 },
  heading: { fontFamily: SERIF, fontSize: 20, lineHeight: 26, color: INK, marginTop: 32, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { flex: 1, minHeight: 44, borderBottomWidth: 2, borderBottomColor: RULE, fontSize: 17, color: INK, paddingVertical: 8 },
  card: { borderWidth: 1, borderColor: RULE, borderRadius: 16, backgroundColor: SURFACE, padding: 16 },
  cell: { width: 12, height: 12, borderRadius: 2 },
  mono: { fontSize: 14, lineHeight: 20, color: INK2 },
});
