/**
 * Noise, for the mallet in a struck bell (components/audio.ts).
 *
 * It used to generate the ambient beds too, as looping filtered noise; since
 * 23 September 2026 those are recordings (lib/beds.ts) and this is only the
 * strike. Pure — no React, no I/O, no Web Audio. It produces samples.
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
