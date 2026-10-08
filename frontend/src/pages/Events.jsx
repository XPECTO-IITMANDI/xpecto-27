import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api';
import EventCard from '../components/EventCard';
import PaymentModal from '../components/PaymentModal';
import ErrorState from '../components/ErrorState';
import useRegisterFlow from '../hooks/useRegisterFlow';

export default function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(null);
  const [cat, setCat] = useState('All');
  const flow = useRegisterFlow();

  const load = useCallback(() => { setError(null); setEvents(null); api.getEvents().then(setEvents).catch(e => setError(e.message)); }, []);
  useEffect(load, [load]);
  const cats = useMemo(() => ['All', ...new Set((events || []).map(e => e.category))], [events]);
  const shown = (events || []).filter(e => cat === 'All' || e.category === cat);

  return (
    <section className="page">
      <h1 className="page-title page-head">Events</h1>
      {error ? <ErrorState message={error} onRetry={load} /> : !events ? (
        <div className="grid-cards" aria-busy="true">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 320 }} />)}</div>
      ) : events.length === 0 ? <p>No events yet. Check back soon.</p> : (
        <>
          <div className="chips" role="group" aria-label="Filter by category">
            {cats.map(c => <button key={c} className={`chip ${c === cat ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <div className="grid-cards fgrid">{shown.map(e => <EventCard key={e.id} event={e} onRegister={ev => flow.start({ id: ev.id, name: ev.name, amount: ev.registrationFee, teamSize: ev.teamSize }, `/events/${ev.id}?register=1`)} />)}</div>
        </>
      )}
      {flow.target && <PaymentModal kind="event" target={flow.target} onClose={flow.close} />}
    </section>
  );
}
