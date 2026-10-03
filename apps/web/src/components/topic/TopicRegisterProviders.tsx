import { useEffect, useState } from 'react';
import RegisterProviderList from './RegisterProviderList';
import { getCategoryCounts, getRegisterHub } from '../../api/registerApi';
import { AGED_CARE_CATEGORIES, KIND_BY_TYPE, type RegisterType } from '../../lib/registerMeta';
import '../../pages/wordpress/WordPressCPTPage.css';

const fmt = (n: number) => n.toLocaleString('en-AU');

interface Props {
  id: string;
  heading: string;
  intro: string;
  /** A short factual line shown above the intro (e.g. that no member has listed this yet). */
  leadNote?: string;
  /** Register type used when no category is picked (or the category belongs to neither register exclusively). */
  defaultType: RegisterType;
  /** Support categories offered as chips. Empty = just the whole register. */
  categories: string[];
  /** Also offer an "All" chip (the whole register for defaultType). */
  includeAll?: boolean;
  /** Shown under the list — what a listing does and doesn't tell you for this topic. */
  disclaimer?: string;
}

/**
 * "Providers on the public register" section for a condition or funding
 * page — the same register cards, map and state filter a service page
 * shows. The page's topic is linked to real register support categories
 * (see data/conditionContent.ts and data/topicProviderLinks.ts); this
 * section never claims a listed provider has experience with the topic
 * or accepts a given funding, only that it lists a related support.
 */
export default function TopicRegisterProviders({ id, heading, intro, leadNote, defaultType, categories, includeAll, disclaimer }: Props) {
  const options = includeAll || categories.length === 0 ? ['', ...categories] : categories;
  const [category, setCategory] = useState(options[0]);
  const [data, setData] = useState<{ total: number; states: Record<string, number> } | null>(null);

  const type: RegisterType = category && AGED_CARE_CATEGORIES.includes(category) ? 'aged_care' : defaultType;

  useEffect(() => {
    let alive = true;
    setData(null);
    const load = category ? getCategoryCounts(type, category) : getRegisterHub(type).then((h) => ({ total: h.total, states: h.states }));
    load.then((r) => { if (alive) setData(r); }).catch(() => {});
    return () => { alive = false; };
  }, [type, category]);

  const kind = KIND_BY_TYPE[type];
  const noun = type === 'ndis' ? 'NDIS' : 'aged care';

  return (
    <section id={id} className="wp-cpt-section">
      <h2>{heading}</h2>
      {leadNote && <p className="wp-cpt-table-note" style={{ marginBottom: 12 }}>{leadNote}</p>}
      <p>{intro}</p>

      {options.length > 1 && (
        <div className="wp-cpt-chips" role="group" aria-label="Choose a support type">
          {options.map((c) => (
            <button key={c || 'all'} type="button" className={`wp-cpt-chip${category === c ? ' is-on' : ''}`} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c || `All ${noun} providers`}
            </button>
          ))}
        </div>
      )}

      {data && data.total > 0 && (
        <>
          <p className="wp-cpt-showing">
            {fmt(data.total)} {noun} {data.total === 1 ? 'provider' : 'providers'} on the {kind.register}{category ? ` list ${category.toLowerCase()}` : ''}.
          </p>
          <RegisterProviderList key={`${type}|${category}`} type={type} category={category || undefined} states={data.states} total={data.total} heading="Browse providers" />
        </>
      )}
      {data && data.total === 0 && <p className="wp-cpt-table-note">No register listings for this support type yet.</p>}
      {disclaimer && <p className="wp-cpt-table-note">{disclaimer}</p>}
    </section>
  );
}
