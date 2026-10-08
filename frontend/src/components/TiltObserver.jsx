import { useEffect } from 'react';

const MAX = 8; // max tilt in degrees

/**
 * Mouse-tracking 3D tilt + glare for every `.tilt-card`, using one delegated listener (no per-card handlers).
 * Writes CSS vars --rx --ry (tilt) and --mx --my (glare position); the CSS does the rest.
 * Active only for real mice and when reduced motion is off.
 */
export default function TiltObserver() {
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let card = null, rect = null, raf = 0, x = 0, y = 0;

    const reset = () => {
      if (!card) return;
      card.classList.remove('tilting');
      ['--rx', '--ry', '--mx', '--my'].forEach(v => card.style.removeProperty(v));
      card = rect = null;
    };
    const frame = () => {
      raf = 0; if (!card) return;
      const px = Math.min(1, Math.max(0, (x - rect.left) / rect.width)), py = Math.min(1, Math.max(0, (y - rect.top) / rect.height));
      card.style.setProperty('--ry', `${((px - 0.5) * 2 * MAX).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${((0.5 - py) * 2 * MAX).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    };
    const move = e => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest?.('.tilt-card');
      if (t !== card) { reset(); if (t) { card = t; rect = t.getBoundingClientRect(); t.classList.add('tilting'); } } // rect measured once, so the tilt itself can't cause jitter
      x = e.clientX; y = e.clientY;
      if (card && !raf) raf = requestAnimationFrame(frame);
    };
    const invalidate = () => { if (card) rect = card.getBoundingClientRect(); };
    const out = e => { if (!e.relatedTarget) reset(); }; // pointer left the window

    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseout', out);
    window.addEventListener('scroll', invalidate, { passive: true });
    window.addEventListener('resize', invalidate);
    return () => {
      document.removeEventListener('pointermove', move); document.removeEventListener('mouseout', out);
      window.removeEventListener('scroll', invalidate); window.removeEventListener('resize', invalidate);
      cancelAnimationFrame(raf); reset();
    };
  }, []);
  return null;
}
