import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Combobox, { type ComboItem } from '../ui/Combobox';
import Counter from '../Counter';
import { listActiveServices } from '../../api/serviceCatalogue';
import { useMatchModal } from '../../context/MatchModalContext';
import { motionAllowed } from '../../lib/motion3d';
import { providerCountLabel, serviceCount } from '../../lib/statsCounts';
import { categoryForService } from '../../lib/registerMeta';
import type { PublicStats } from '../../api/resources';
import './SupportFinder.css';

type GroupId = 'everyday' | 'health' | 'planning' | 'housing';

const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'everyday', label: 'Everyday support' },
  { id: 'health', label: 'Health and therapy' },
  { id: 'planning', label: 'Planning and coordination' },
  { id: 'housing', label: 'Housing' },
];

interface Support {
  /** Exact value the directory's ?service= filter and the stats endpoint use. */
  name: string;
  label?: string;
  group: GroupId;
  body: string;
  /** Extra words people search by, e.g. "OT" for therapy services. */
  keywords: string[];
  icon: ReactNode;
}

const SUPPORTS: Support[] = [
  {
    name: 'Personal care',
    group: 'everyday',
    body: 'Assistance with showering, dressing, medication and other daily personal activities.',
    keywords: ['showering', 'hygiene', 'dressing', 'medication', 'daily living', 'assistance with daily life'],
    icon: <path d="M12 20.5S4 15.5 4 9.8A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 20 9.8c0 5.7-8 10.7-8 10.7Z" />,
  },
  {
    name: 'Domestic assistance',
    group: 'everyday',
    body: 'Help with cleaning, laundry, meal preparation and other household tasks.',
    keywords: ['cleaning', 'laundry', 'meals', 'household', 'gardening', 'home help'],
    icon: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
  },
  {
    name: 'Transport',
    group: 'everyday',
    body: 'Assistance to travel to appointments, work, study and community activities.',
    keywords: ['driver', 'travel', 'appointments', 'community access', 'taxi'],
    icon: (
      <>
        <path d="M4 13l2-6h12l2 6v4H4Z" />
        <path d="M6 17v2M18 17v2" />
        <circle cx="8" cy="14" r="1" />
        <circle cx="16" cy="14" r="1" />
      </>
    ),
  },
  {
    name: 'Therapy services',
    group: 'health',
    body: 'Occupational therapy, physiotherapy, speech pathology and other allied health supports.',
    keywords: ['occupational therapy', 'ot', 'physiotherapy', 'physio', 'speech pathology', 'allied health', 'psychology', 'behaviour support', 'dietitian'],
    icon: (
      <>
        <path d="M4 4v6a5 5 0 0 0 10 0V4" />
        <path d="M2 4h4M12 4h4" />
        <path d="M9 15v2a4 4 0 0 0 8 0v-1" />
        <circle cx="18" cy="13" r="2.5" />
      </>
    ),
  },
  {
    name: 'Nursing',
    group: 'health',
    body: 'In-home clinical nursing, wound care and complex health supports.',
    keywords: ['nurse', 'wound care', 'clinical', 'continence', 'community nursing'],
    icon: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M9 6V4h6v2" />
        <path d="M12 10v6M9 13h6" />
      </>
    ),
  },
  {
    name: 'Support coordination',
    group: 'planning',
    body: 'Helps participants understand their plan, connect with providers and put supports in place.',
    keywords: ['coordinator', 'coordination', 'plan review', 'connecting', 'specialist support coordination'],
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <circle cx="5" cy="5" r="2" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="12" cy="21" r="2" />
        <path d="M6.5 6.5 10 10M17.5 6.5 14 10M12 15v4" />
      </>
    ),
  },
  {
    name: 'Plan management',
    group: 'planning',
    body: 'Manages invoices, payments and budget tracking so you can use your funding with any provider.',
    keywords: ['plan manager', 'invoices', 'budget', 'claims', 'funding', 'financial'],
    icon: (
      <>
        <path d="M6 3h9l4 4v14H6Z" />
        <path d="M14 3v5h5M9 13h7M9 17h5" />
      </>
    ),
  },
  {
    name: 'Housing (SDA & SIL)',
    label: 'Housing, SDA & SIL',
    group: 'housing',
    body: 'Specialist Disability Accommodation (SDA) and Supported Independent Living (SIL) providers.',
    keywords: ['sda', 'sil', 'accommodation', 'supported independent living', 'specialist disability accommodation', 'housing', 'home and living'],
    icon: (
      <>
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M9 21v-5h6v5M9 10h.01M15 10h.01M9 13h.01M15 13h.01" />
      </>
    ),
  },
];

