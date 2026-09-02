import { useParams } from 'react-router-dom';
import { PublicHeader, PublicFooter } from './PublicLayout';
import './ServicePage.css';

// Route: /services/:serviceSlug/:suburb? — mirrors the design's
// programmatic pattern ("Home nursing providers in Bankstown, New
// South Wales"). Provider counts/response times below are
// placeholder — wire to GET /api/workers?service=&suburb= once the
// backend has real published listings to aggregate.
export default function ServicePage() {
  const { serviceSlug, suburb } = useParams();
  const serviceName = (serviceSlug || 'support')
    .split('-')
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <>
      <PublicHeader />

      <section className="svc-hero">
        <p className="svc-breadcrumb">
          {serviceName}
          {suburb ? ` · ${suburb}` : ''}
        </p>
        <h1 className="svc-heading">
          {serviceName} providers {suburb ? `in ${suburb}` : 'near you'}
        </h1>

        <div className="svc-stats-row">
          <div>
            <span className="svc-stat-value">—</span>
            <span className="svc-stat-label">providers cover {suburb || 'this area'}</span>
          </div>
          <div>
            <span className="svc-stat-value">—</span>
            <span className="svc-stat-label">respond to a typical request</span>
          </div>
          <div>
            <span className="svc-stat-value">—</span>
            <span className="svc-stat-label">median hours to the first response</span>
          </div>
        </div>

        <a href="/login" className="svc-cta">
          Find providers {suburb ? `in ${suburb}` : ''} →
        </a>
      </section>

      <section className="svc-list-placeholder">
        <p>
          Provider results for <strong>{serviceName}</strong> render here,
          pulled from <code>GET /api/workers?service={serviceName}&amp;suburb={suburb ?? ''}</code>.
          Reuse the worker card component from{' '}
          <code>pages/workers/WorkerDirectory.jsx</code> once this route is
          wired to real data.
        </p>
      </section>

      <PublicFooter />
    </>
  );
}
