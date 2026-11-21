import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';
import ImageUpload from '../../components/ImageUpload';
import { useAdminError } from './util';

export default function QrsTab() {
  const fail = useAdminError();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: '', kind: 'mess', label: 'Breakfast', qrUrl: '' });

  const reload = async () => {
    try { setRows(await api.admin.qrs.list()); } catch (e) { fail(e); }
  };

  useEffect(() => { reload(); }, []);

  const save = async e => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.admin.qrs.create(form);
      toast.success('QR assigned');
      setForm({ email: '', kind: 'mess', label: 'Breakfast', qrUrl: '' });
      await reload();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const remove = async row => {
    if (!window.confirm(`Remove the ${row.label} QR for ${row.email}?`)) return;
    try { await api.admin.qrs.remove(row.id); toast.success('QR removed'); await reload(); } catch (e) { fail(e); }
  };

  const setKind = kind => setForm(f => ({
    ...f,
    kind,
    label: kind === 'mess' ? 'Breakfast' : '',
  }));

  return (
    <div>
      <h2>Assign QRs</h2>
      <form className="manga-panel" onSubmit={save}>
        <div className="field"><label htmlFor="qr-email">User email</label><input id="qr-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
        <div className="field"><label htmlFor="qr-kind">QR type</label><select id="qr-kind" value={form.kind} onChange={e => setKind(e.target.value)}><option value="mess">Mess</option><option value="event">Event</option></select></div>
        {form.kind === 'mess' ? (
          <div className="field"><label htmlFor="qr-label">Mess slot</label><select id="qr-label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}><option>Breakfast</option><option>Lunch</option><option>Dinner</option></select></div>
        ) : (
          <div className="field"><label htmlFor="qr-label">Event name</label><input id="qr-label" required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Event name" /></div>
        )}
        <ImageUpload id="qr-image" label="QR image" onChange={async file => {
          if (!file) { setForm(f => ({ ...f, qrUrl: '' })); return; }
          try { setBusy(true); const uploaded = await api.admin.upload(file); setForm(f => ({ ...f, qrUrl: uploaded.url })); }
          catch (e) { fail(e); } finally { setBusy(false); }
        }} />
        {form.qrUrl && <img className="upload-preview" src={form.qrUrl} alt="Assigned QR preview" />}
        <div className="row"><button className="btn-slash" disabled={busy || !form.qrUrl}>{busy ? 'Assigning…' : 'Assign QR'}</button></div>
      </form>
      <ul className="reg-list">
        {rows.map(row => (
          <li key={row.id} className="manga-panel">
            <b>{row.label}</b>
            <p className="muted">{row.email} · {row.kind}</p>
            {row.qrUrl && <img src={row.qrUrl} alt={`${row.label} QR`} className="qr small" />}
            <span><button className="link-btn danger" onClick={() => remove(row)}>Remove</button></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
