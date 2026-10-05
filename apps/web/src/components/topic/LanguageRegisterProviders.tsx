import { useEffect, useState } from 'react';
import RegisterProviderList from './RegisterProviderList';
import { getLanguageCounts, type CategoryCounts } from '../../api/registerApi';
import { KIND_BY_TYPE, type RegisterType } from '../../lib/registerMeta';
import '../../pages/wordpress/WordPressCPTPage.css';

const fmt = (n: number) => n.toLocaleString('en-AU');
const TYPES: RegisterType[] = ['ndis', 'aged_care'];

interface Props {
  language: string;
  /** Called once the counts are known, so the page can show or hide its "On the register" contents link. */
  onLoaded?: (total: number) => void;
}

/**
 * Public-register providers whose OWN website says they support a language ("we speak Arabic"). The
 * statement comes from the business's site, found by the api's languageDiscovery, so this section says
 * "mentions", never "speaks fluently" or "verified". Renders nothing until at least one listing has it.
 */
export default function LanguageRegisterProviders({ language, onLoaded }: Props) {
  const [counts, setCounts] = useState<Record<string, CategoryCounts> | null>(null);

  useEffect(() => {
    let alive = true;
    setCounts(null);
    Promise.all(TYPES.map((t) => getLanguageCounts(t, language).then((c) => [t, c] as const)))
      .then((rows) => {
        if (!alive) return;
        const next = Object.fromEntries(rows);
        setCounts(next);
        onLoaded?.(rows.reduce((sum, [, c]) => sum + c.total, 0));
      })
      .catch(() => { if (alive) onLoaded?.(0); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const withListings = TYPES.filter((t) => (counts?.[t]?.total ?? 0) > 0);
  if (!counts || withListings.length === 0) return null;

  return (
    <section id="register-providers" className="wp-cpt-section">
      <h2>Public-register providers that mention {language}</h2>
      <p>
        These providers appear on the {withListings.map((t) => KIND_BY_TYPE[t].register).join(' and the ')}, and their own website mentions {language}.
        That is not proof of fluency, an interpreting credential or current availability, so ask the provider directly about the specific worker and how
        communication will work.
      </p>
      {withListings.map((t) => (
        <div key={t}>
          <p className="wp-cpt-showing">
            {fmt(counts[t].total)} {t === 'ndis' ? 'NDIS' : 'aged care'} {counts[t].total === 1 ? 'provider' : 'providers'} mention {language}.
          </p>
          <RegisterProviderList type={t} language={language} states={counts[t].states} total={counts[t].total} />
        </div>
      ))}
    </section>
  );
}
