import { bannerFor, hubHeaderStyle } from '../../data/bannerImages';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { LANGUAGE_TOPICS, languageShellEditorial, type Topic } from '@soldirectory/topic-content';
import { PublicFooter, PublicHeader } from './PublicLayout';
import { ProviderCardItem } from './ProviderListingPage';
import Pagination from '../../components/ui/Pagination';
import LanguageRegisterProviders from '../../components/topic/LanguageRegisterProviders';
import TopicLayout, { heroExcerpt, type TopicTocItem } from '../../components/topic/TopicLayout';
import { Breadcrumbs } from './register/RegisterParts';
import { listProvidersBy, type PublicProviderCard } from '../../api/profilesApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { useMatchModal } from '../../context/MatchModalContext';
import './Home.css';
import './Directory.css';
import './register/register.css';
import './ProfilePages.css';

const PAGE_SIZE = 12;
const fmt = (value: number) => value.toLocaleString('en-AU');
const topicFor = (slug: string) => LANGUAGE_TOPICS.find((topic) => topic.slug === slug);
const groups = [...new Set(LANGUAGE_TOPICS.map((topic) => topic.categoryGroup))];

const sources = [
  { label: 'NDIS: language interpreting services', href: 'https://www.ndis.gov.au/contact/ndis-translations-and-interpreting' },
  { label: 'TIS National: interpreting services', href: 'https://www.tisnational.gov.au/' },
  { label: 'NAATI: find a credentialed practitioner', href: 'https://www.naati.com.au/online-directory/' },
  { label: 'NDIS Quality and Safeguards Commission', href: 'https://www.ndiscommission.gov.au/participants' },
];

