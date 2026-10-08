import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import { useAdminError } from './util';

export default function AdminsTab() {
  const { data, error, reload } = useAsync(api.admin.admins, []);
  const [email, setEmail] = useState('');
  const fail = useAdminError();
  const add = async e => { e.preventDefault(); try { await api.admin.addAdmin(email.trim()); toast.success('Admin added'); setEmail(''); reload(); } catch (x) { fail(x); } };
  const remove = async a => { if (!window.confirm(`Remove admin access for ${a}?`)) return; try { await api.admin.removeAdmin(a); reload(); } catch (x) { fail(x); } };
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  return (
    <div>
      <h2>Admins</h2>
      <form className="manga-panel row-inline" onSubmit={add}>
        <div className="field" style={{ flex: 1, margin: 0 }}><label htmlFor="adm">Add admin by email</label><input id="adm" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <button className="btn-slash">Add</button>
      </form>
      {!data ? <div className="skeleton" style={{ height: 80 }} /> : <ul className="reg-list">{data.map(a => <li key={a} className="manga-panel"><b>{a}</b><button className="link-btn danger" onClick={() => remove(a)}>Remove</button></li>)}</ul>}
    </div>
  );
}
