import { useEffect, useState } from 'react';

/** Live countdown to an ISO date. */
export default function Countdown({ to }) {
  const left = () => Math.max(0, new Date(to) - Date.now());
  const [ms, setMs] = useState(left);
  useEffect(() => { const t = setInterval(() => setMs(left()), 1000); return () => clearInterval(t); }, [to]);
  if (!ms) return <p className="countdown-live">The fest has begun</p>;
  const s = Math.floor(ms / 1000);
  const parts = [['Days', Math.floor(s / 86400)], ['Hours', Math.floor(s / 3600) % 24], ['Mins', Math.floor(s / 60) % 60], ['Secs', s % 60]];
  return (
    <div className="countdown" role="timer" aria-label="Time until the fest starts">
      {parts.map(([label, v]) => <div key={label}><b>{String(v).padStart(2, '0')}</b><span>{label}</span></div>)}
    </div>
  );
}
