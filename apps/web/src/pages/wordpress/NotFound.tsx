import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>Page not found</h1>
      <p style={{ color: 'var(--color-text-muted, #5A6B84)', marginBottom: 28 }}>
        We couldn't find what you were looking for.
      </p>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14 }}>
        <Link to="/" style={{ color: 'var(--color-primary, #1769E0)', fontWeight: 600 }}>Home</Link>
        <Link to="/find-providers" style={{ color: 'var(--color-primary, #1769E0)', fontWeight: 600 }}>Find providers</Link>
        <Link to="/services" style={{ color: 'var(--color-primary, #1769E0)', fontWeight: 600 }}>Browse services</Link>
        <Link to="/locations" style={{ color: 'var(--color-primary, #1769E0)', fontWeight: 600 }}>Browse locations</Link>
      </div>
    </div>
  );
}
