import { useEffect } from 'react';

const SEL = '.fcard, .wrow, .hl-item, .member, .sponsor-card, .reg-row, .dsec, .about-split, .manga-panel, .sec-title, .stat, .sponsor-chip';
const GROUPS = ['hl-list', 'wlist', 'grid-cards', 'timeline', 'stats', 'sponsor-grid', 'reg-list']; // siblings here get a staggered entrance

/** Fades/slides panels in as they scroll into view (IntersectionObserver; also catches content rendered later). Off for reduced motion. */
export default function RevealObserver() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const main = document.getElementById('main'); if (!main) return;
    const seen = new WeakSet();
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; el.classList.add('rv-in'); io.unobserve(el);
      if (el.dataset.stag) setTimeout(() => { el.style.transitionDelay = ''; }, 1200); // don't delay later hover/tilt transitions
    }), { rootMargin: '0px 0px -8% 0px' });
    const add = el => {
      if (seen.has(el)) return; seen.add(el); el.classList.add('rv');
      const p = el.parentElement;
      if (p && GROUPS.some(g => p.classList.contains(g))) { el.style.transitionDelay = `${Math.min([...p.children].indexOf(el), 8) * 70}ms`; el.dataset.stag = '1'; }
      io.observe(el);
    };
    const scan = root => { if (root.matches?.(SEL)) add(root); root.querySelectorAll?.(SEL).forEach(add); };
    scan(main);
    const mo = new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && scan(n))));
    mo.observe(main, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);
  return null;
}
