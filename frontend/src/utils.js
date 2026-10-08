export const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';
export const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '';
export const fmtMoney = n => '₹' + Number(n || 0).toLocaleString('en-IN');
export const dayMon = iso => iso ? { d: new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }), m: new Date(iso).toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }).toUpperCase() } : { d: '--', m: '' };
