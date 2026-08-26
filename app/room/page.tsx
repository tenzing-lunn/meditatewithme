import Room from '@/components/Room';

/**
 * The room, at /room rather than / on purpose.
 *
 * `main` auto-deploys to the live URL, so building this in place would have
 * published a half-finished room to a client-facing address. Preview
 * deployments would normally be the answer, but they cannot reach Supabase
 * until the preview environment variables are set (see §15 of
 * context/ARCHITECTURE.md).
 *
 * When the room is ready this becomes `/` and the holding page goes away.
 */
export const metadata = {
  title: 'Meditate With Me',
  robots: { index: false, follow: false },
};

export default function RoomPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Room />
    </main>
  );
}
