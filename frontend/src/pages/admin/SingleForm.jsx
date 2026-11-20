import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import Fields from './FormFields';
import { setPath, useAdminError } from './util';

/** Edit one object (fest info, payment info). */
export default function SingleForm({ title, load, save, remove, fields, blank }) {
  const { data, error, loading, reload } = useAsync(load, []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useAdminError();
  useEffect(() => { setForm(data ? structuredClone(data) : null); }, [data]);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (loading) return <div className="skeleton" style={{ height: 200 }} />;
  const del = async () => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    try { await remove(); toast.success('Deleted'); reload(); } catch (x) { fail(x); } finally { setBusy(false); }
  };
  if (!form) return <div><p>Nothing configured yet.</p><button className="btn-slash" onClick={() => setForm(structuredClone(blank))}>+ Add {title}</button></div>;
  const submit = async e => { e.preventDefault(); setBusy(true); try { await save(form); toast.success('Saved'); } catch (x) { fail(x); } finally { setBusy(false); } };
  return (
    <form className="manga-panel" onSubmit={submit}>
      <h2>{title}</h2>
      <Fields fields={fields} value={form} set={(p, v) => setForm(f => setPath(f, p, v))} />
      <div className="row"><button className="btn-slash" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>{remove && <button type="button" className="link-btn danger" disabled={busy} onClick={del}>Delete</button>}</div>
    </form>
  );
}
