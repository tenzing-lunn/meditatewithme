'use client';

/**
 * The one `<video>` every live stream plays in, made on Begin's tap.
 *
 * iOS lets a muted inline video autoplay — except in Low Power Mode, where
 * it refuses until the element has been played inside a tap. Once it has,
 * that element may play from then on. The stream arrives seconds after
 * Begin, or mid-sitting when someone goes on camera, long after any tap; so
 * Begin calls `primeLiveVideo()` inside its click, and `LiveStream` plays in
 * this same element rather than a fresh one, which would need its own tap.
 */

let shared: HTMLVideoElement | null = null;

export function liveVideo(): HTMLVideoElement {
  if (!shared) {
    shared = document.createElement('video');
    shared.muted = true;
    shared.defaultMuted = true;
    shared.playsInline = true;
    shared.autoplay = true;
    shared.disablePictureInPicture = true;
    shared.setAttribute('muted', '');
    shared.setAttribute('playsinline', '');
    shared.setAttribute('aria-hidden', 'true');
    shared.style.objectFit = 'cover';
  }
  return shared;
}

/** Call inside the tap. With no source yet it plays nothing; it only asks. */
export function primeLiveVideo() {
  liveVideo()
    .play()
    .catch(() => {
      // Nothing to play yet, or the stream's load() replaced it: both fine.
    });
}
