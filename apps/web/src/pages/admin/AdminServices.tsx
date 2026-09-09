import { useEffect, useState } from 'react';
import { listServicesAdmin, createService, setServiceActive, type AdminServiceRow } from '../../api/serviceCatalogue';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';
import './AdminServices.css';

const FUNDING_OPTIONS = ['NDIS', 'Aged Care', 'Private', 'DVA'];
const ROLE_OPTIONS: ('provider' | 'worker')[] = ['provider', 'worker'];

export default function AdminServices() {
  const [items, setItems] = useState<AdminServiceRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [funding, setFunding] = useState<string[]>([]);
  const [roles, setRoles] = useState<('provider' | 'worker')[]>([]);

  const showToast = useToast();

  function load() {
    setLoading(true);
    listServicesAdmin(activeFilter === 'all' ? {} : { active: activeFilter === 'active' })
      .then((res) => setItems(res.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load services.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [activeFilter]);

  function toggleInArray<T>(list: T[], value: T, setList: (v: T[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createService({ name: name.trim(), category: category.trim(), description, applicableFunding: funding, applicableRoles: roles });
      showToast(`${name} added to the catalogue.`);
      setName(''); setCategory(''); setDescription(''); setFunding([]); setRoles([]);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this service.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: AdminServiceRow) {
    setUpdatingId(row.id);
    try {
      await setServiceActive(row.id, !row.active);
      setItems((prev) => prev.map((s) => (s.id === row.id ? { ...s, active: !s.active } : s)));
      showToast(row.active ? `${row.name} deactivated.` : `${row.name} activated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this service.');
    } finally {
      setUpdatingId(null);
    }
  }

  const grouped = items.reduce<Record<string, AdminServiceRow[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Services</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="admin-providers-filter">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button key={s} className={`admin-filter-pill ${activeFilter === s ? 'admin-filter-pill-active' : ''}`} onClick={() => setActiveFilter(s)}>
                {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
          <button className="mp-add-btn" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Add service'}</button>
        </div>
      </div>

      {showForm && (
        <form className="svc-form" onSubmit={handleCreate}>
          <div className="svc-form-grid">
            <div className="svc-field">
              <label>Service name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Community access" required />
            </div>
            <div className="svc-field">
              <label>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Community" required />
            </div>
            <div className="svc-field svc-field-full">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="svc-field">
              <label>Applicable funding</label>
              <div className="svc-chip-row">
                {FUNDING_OPTIONS.map((f) => (
                  <button key={f} type="button" className={`svc-chip ${funding.includes(f) ? 'svc-chip-selected' : ''}`} onClick={() => toggleInArray(funding, f, setFunding)}>{f}</button>
                ))}
              </div>
            </div>
            <div className="svc-field">
              <label>Who can offer this</label>
              <div className="svc-chip-row">
                {ROLE_OPTIONS.map((r) => (
                  <button key={r} type="button" className={`svc-chip ${roles.includes(r) ? 'svc-chip-selected' : ''}`} style={{ textTransform: 'capitalize' }} onClick={() => toggleInArray(roles, r, setRoles)}>{r}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <p style={{ color: '#B4232F', fontSize: 13.5 }}>{error}</p>}
          <button className="mp-add-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add service'}</button>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="admin-providers-empty">No services in the catalogue yet.</p>
      ) : (
        Object.entries(grouped).map(([cat, services]) => (
          <div key={cat} className="svc-category-block">
            <h2 className="svc-category-title">{cat}</h2>
            <div className="admin-providers-table">
              <div className="admin-providers-row admin-providers-row-head" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr' }}>
                <span>Name</span><span>Funding</span><span>Roles</span><span></span>
              </div>
              {services.map((s) => (
                <div key={s.id} className="admin-providers-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr' }}>
                  <span>{s.name}<span className="admin-providers-abn">{s.description}</span></span>
                  <span>{s.applicableFunding.join(', ') || '—'}</span>
                  <span style={{ textTransform: 'capitalize' }}>{s.applicableRoles.join(', ') || '—'}</span>
                  <span>
                    <button
                      className={`admin-toggle-btn ${s.active ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
                      disabled={updatingId === s.id}
                      onClick={() => toggleActive(s)}
                    >
                      {updatingId === s.id ? 'Saving…' : s.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
