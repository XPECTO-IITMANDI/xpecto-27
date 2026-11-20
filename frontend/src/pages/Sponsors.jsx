import { useMemo } from 'react';
import { Link } from 'react-router';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';
import GlitchText from '../components/GlitchText';
import { compareByPreferredOrder, SPONSOR_TIER_ORDER } from '../utils';

export default function Sponsors() {
  const { data, error, reload } = useAsync(api.getSponsors, []);
  const { isAdmin } = useAuth();
  const groups = useMemo(() => {
    const grouped = new Map();
    for (const sponsor of data || []) {
      const tier = sponsor.tier.trim() || 'Uncategorized';
      if (!grouped.has(tier)) grouped.set(tier, []);
      grouped.get(tier).push(sponsor);
    }
    return [...grouped.entries()].sort(([a], [b]) => compareByPreferredOrder(SPONSOR_TIER_ORDER, a, b));
  }, [data]);

  if (error) {
    return (
      <section className="page st-page-enter">
        <ErrorState message={error.message} onRetry={reload} />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="page st-page-enter st-sponsors">
        <h1 className="st-page-title">
          <GlitchText text="SPONSORS" tag="span" />
        </h1>
        <div className="grid-cards" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 160 }} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="page st-page-enter st-sponsors">
      {isAdmin && (
        <Link
          to="/admin?tab=sponsors"
          className="edit-pencil static"
          aria-label="Edit sponsors"
        >
          ✎
        </Link>
      )}

      <div className="st-sponsor-heading">
        <h1 className="st-page-title">
          <GlitchText text="SPONSORS & PARTNERS" tag="span" />
        </h1>
      </div>

      {groups.length === 0 ? <p>No sponsors yet.</p> : groups.map(([tier, sponsors]) => (
        <section className="st-sponsor-group" key={tier}>
          <h2 className="st-sponsor-group-title">{tier}</h2>
          <div className="st-sponsor-grid">
            {sponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                className="st-sponsor-card"
                href={sponsor.websiteUrl || undefined}
                target={sponsor.websiteUrl ? '_blank' : undefined}
                rel={sponsor.websiteUrl ? 'noreferrer noopener' : undefined}
              >
                <span className="st-sponsor-card-name">{sponsor.name}</span>
                {sponsor.logoUrl && (
                  <img
                    src={sponsor.logoUrl}
                    alt={`${sponsor.name} logo`}
                    loading="lazy"
                    decoding="async"
                    className="st-sponsor-card-logo"
                  />
                )}
              </a>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
