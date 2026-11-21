import { Link } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';

const SLOT_ORDER = ['Breakfast', 'Lunch', 'Dinner'];

export default function Qrs() {
  const { user } = useAuth();
  const mine = useAsync(() => user ? api.myQrs() : Promise.resolve([]), [user]);

  const mess = (mine.data || [])
    .filter(q => q.kind.toLowerCase() === 'mess')
    .sort((a, b) => {
      const ai = SLOT_ORDER.findIndex(s => a.label.toLowerCase().includes(s.toLowerCase()));
      const bi = SLOT_ORDER.findIndex(s => b.label.toLowerCase().includes(s.toLowerCase()));
      return ai - bi;
    });
  const events = (mine.data || []).filter(q => q.kind.toLowerCase() === 'event');

  return (
    <section className="page qrs-page">
      <h1 className="page-title page-head">My QRs</h1>

      {!user ? (
        <p className="muted">Please <Link to="/auth" state={{ from: '/qrs' }}>log in</Link> to view your assigned QRs.</p>
      ) : mine.error ? (
        <ErrorState message={mine.error.message} onRetry={mine.reload} />
      ) : !mine.data ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : (
        <>
          <h2 className="sec-title">Mess QRs</h2>
          {mess.length === 0 ? <p className="muted">No mess QRs assigned yet.</p> : (
            <div className="qr-grid">
              {mess.map(q => (
                <article className="qr-card" key={q.id}>
                  <h3>{q.label}</h3>
                  {q.qrUrl ? <img src={q.qrUrl} alt={`${q.label} QR`} className="assigned-qr" /> : <p className="muted">QR not available.</p>}
                  {q.qrUrl && <a className="btn-slash" href={q.qrUrl} download target="_blank" rel="noreferrer">Download QR</a>}
                </article>
              ))}
            </div>
          )}

          <h2 className="sec-title">Event QRs</h2>
          {events.length === 0 ? <p className="muted">No event QRs assigned yet.</p> : (
            <div className="qr-grid">
              {events.map(q => (
                <article className="qr-card" key={q.id}>
                  <h3>{q.label}</h3>
                  {q.qrUrl ? <img src={q.qrUrl} alt={`${q.label} QR`} className="assigned-qr" /> : <p className="muted">QR not available.</p>}
                  {q.qrUrl && <a className="btn-slash" href={q.qrUrl} download target="_blank" rel="noreferrer">Download QR</a>}
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
