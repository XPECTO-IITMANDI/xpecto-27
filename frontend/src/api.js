// The ONLY file that touches the network. Mock mode returns in-memory data from src/mock/*.json.
import axios from 'axios';
import fest from './mock/fest.json';
import events from './mock/events.json';
import workshops from './mock/workshops.json';
import team from './mock/team.json';
import sponsors from './mock/sponsors.json';
import mess from './mock/mess.json';
import payment from './mock/payment.json';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const http = axios.create({ baseURL: import.meta.env.VITE_API_URL, withCredentials: true });

/** Normalise every failure to { status, code, message } (contract error shape). */
class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const fail = (status, code, message) => Promise.reject(new ApiError(status, code, message));
// Server returns relative asset URLs ("/static/uploads/a.jpg"). Make them absolute for display, strip them again when sending.
const ASSET_KEYS = ['imageUrl', 'photoUrl', 'logoUrl', 'qrImageUrl', 'heroImageUrl', 'screenshotUrl', 'confirmationQrUrl', 'url'];
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const mapAssets = (v, fn) => Array.isArray(v) ? v.map(x => mapAssets(x, fn)) : v && typeof v === 'object'
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ASSET_KEYS.includes(k) && typeof x === 'string' ? fn(x) : mapAssets(x, fn)])) : v;
http.interceptors.request.use(c => { if (c.data && c.data.constructor === Object) c.data = mapAssets(c.data, u => u.startsWith(BASE + '/') ? u.slice(BASE.length) : u); return c; });
http.interceptors.response.use(r => mapAssets(r.data, u => u.startsWith('/') ? BASE + u : u), e => {
  const err = e.response?.data?.error;
  return Promise.reject(new ApiError(e.response?.status || 0, err?.code || 'SERVER', err?.message || 'Network error'));
});

// ---------- mock state (resets on reload; session user persists in localStorage) ----------
const db = {
  fest: { ...fest }, events: [...events], workshops: [...workshops], team: [...team],
  sponsors: [...sponsors], mess: [...mess], payment: { ...payment },
  regs: [], messRegs: [], users: [],
  admins: ['b25347@students.iitmandi.ac.in'],
};
const delay = v => new Promise(r => setTimeout(() => r(structuredClone(v)), 250));
const getUser = () => JSON.parse(localStorage.getItem('mockUser') || 'null');
const needUser = () => getUser() || fail(401, 'UNAUTHENTICATED', 'Please log in.');
const needAdmin = () => { const u = getUser(); return !u ? fail(401, 'UNAUTHENTICATED', 'Please log in.') : u.role !== 'admin' ? fail(403, 'FORBIDDEN', 'Admins only.') : null; };
const withRole = u => ({ ...u, role: db.admins.includes(u.email) ? 'admin' : 'user' });
let nextId = 100;

function mockRegister(list, body, extra) {
  if ([...db.regs, ...db.messRegs].some(r => r.transactionId === body.transactionId))
    return fail(409, 'DUPLICATE_TRANSACTION', 'This transaction ID is already used.');
  if (body.transactionId === 'DUPLICATE123') return fail(409, 'DUPLICATE_TRANSACTION', 'This transaction ID is already used.');
  const row = { id: nextId++, transactionId: body.transactionId, screenshotUrl: '', status: 'pending', createdAt: new Date().toISOString(), ...extra };
  list.push(row);
  return delay(row);
}

/** Build CRUD helpers for an admin collection (events, workshops, team, sponsors). */
const crud = (path, key) => ({
  create: b => USE_MOCK ? (needAdmin() || delay((db[key].push({ ...b, id: nextId++ }), db[key].at(-1)))) : http.post(`/api/admin/${path}`, b),
  update: (id, b) => USE_MOCK ? (needAdmin() || delay((db[key] = db[key].map(x => x.id === id ? { ...x, ...b, id } : x), b))) : http.put(`/api/admin/${path}/${id}`, b),
  remove: id => USE_MOCK ? (needAdmin() || delay((db[key] = db[key].filter(x => x.id !== id), { ok: true }))) : http.delete(`/api/admin/${path}/${id}`),
});

const pick = (mockVal, real) => USE_MOCK ? delay(mockVal()) : real();

