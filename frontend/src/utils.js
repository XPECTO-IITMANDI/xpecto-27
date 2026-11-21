export const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
export const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
export const fmtMoney = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const dayMon = iso => iso ? { d: new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }), m: new Date(iso).toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase() } : { d: '--', m: '' };

export const sameId = (a, b) => a != null && b != null && String(a) === String(b);
export const capitalize = s => s ? s[0].toUpperCase() + s.slice(1) : '';

export const TEAM_ROLE_ORDER = [
  'Convenor',
  'Co-Convenor',
  'Web-Dev Team',
  'Sponsorship Team',
  'Publicity Team',
  'Security Team',
  'Hospitality Team',
  'Media and Content Team',
  'Design Team',
  'Decor Team',
  'Planning and Management Team',
  'PMC Team',
  'Team Head',
  'Member',
];

export const SPONSOR_TIER_ORDER = ['Title', 'Diamond', 'Gold', 'Silver', 'Bronze', 'Partner'];

export const compareByPreferredOrder = (order, a, b) => {
  const rank = value => order.findIndex(item => item.toLowerCase() === value.toLowerCase());
  const aRank = rank(a);
  const bRank = rank(b);
  if (aRank < 0) return bRank < 0 ? a.localeCompare(b) : 1;
  if (bRank < 0) return -1;
  return aRank - bRank;
};

export const canonical = (value, options, fallback) => {
  const key = String(value ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  return options.find(o => o.toLowerCase().replace(/[\s_-]+/g, '') === key) ?? fallback;
};

export const istDayCount = (startIso, endIso) => {
  const day = iso => Date.parse(new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const n = Math.round((day(endIso) - day(startIso)) / 864e5) + 1;
  return Number.isFinite(n) ? Math.max(1, n) : 1;
};
