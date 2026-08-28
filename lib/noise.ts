/**
 * Noise generation for the ambient beds.
 *
 * Pure — no React, no I/O, no Web Audio. It produces samples; turning them
 * into a looping source is components/mix.ts's job. That split is the reason
 * the one genuinely arithmetic part of the sound engine can be unit-tested at
 * all, and a click at a loop seam is exactly the kind of defect that is obvious
 * on the twentieth repeat and inaudible on the first.
 */

export type NoiseKind = 'white' | 'pink' | 'brown';

export function fillNoise(out: Float32Array, kind: NoiseKind): void {
  if (kind === 'white') {
    for (let i = 0; i < out.length; i++) out[i] = Math.random() * 2 - 1;
    return;
  }

  if (kind === 'pink') {
    // Paul Kellet's economy filter. Pink is what most broadband natural sound
    // approximates; white on its own reads as a hiss from a machine, which is
    // the opposite of restful.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < out.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
    return;
  }

  // Brown: integrated white with a leak, so twelve seconds of it cannot wander
  // off to a DC offset. Heavier at the bottom than pink — this is the one that
  // sounds like weather rather than static.
  let last = 0;
  for (let i = 0; i < out.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02;
    out[i] = last * 3.5;
  }
}

/**
 * A noise run whose end joins back onto its start.
 *
 * Generated `fade` samples longer than needed, then that extra tail is
 * equal-power crossfaded back over the head. The wrap from the last sample to
 * the first is therefore continuous, so a looping source built from this has no
 * click in it.
 *
 * This is the failure mode §7 of the architecture calls unfixable in a
 * recording — "a loop with a click at the seam will be audible on repeat and no
 * amount of crossfading fully hides it". That is true of a recording, whose
 * ends are fixed. It is not true of noise, where the tail can be generated
 * specifically to be folded back over the head.
 */
export function buildNoiseLoop(
  length: number,
  fade: number,
  kind: NoiseKind,
): Float32Array {
  // A fade longer than the buffer would read past the end of `raw` and fill
  // the head with undefined. Reachable by shortening the loop, not by input.
  const span = Math.max(0, Math.min(fade, length));

  const raw = new Float32Array(length + span);
  fillNoise(raw, kind);

  const out = new Float32Array(length);
  out.set(raw.subarray(0, length));

  for (let i = 0; i < span; i++) {
    const t = i / span;
    // Equal power rather than linear: two uncorrelated noise signals summed
    // with linear weights dip in loudness across the crossover.
    out[i] =
      (out[i] ?? 0) * Math.sqrt(t) + (raw[length + i] ?? 0) * Math.sqrt(1 - t);
  }

  return out;
}