/**
 * A real photograph for each support, so people can recognise the support at a glance. These are small copies of the
 * licensed banner photos (credited on the Photo credits page), saved in /images/supports/.
 */
const PHOTOS: Record<string, string> = {
  'Personal care': 'personal-care',
  'Domestic assistance': 'domestic-assistance',
  'Transport': 'transport',
  'Therapy services': 'therapy-services',
  'Nursing': 'nursing',
  'Support coordination': 'support-coordination',
  'Plan management': 'plan-management',
  'Housing (SDA & SIL)': 'housing-sda-sil',
};

const displayName = (s: Support) => s.label ?? s.name;
const haystack = (s: Support) => [s.name, s.label ?? '', ...s.keywords].join(' ').toLowerCase();

/** Every typed word has to appear somewhere in the support's name or keywords. */
function matches(text: string, hay: string): boolean {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => hay.includes(w));
}

interface Props {
  stats: PublicStats | null;
  /** Combined NDIS + Aged Care register counts per category — shown on a card only when there's no real Provider count yet, and always labelled distinctly ("listed", never "providers") so it's never read as accepting-enquiries capacity. */
  registerCounts?: Record<string, number>;
}

/**
 * Home-page "find a support" section. A search box plus the eight most
 * common supports grouped by what they help with. Search also covers any
 * extra supports in the service catalogue, so nothing is hidden just
 * because it doesn't have a tile. Provider counts only appear when the
 * stats endpoint has a real number.
 */
