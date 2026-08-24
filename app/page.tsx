import SessionCountdown from '@/components/SessionCountdown';

/**
 * Holding page (build step 01).
 *
 * Deliberately not the room — that is step 03 and it is where the design time
 * goes. This exists so the domain is live from day one and so the session
 * engine is proven end-to-end in a real browser rather than only in tests.
 */
export default function Home() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="glow pointer-events-none absolute -top-56 left-1/2 h-[30rem] w-[46rem] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-ember-soft) 0%, transparent 68%)',
        }}
      />

      <h1 className="font-serif text-5xl leading-[0.98] tracking-tight text-balance sm:text-6xl">
        Meditate <em className="text-ember italic">With Me</em>
      </h1>

      <p className="text-ink-2 mt-5 max-w-[34ch] text-lg text-pretty">
        A new session begins at the top of every hour. Everyone worldwide sits
        in the same one.
      </p>

      <div className="mt-14">
        <SessionCountdown />
      </div>

      <footer className="text-ink-3 absolute bottom-8 font-mono text-xs tracking-[0.13em] uppercase">
        Opening soon
      </footer>
    </main>
  );
}
