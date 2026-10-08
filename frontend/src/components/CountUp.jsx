import { useEffect, useRef } from 'react';

/** Animated counter: counts up once when scrolled into view. Updates the DOM node directly (no re-renders). */
export default function CountUp({ to, prefix = '', suffix = '', duration = 1400 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current, fmt = n => prefix + Math.round(n).toLocaleString('en-IN') + suffix;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = t => { const p = Math.min(1, (t - t0) / duration); el.textContent = fmt(to * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, prefix, suffix, duration]);
  return <span ref={ref} />;
}
