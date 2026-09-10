import { useEffect, useState } from 'react';
import { listConditionsAdmin, createCondition, setConditionActive, type AdminConditionRow } from '../../api/conditionCatalogue';
import { ApiError } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import './AdminProviders.css';
import './AdminServices.css';

export default function AdminConditions() {
  const [items, setItems] = useState<AdminConditionRow[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const showToast = useToast();

  function load() {
    setLoading(true);
    listConditionsAdmin(activeFilter === 'all' ? {} : { active: activeFilter === 'active' })
      .then((res) => setItems(res.items))
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Unable to load conditions.'))
      .finally(() => setLoading(false));
  }
  useEffect(load, [activeFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createCondition({ name: name.trim(), category: category.trim() });
      showToast(`${name} added to the condition catalogue.`);
      setName(''); setCategory(''); setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add this condition.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: AdminConditionRow) {
    setUpdatingId(row.id);
    try {
      await setConditionActive(row.id, !row.active);
      setItems((prev) => prev.map((c) => (c.id === row.id ? { ...c, active: !c.active } : c)));
      showToast(row.active ? `${row.name} deactivated.` : `${row.name} activated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Could not update this condition.');
    } finally {
      setUpdatingId(null);
    }
  }

  const grouped = items.reduce<Record<string, AdminConditionRow[]>>((acc, c) => {
    (acc[c.category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="admin-providers-page">
      <div className="admin-providers-header">
        <h1 className="page-title">Conditions &amp; Support Needs</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="admin-providers-filter">
            {(['all', 'active', 'inactive'] as const).map((s) => (
              <button key={s} className={`admin-filter-pill ${activeFilter === s ? 'admin-filter-pill-active' : ''}`} onClick={() => setActiveFilter(s)}>
                {s === 'all' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
          <button className="mp-add-btn" onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ Add condition'}</button>
        </div>
      </div>

      {showForm && (
        <form className="svc-form" onSubmit={handleCreate}>
          <div className="svc-form-grid">
            <div className="svc-field">
              <label>Condition name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Low vision" required />
            </div>
            <div className="svc-field">
              <label>Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Sensory" required />
            </div>
          </div>
          {error && <p style={{ color: '#B4232F', fontSize: 13.5 }}>{error}</p>}
          <button className="mp-add-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add condition'}</button>
        </form>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="admin-providers-empty">No conditions in the catalogue yet.</p>
      ) : (
        Object.entries(grouped).map(([cat, conditions]) => (
          <div key={cat} className="svc-category-block">
            <h2 className="svc-category-title">{cat}</h2>
            <div className="admin-providers-table">
              <div className="admin-providers-row admin-providers-row-head" style={{ gridTemplateColumns: '2fr 0.8fr' }}>
                <span>Name</span><span></span>
              </div>
              {conditions.map((c) => (
                <div key={c.id} className="admin-providers-row" style={{ gridTemplateColumns: '2fr 0.8fr' }}>
                  <span>{c.name}</span>
                  <span>
                    <button
                      className={`admin-toggle-btn ${c.active ? 'admin-toggle-btn-suspend' : 'admin-toggle-btn-activate'}`}
                      disabled={updatingId === c.id}
                      onClick={() => toggleActive(c)}
                    >
                      {updatingId === c.id ? 'Saving…' : c.active ? 'Deactivate' : 'Activate'}
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