export default function SupportFinder({ stats, registerCounts }: Props) {
  const navigate = useNavigate();
  const { openMatchModal } = useMatchModal();
  const [group, setGroup] = useState<GroupId | 'all'>('all');
  const [query, setQuery] = useState('');
  const [catalogue, setCatalogue] = useState<string[]>([]);
  const [notFound, setNotFound] = useState(false);

  // The cards rise into place once the section is on screen. Decided once, on first render, so nothing flashes;
  // with reduced motion (or no IntersectionObserver) the cards are simply there.
  const [animate] = useState(() => motionAllowed() && typeof IntersectionObserver !== 'undefined');
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!animate || !el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, [animate]);

  useEffect(() => {
    let alive = true;
    listActiveServices().then((r) => { if (alive) setCatalogue(r.items.map((s) => s.name)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const go = (service: string) => navigate(`/find-a-provider?service=${encodeURIComponent(service)}`);

  const searchable = useMemo(() => {
    const known = new Set(SUPPORTS.map((s) => s.name.toLowerCase()));
    const extra = catalogue.filter((n) => !known.has(n.toLowerCase()));
    return [
      ...SUPPORTS.map((s) => ({ key: s.name, label: displayName(s), hay: haystack(s), hint: GROUPS.find((g) => g.id === s.group)?.label })),
      ...extra.map((n) => ({ key: n, label: n, hay: n.toLowerCase(), hint: undefined as string | undefined })),
    ];
  }, [catalogue]);

  const items: ComboItem[] = useMemo(() => {
    const text = query.trim();
    return searchable
      .filter((s) => !text || matches(text, s.hay))
      .slice(0, 8)
      .map((s) => ({ key: s.key, label: s.label, hint: s.hint }));
  }, [searchable, query]);

  function submit() {
    if (!query.trim()) { navigate('/find-a-provider'); return; }
    if (items[0]) { go(items[0].key); return; }
    setNotFound(true);
  }

  const visible = group === 'all' ? SUPPORTS : SUPPORTS.filter((s) => s.group === group);

  return (
    <section
      id="services"
      ref={sectionRef}
      className={`services-section sf${animate ? ' sf-armed' : ''}${inView ? ' sf-in' : ''}`}
    >
      <div className="sf-scenery" aria-hidden="true">
        <span className="sf-orb sf-orb-a" />
        <span className="sf-orb sf-orb-b" />
        <span className="sf-orb sf-orb-c" />
      </div>
      <div className="services-inner">
        <div className="section-header-row">
          <div>
            <span className="eyebrow">
              <span className="eyebrow-rule" />
              Browse by support
            </span>
            <h2 className="section-heading">Find the supports in your plan</h2>
          </div>
          <Link to="/find-a-provider" className="btn-white">
            Browse all providers
          </Link>
        </div>

        <form
          className="sf-search"
          role="search"
          aria-label="Search supports"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className="sf-search-field">
            <Combobox
              label="What support are you looking for?"
              value={query}
              onInputChange={(t) => { setQuery(t); setNotFound(false); }}
              items={items}
              onSelect={(item) => { setQuery(item.label); go(item.key); }}
              placeholder="Try “occupational therapy”, “cleaning” or “SIL”"
              emptyText="No matching support. Try a broader word, or browse all providers."
              onEnterText={submit}
              onClear={() => { setQuery(''); setNotFound(false); }}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              }
            />
          </div>
          <button type="submit" className="btn-gradient sf-search-btn">Find providers</button>
        </form>
        {notFound && (
          <p className="sf-hint" role="status">
            We could not find a support called “{query.trim()}”. <Link to="/find-a-provider">Browse all providers</Link> or{' '}
            <button type="button" className="link-btn" onClick={() => openMatchModal()}>submit a provider enquiry</button>.
          </p>
        )}

        <div className="sf-tabs" role="group" aria-label="Filter supports by type">
          {[{ id: 'all' as const, label: 'All supports' }, ...GROUPS].map((g) => (
            <button
              key={g.id}
              type="button"
              className={`sf-tab${group === g.id ? ' sf-tab-active' : ''}`}
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Re-keyed on the chosen group so the cards rise again each time the filter changes. */}
        <div className="sf-grid" key={group}>
          {visible.map((s, i) => {
            const providerCount = providerCountLabel(serviceCount(stats, s.name));
            // Falls back to the public-register count for this category
            // while there's no real Provider count yet — labelled
            // "listed", never "providers", so it can't read as capacity
            // to accept enquiries (see registerMeta's categoryForService).
            const regCategory = categoryForService(s.name);
            const regCount = !providerCount && regCategory ? registerCounts?.[regCategory] : undefined;
            return (
              <div key={s.name} className="sf-tile" style={{ '--i': i } as CSSProperties}>
                <Link to={`/find-a-provider?service=${encodeURIComponent(s.name)}`} className="sf-card" data-pointer>
                  <span className="sf-media" aria-hidden="true">
                    <span className="sf-photo">
                      {PHOTOS[s.name] && (
                        <img
                          src={`/images/supports/${PHOTOS[s.name]}.jpg`}
                          alt=""
                          width={720}
                          height={450}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                    </span>
                    <span className="sf-chip">{GROUPS.find((g) => g.id === s.group)?.label}</span>
                    <span className="sf-icon">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        {s.icon}
                      </svg>
                    </span>
                  </span>
                  <span className="sf-card-main">
                    <span className="sf-card-title">{displayName(s)}</span>
                    <span className="sf-card-body">{s.body}</span>
                    <span className="sf-card-foot">
                      <span>{providerCount ?? (regCount ? <><Counter value={regCount} /> listed</> : 'Browse providers')}</span>
                      <span className="sf-arrow" aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              </div>
            );
          })}
        </div>

        <div className="sf-help">
          <div>
            <strong>Need assistance identifying provider options?</strong>
            <span>Submit your location, timeframe and funding information for relevant providers to review.</span>
          </div>
          <button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry</button>
        </div>
      </div>
    </section>
  );
}
