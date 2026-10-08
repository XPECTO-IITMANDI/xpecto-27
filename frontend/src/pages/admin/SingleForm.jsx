import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import Fields from './FormFields';
import { setPath, useAdminError } from './util';

/** Edit one object (fest info, payment info). */
export default function SingleForm({ title, load, save, fields }) {
  const { data, error, reload } = useAsync(load, []);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const fail = useAdminError();
  useEffect(() => { if (data) setForm(structuredClone(data)); }, [data]);
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!form) return <div className="skeleton" style={{ height: 200 }} />;
  const submit = async e => { e.preventDefault(); setBusy(true); try { await save(form); toast.success('Saved'); } catch (x) { fail(x); } finally { setBusy(false); } };
  return (
    <form className="manga-panel" onSubmit={submit}>
      <h2>{title}</h2>
      <Fields fields={fields} value={form} set={(p, v) => setForm(f => setPath(f, p, v))} />
      <button className="btn-slash" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}