export default function LanguageTopicPage() {
  const { slug = '' } = useParams();
  const topic = topicFor(slug.toLowerCase());
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [items, setItems] = useState<PublicProviderCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [registerTotal, setRegisterTotal] = useState(0);
  const topRef = useRef<HTMLParagraphElement>(null);
  const { openMatchModal } = useMatchModal();

  useEffect(() => {
    if (!topic) return;
    let alive = true;
    setLoading(true);
    setError(false);
    listProvidersBy({ language: topic.name, page, limit: PAGE_SIZE })
      .then((result) => { if (alive) { setItems(result.items); setTotal(result.total); } })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [topic, page]);

  useEffect(() => {
    if (!topic) {
      applySeoTags({ title: 'Page not found | SolDirectory', description: 'This page could not be found.', noindex: true });
      return;
    }
    const canonical = `${window.location.origin}/language/${topic.slug}/`;
    const editorial = languageShellEditorial(topic);
    applySeoTags({
      title: `${topic.name} speaking support providers and communication guide | SolDirectory`,
      description: `Find providers that list ${topic.name} and learn what to confirm about fluency, interpreters, cultural safety, privacy, funding and communication before support begins.`,
      canonicalUrl: page > 1 ? `${canonical}?page=${page}` : canonical,
    });
    setJsonLd('language-page', { '@type': 'WebPage', name: `${topic.name} speaking support providers`, url: canonical, isPartOf: { '@type': 'WebSite', name: 'SolDirectory', url: window.location.origin } });
    setJsonLd('language-breadcrumbs', { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${window.location.origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Language', item: `${window.location.origin}/language` },
      { '@type': 'ListItem', position: 3, name: topic.name, item: canonical },
    ] });
    setJsonLd('language-faq', { '@type': 'FAQPage', mainEntity: editorial.faq.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })) });
    return () => { setJsonLd('language-page', null); setJsonLd('language-breadcrumbs', null); setJsonLd('language-faq', null); };
  }, [topic, page]);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (!topic) return <><PublicHeader /><main className="reg-page"><div className="dir-empty"><h1>Language page not found</h1><Link className="btn-gradient" to="/language">Browse language support</Link></div></main><PublicFooter /></>;

  const editorial = languageShellEditorial(topic);
  const siblings = LANGUAGE_TOPICS.filter((item) => item.categoryGroup === topic.categoryGroup && item.slug !== topic.slug);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toc: TopicTocItem[] = [
    { id: 'about', label: 'Overview' }, { id: 'providers', label: 'Providers' },
    ...(registerTotal > 0 ? [{ id: 'register-providers', label: 'On the register' }] : []),
    { id: 'communication', label: 'Communication planning' }, { id: 'interpreters', label: 'Interpreters' },
    { id: 'questions', label: 'Questions to ask' }, { id: 'privacy', label: 'Privacy and consent' },
    { id: 'funding', label: 'Funding and fees' }, { id: 'related-languages', label: 'Related options' },
    { id: 'faq', label: 'FAQ' }, { id: 'sources', label: 'Official sources' }, { id: 'wp-cpt-cta', label: 'Get matched' },
  ];

  return (
    <TopicLayout
      crumbs={[{ label: 'Home', to: '/' }, { label: 'Language', to: '/language' }, { label: topic.name }]}
      eyebrow={topic.categoryGroup}
      title={`${topic.name} speaking support providers`}
      description={heroExcerpt(editorial.overview)}
      image={bannerFor({ text: 'multicultural language', section: 'conditions' })}
      toc={toc}
    >
      <section id="about" className="wp-cpt-short">
        <h2>Finding support connected with {topic.name}</h2>
        <p>{editorial.overview}</p>
        <p className="wp-cpt-table-note">Providers supply their own language information. SolDirectory does not test fluency, interpreting credentials or cultural competence.</p>
      </section>

      <section id="providers" className="wp-cpt-section">
        <h2>Providers that list {topic.name}</h2>
        <p ref={topRef}>{loading ? 'Loading…' : `${fmt(total)} ${total === 1 ? 'provider lists' : 'providers list'} ${topic.name}. Confirm the specific worker, communication method and availability directly.`}</p>
        {error ? <div className="dir-empty" role="alert"><p>We couldn’t load providers just now. Please try again.</p></div> : null}
        {!loading && !error && items.length === 0 ? (
          <div className="dir-empty"><h3>No provider currently lists {topic.name}</h3><p>Submit an enquiry with the person’s language, dialect and communication preferences so suitable providers can review it.</p></div>
        ) : <ul className="dir-grid" aria-busy={loading}>{items.map((provider) => <ProviderCardItem key={provider.id} p={provider} />)}</ul>}
        <Pagination page={page} totalPages={totalPages} disabled={loading} onChange={(next) => { setParams(next > 1 ? { page: String(next) } : {}); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} />
      </section>

      <LanguageRegisterProviders key={topic.slug} language={topic.name} onLoaded={setRegisterTotal} />

      <section id="communication" className="wp-cpt-section">
        <h2>Plan communication before support begins</h2>
        <p>Language preference is part of informed choice, but it is not the whole communication plan. Record how the person prefers to receive information, express decisions, ask for help and communicate when distressed, tired or unwell.</p>
        <ul className="wp-cpt-plain-list">
          <li>Confirm the preferred language, dialect, name and pronouns rather than making assumptions from country of birth or family background.</li>
          <li>Separate conversational fluency from the ability to explain health, funding, rights, risks or service agreements accurately.</li>
          <li>Discuss speech, signing, writing, pictures, communication devices, Easy Read and extra processing time as separate needs.</li>
          <li>Document who may receive information and when family, advocates or interpreters should be involved.</li>
        </ul>
      </section>

      <section id="interpreters" className="wp-cpt-section">
        <h2>When to use a qualified interpreter</h2>
        <p>A bilingual support worker and an interpreter have different roles. Direct language-matched support may help with daily communication and relationships. A qualified independent interpreter may still be important for assessment, consent, complaints, complex decisions or technical information.</p>
        <p>Ask who will book the interpreter, whether the person can request a preferred gender or practitioner, how confidentiality is handled, what happens if an interpreter is unavailable and whether the funding arrangement covers the cost.</p>
      </section>

      <section id="questions" className="wp-cpt-section">
        <h2>Questions to ask providers</h2>
        <ol className="wp-cpt-plain-list">{editorial.checks.map((check) => <li key={check}>{check}</li>)}</ol>
        <p>Also ask how the provider checks understanding, records communication preferences, supervises multilingual staff and maintains continuity if the usual worker is unavailable.</p>
      </section>

      <section id="privacy" className="wp-cpt-section">
        <h2>Privacy, consent and cultural safety</h2>
        <p>The person should remain at the centre of the conversation. Do not assume a family member should interpret, receive private information or make decisions. Confirm consent, decision-making arrangements and privacy preferences directly wherever possible.</p>
        <p>Cultural safety cannot be inferred from a shared language. Ask how the provider responds to the person’s community connections, gender preferences, faith, food, family roles, trauma history and experiences of discrimination without stereotyping them.</p>
      </section>

      <section id="funding" className="wp-cpt-section">
        <h2>Funding, service agreements and extra fees</h2>
        <p>Interpreter and translation costs depend on the program, purpose and current rules. Before booking, confirm whether an interpreter is funded, whether prior approval is needed, who can provide it and whether the provider adds administration, travel or cancellation fees.</p>
        <p>Request important terms in an accessible format. Check rates, minimum shifts, travel, cancellations, report fees, interpreter arrangements and exit terms in the written service agreement.</p>
      </section>

      {siblings.length > 0 && <section id="related-languages" className="wp-cpt-section"><h2>Other options in {topic.categoryGroup}</h2><ul className="reg-linkgrid">{siblings.map((item) => <li key={item.slug}><Link to={`/language/${item.slug}/`}><span>{item.name}</span></Link></li>)}</ul></section>}

      <section id="faq" className="wp-cpt-section"><h2>Frequently asked questions</h2><div className="wp-cpt-faq-list">{editorial.faq.map((faq) => <details className="wp-cpt-faq-item" key={faq.question}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</div></section>
      <section id="sources" className="wp-cpt-section"><h2>Official sources and interpreter directories</h2><ul className="wp-cpt-plain-list">{sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}</a></li>)}</ul><p className="wp-cpt-table-note">Check current eligibility, booking and payment rules with the responsible program.</p></section>
      <section id="wp-cpt-cta" className="wp-cpt-cta"><h2>Looking for support connected with {topic.name}?</h2><p>Describe the person’s language, dialect, communication method, location, support and funding so relevant providers can review the enquiry.</p><button type="button" className="btn-gradient" onClick={() => openMatchModal()}>Submit an enquiry →</button></section>
    </TopicLayout>
  );
}

