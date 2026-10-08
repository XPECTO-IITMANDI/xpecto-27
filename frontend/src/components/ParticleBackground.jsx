import { useEffect, useRef } from 'react';

/**
 * Canvas particles. fire=false: slow drifting embers (page bg, capped at 30fps). fire=true: dense rising flames (intro, 60fps).
 * Pauses when the tab is hidden; motion is scaled by frame time so the cap doesn't slow it down.
 */
export default function ParticleBackground({ count = 50, fire = false, className = '', fps = fire ? 60 : 30 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let w, h, raf, last = 0;
    const k = 1000 / fps / 16.67; // per-frame speed multiplier
    const resize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    resize(); window.addEventListener('resize', resize);
    const palette = [48, 190, 330]; // yellow, cyan, magenta hues
    const make = init => ({
      x: fire ? w * (0.15 + Math.random() * 0.7) : Math.random() * w,
      y: fire ? h * (0.55 + Math.random() * 0.4) : init ? Math.random() * h : h + 10,
      r: Math.random() * (fire ? 7 : 2.5) + 1, vy: -(Math.random() * (fire ? 1.8 : 0.7) + 0.3),
      vx: (Math.random() - 0.5) * 0.6, life: fire ? 0.4 + Math.random() * 0.6 : 1,
      hue: fire ? 40 + Math.random() * 16 : palette[Math.floor(Math.random() * 3)],
    });
    const ps = Array.from({ length: count }, () => make(true));
    const tick = t => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || t - last < 1000 / fps - 2) return;
      last = t;
      ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
      ps.forEach((p, i) => {
        p.x += (p.vx + Math.sin(p.y / 25) * 0.4) * k; p.y += p.vy * k; p.life -= (fire ? 0.012 : 0.0015) * k; if (fire) p.r *= 0.992;
        if (p.life <= 0 || p.y < -10) { ps[i] = make(false); return; }
        ctx.fillStyle = `hsla(${p.hue},100%,${fire ? 55 : 60}%,${Math.min(p.life, 1) * (fire ? 0.5 : 0.8)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      });
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [count, fire, fps]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