const api = {
  // Auth
  signup: b => USE_MOCK
    ? (db.users.some(u => u.email === b.email) ? fail(422, 'VALIDATION', 'Email already registered.')
      : (() => { const u = withRole({ id: nextId++, ...b }); delete u.password; db.users.push(u); localStorage.setItem('mockUser', JSON.stringify(u)); return delay(u); })())
    : http.post('/api/auth/signup', b),
  login: b => USE_MOCK
    ? (() => { const u = withRole({ id: nextId++, name: b.email.split('@')[0], email: b.email, phone: '', college: 'IIT Mandi', ...db.users.find(x => x.email === b.email) });
        localStorage.setItem('mockUser', JSON.stringify(u)); return delay(u); })()
    : http.post('/api/auth/login', b),
  logout: () => USE_MOCK ? (localStorage.removeItem('mockUser'), delay({ ok: true })) : http.post('/api/auth/logout'),
  me: () => USE_MOCK ? (getUser() ? delay(getUser()) : fail(401, 'UNAUTHENTICATED', 'Not logged in.')) : http.get('/api/auth/me'),

  // Public reads
  getFest: () => pick(() => db.fest, () => http.get('/api/fest')),
  getEvents: () => pick(() => db.events, () => http.get('/api/events')),
  getEvent: id => USE_MOCK ? (db.events.find(e => String(e.id) === String(id)) ? delay(db.events.find(e => String(e.id) === String(id))) : fail(404, 'NOT_FOUND', 'Event not found.')) : http.get(`/api/events/${id}`),
  getWorkshops: () => pick(() => db.workshops, () => http.get('/api/workshops')),
  getTeam: () => pick(() => [...db.team].sort((a, b) => a.order - b.order), () => http.get('/api/team')),
  getSponsors: () => pick(() => db.sponsors, () => http.get('/api/sponsors')),
  getMessOptions: () => pick(() => db.mess, () => http.get('/api/messoptions')),
  // NOTE: contract table says /api/paymentinfo, its prose says /api/payment-info. Confirm with backend.
  getPaymentInfo: () => pick(() => db.payment, () => http.get('/api/payment-info')),

  // Registrations. `form` is a FormData (kind, targetId, transactionId, screenshot, teamName, teamMembers)
  createRegistration: form => {
    if (!USE_MOCK) return http.post('/api/registrations', form);
    const u = needUser(); if (u.then) return u;
    const kind = form.get('kind'), targetId = Number(form.get('targetId'));
    if (db.regs.some(r => r.kind === kind && r.targetId === targetId && r.userId === u.id)) return fail(409, 'ALREADY_REGISTERED', 'You are already registered.');
    const t = (kind === 'event' ? db.events : db.workshops).find(x => x.id === targetId);
    return mockRegister(db.regs, { transactionId: form.get('transactionId') },
      { kind, targetId, userId: u.id, targetName: t?.name || t?.title, amount: t?.registrationFee ?? t?.fee ?? 0, teamName: form.get('teamName') });
  },
  myRegistrations: () => USE_MOCK ? (getUser() ? delay(db.regs.filter(r => r.userId === getUser().id)) : needUser()) : http.get('/api/registrations/me'),
  createMessRegistration: form => {
    if (!USE_MOCK) return http.post('/api/mess/registrations', form);
    const u = needUser(); if (u.then) return u;
    const opt = db.mess.find(m => m.id === form.get('messOption'));
    return mockRegister(db.messRegs, { transactionId: form.get('transactionId') },
      { messOption: opt?.id, userId: u.id, amount: opt?.price ?? 0, confirmationQrUrl: null });
  },
  myMessRegistrations: () => USE_MOCK ? (getUser() ? delay(db.messRegs.filter(r => r.userId === getUser().id)) : needUser()) : http.get('/api/mess/registrations/me'),

  // Admin
  admin: {
    updateFest: b => USE_MOCK ? (needAdmin() || delay((db.fest = b, b))) : http.put('/api/admin/fest', b),
    updatePayment: b => USE_MOCK ? (needAdmin() || delay((db.payment = b, b))) : http.put('/api/admin/payment-info', b),
    events: crud('events', 'events'), workshops: crud('workshops', 'workshops'),
    team: crud('team', 'team'), sponsors: crud('sponsors', 'sponsors'),
    updateMessOption: (id, b) => USE_MOCK ? (needAdmin() || delay((db.mess = db.mess.map(m => m.id === id ? { ...m, ...b } : m), b))) : http.put(`/api/admin/mess-options/${id}`, b),
    upload: file => { // returns { url }
      if (USE_MOCK) return needAdmin() || delay({ url: URL.createObjectURL(file) });
      const f = new FormData(); f.append('file', file); return http.post('/api/admin/uploads', f);
    },
    registrations: (params) => USE_MOCK ? (needAdmin() || delay(db.regs.map(r => ({ ...r, user: getUser() })))) : http.get('/api/admin/registrations', { params }),
    decide: (id, action, reason) => USE_MOCK
      ? (needAdmin() || delay((db.regs = db.regs.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r), { ok: true })))
      : http.post(`/api/admin/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),
    messRegistrations: params => USE_MOCK ? (needAdmin() || delay(db.messRegs.map(r => ({ ...r, user: getUser() })))) : http.get('/api/admin/mess/registrations', { params }),
    decideMess: (id, action, reason) => USE_MOCK
      ? (needAdmin() || delay((db.messRegs = db.messRegs.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected', confirmationQrUrl: action === 'approve' ? '' : null } : r), { ok: true })))
      : http.post(`/api/admin/mess/registrations/${id}/${action}`, action === 'reject' ? { reason } : undefined),
    admins: () => pick(() => db.admins, () => http.get('/api/admin/admins')),
    addAdmin: email => USE_MOCK ? (needAdmin() || delay((db.admins.push(email), { ok: true }))) : http.post('/api/admin/admins', { email }),
    removeAdmin: email => USE_MOCK ? (needAdmin() || delay((db.admins = db.admins.filter(a => a !== email), { ok: true }))) : http.delete(`/api/admin/admins/${encodeURIComponent(email)}`),
    exportCsvUrl: () => `${import.meta.env.VITE_API_URL}/api/admin/registrations/export.csv`,
  },
};
export default api;