export function LanguageHubPage() {
  useEffect(() => {
    applySeoTags({
      title: 'Find support by language and communication preference | SolDirectory',
      description: 'Browse providers by languages they list and learn how to check fluency, interpreting, accessible communication, privacy and cultural safety.',
      canonicalUrl: `${window.location.origin}/language`,
    });
    window.scrollTo(0, 0);
  }, []);

  return <><PublicHeader /><div className="directory-page-header directory-page-header--conditions" style={hubHeaderStyle('multicultural')}><div className="directory-page-header-inner"><span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />Communication preferences</span><h1 className="section-heading section-heading-light">Find support by language</h1><p className="directory-page-subtitle">Browse provider-supplied language information, then confirm the worker, fluency, dialect and communication method directly.</p></div></div><main className="reg-page category-hub-page"><Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Language' }]} /><section className="directory-intro"><span className="directory-section-label">Language is one part of fit</span><h2>Plan for clear, respectful communication</h2><p>A shared language may improve everyday communication, but it does not prove interpreting credentials, cultural safety, specialist experience or current availability. Each guide explains what to check before support begins.</p></section>{groups.map((group) => <section className="category-hub-group" key={group}><h2 className="reg-h2">{group}</h2><ul className="reg-linkgrid">{LANGUAGE_TOPICS.filter((topic) => topic.categoryGroup === group).map((topic) => <li key={topic.slug}><Link to={`/language/${topic.slug}/`}><span>{topic.name}</span></Link></li>)}</ul></section>)}</main><PublicFooter /></>;
}