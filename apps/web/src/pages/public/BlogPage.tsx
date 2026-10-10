import { useEffect, useMemo, useState, type FormEvent } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { getBlogCategories, getBlogPost, getBlogPosts, type WPBlogPost, type WPTerm } from '../../api/wordpressApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { hubHeaderStyle } from '../../data/bannerImages';
import { useMatchModal } from '../../context/MatchModalContext';
import { PublicFooter, PublicHeader } from './PublicLayout';
import BlogShare from './BlogShare';
import { BLOG_FAQS, BLOG_TOPICS, relatedLinksFor } from '../../data/blogSeo';
import { EDITORIAL_BLOG_POSTS, GUIDE_DOCS, type EditorialBlogPost } from '@soldirectory/topic-content';
import './BlogPage.css';

const SITE_ORIGIN = () => window.location.origin;
const BLOG_PAGE_SIZE = 9;
const EDITORIAL_COVER = '/images/six-checks-on-every-provider.jpg';
const editorialCategoryNames = [...new Set(EDITORIAL_BLOG_POSTS.map((article) => article.category))];
const EDITORIAL_CATEGORIES: WPTerm[] = editorialCategoryNames.map((name, index) => ({
  id: -(index + 1),
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  taxonomy: 'category',
  parent: 0,
}));

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] as string);
}

function editorialToPost(article: EditorialBlogPost): WPBlogPost {
  const category = EDITORIAL_CATEGORIES.find((item) => item.name === article.category)!;
  const contentHtml = article.sections.map((section) =>
    `<section><h2>${escapeHtml(section.heading)}</h2>${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`
  ).join('');
  return {
    id: -Math.abs(article.slug.split('').reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) | 0, 0)),
    slug: article.slug,
    title: article.title,
    contentHtml,
    excerpt: article.summary,
    featuredImage: { url: article.coverImage, alt: article.coverAlt },
    terms: [category],
    seo: { title: `${article.title} | SolDirectory`, description: article.summary, ogImage: article.coverImage, noindex: false },
    date: article.publishedAt,
    modified: article.checkedAt,
    authorName: 'SolDirectory',
    categories: [category],
    editorialSource: { ...article.source, checkedAt: article.checkedAt },
    expiresAt: article.expiresAt,
  };
}

const ALL_EDITORIAL_POSTS = EDITORIAL_BLOG_POSTS.map(editorialToPost);
const CURRENT_EDITORIAL_POSTS = ALL_EDITORIAL_POSTS
  .filter((article) => !article.expiresAt || new Date(article.expiresAt).getTime() > Date.now())

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(date);
}

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function postImage(post: WPBlogPost): string {
  return post.featuredImage?.url || EDITORIAL_COVER;
}

const sortNewest = (posts: WPBlogPost[]) => [...posts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

/** Sanitises the article HTML and gives every h2 an id, returning an "On this page" list built from those headings. */
function prepareArticle(html: string): { html: string; toc: { id: string; text: string }[] } {
  const clean = DOMPurify.sanitize(html);
  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const toc: { id: string; text: string }[] = [];
  doc.querySelectorAll('h2').forEach((heading, index) => {
    const text = (heading.textContent ?? '').trim();
    if (!text) return;
    const id = `section-${index + 1}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)}`;
    heading.id = id;
    toc.push({ id, text });
  });
  return { html: doc.body.innerHTML, toc };
}

function BlogCard({ post, featured = false, badge }: { post: WPBlogPost; featured?: boolean; badge?: string }) {
  const category = post.categories[0]?.name || 'Practical guidance';
  return (
    <article className={`blog-card${featured ? ' blog-card-featured' : ''}`}>
      <Link className="blog-card-image-link" to={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
        <img className="blog-card-image" src={postImage(post)} alt={post.featuredImage?.alt || ''} loading="lazy" />
        {badge && <span className="blog-card-badge">{badge}</span>}
      </Link>
      <div className="blog-card-copy">
        <div className="blog-card-meta"><span>{category}</span><time dateTime={post.date}>{formatDate(post.date)}</time><span className="blog-card-read">{readingMinutes(post.contentHtml)} min read</span></div>
        <h2><Link to={`/blog/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt || post.seo.description}</p>
        <Link className="blog-read-link" to={`/blog/${post.slug}`}>Read article <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

export default function BlogPage() {
  const { slug } = useParams<{ slug?: string }>();
  const { openMatchModal } = useMatchModal();
  const [posts, setPosts] = useState<WPBlogPost[]>([]);
  const [categories, setCategories] = useState<WPTerm[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<number, number>>({});
  // An article we already have on hand opens instantly; the live copy replaces it when it arrives.
  const [article, setArticle] = useState<WPBlogPost | null>(() => (slug ? ALL_EDITORIAL_POSTS.find((post) => post.slug === slug) ?? null : null));
  const [related, setRelated] = useState<WPBlogPost[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(() => !(slug && ALL_EDITORIAL_POSTS.some((post) => post.slug === slug)));
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let current = true;
    const editorialPost = ALL_EDITORIAL_POSTS.find((post) => post.slug === slug);
    setLoading(!editorialPost);
    setError('');
    setArticle(editorialPost ?? null);
    window.scrollTo(0, 0);
    getBlogPost(slug)
      .then((result) => { if (current) setArticle(result ?? editorialPost ?? null); })
      .catch(() => {
        if (!current) return;
        setArticle(editorialPost ?? null);
        if (!editorialPost) setError('Unable to load this article right now. Please try again shortly.');
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [slug]);

  // "Keep reading": other published articles, same category first.
  useEffect(() => {
    if (!slug || !article) return;
    let current = true;
    getBlogPosts({ page: 1 })
      .catch(() => null)
      .then((result) => {
        if (!current) return;
        const pool = new Map<string, WPBlogPost>();
        for (const post of [...(result?.items ?? []), ...CURRENT_EDITORIAL_POSTS]) if (post.slug !== article.slug) pool.set(post.slug, post);
        const sameCategory = (post: WPBlogPost) => post.categories.some((c) => article.categories.some((a) => a.name === c.name));
        const ordered = sortNewest([...pool.values()]);
        setRelated([...ordered.filter(sameCategory), ...ordered.filter((post) => !sameCategory(post))].slice(0, 3));
      });
    return () => { current = false; };
  }, [slug, article]);

  useEffect(() => {
    if (slug) return;
    let current = true;
    setLoading(page === 1);
    setLoadingMore(page > 1);
    setError('');
    Promise.all([
      getBlogPosts({ page, search: submittedQuery, category: categoryId }).catch(() => null),
      page === 1 ? getBlogCategories().catch(() => []) : Promise.resolve(categories),
    ])
      .then(([result, availableCategories]) => {
        if (!current) return;
        const localMatches = CURRENT_EDITORIAL_POSTS.filter((post) => {
          const categoryMatch = categoryId === null || post.categories.some((category) => category.id === categoryId)
            || (categoryId > 0 && post.categories.some((category) => category.name === availableCategories.find((item) => item.id === categoryId)?.name));
          const searchable = `${post.title} ${post.excerpt} ${post.categories.map((category) => category.name).join(' ')} ${post.contentHtml.replace(/<[^>]+>/g, ' ')}`.toLowerCase();
          return categoryMatch && (!submittedQuery || searchable.includes(submittedQuery.toLowerCase()));
        });
        const remoteItems = categoryId !== null && categoryId < 0 ? [] : result?.items ?? [];
        const remoteSlugs = new Set(remoteItems.map((post) => post.slug));
        const localOnly = localMatches.filter((post) => !remoteSlugs.has(post.slug));
        const nextPosts = page === 1 ? sortNewest([...remoteItems, ...localOnly]) : remoteItems;
        setPosts((existing) => page === 1 ? nextPosts : [...existing, ...nextPosts]);
        setTotalPages(categoryId !== null && categoryId < 0 ? 1 : result?.totalPages ?? 1);
        const mergedCategories = [...EDITORIAL_CATEGORIES, ...availableCategories.filter((item) => !EDITORIAL_CATEGORIES.some((editorial) => editorial.name.toLowerCase() === item.name.toLowerCase()))];
        setCategories(mergedCategories);
        // Topic counts describe the whole library, so they are taken from the unfiltered first page only.
        if (page === 1 && categoryId === null && !submittedQuery) {
          const counts: Record<number, number> = {};
          for (const post of nextPosts) for (const category of post.categories) counts[category.id] = (counts[category.id] ?? 0) + 1;
          setCategoryCounts(counts);
        }
      })
      .catch(() => { if (current) setError('Unable to load articles right now. Please try again shortly.'); })
      .finally(() => {
        if (current) { setLoading(false); setLoadingMore(false); }
      });
    return () => { current = false; };
  }, [slug, page, submittedQuery, categoryId]);

  useEffect(() => {
    if (slug) {
      if (!article) return;
      const canonical = `${SITE_ORIGIN()}/blog/${article.slug}`;
      const description = article.seo.description || article.excerpt;
      applySeoTags({
        title: article.seo.title || `${article.title} | SolDirectory`,
        description,
        ogImage: article.seo.ogImage || article.featuredImage?.url,
        canonicalUrl: canonical,
        noindex: article.seo.noindex || (!!article.expiresAt && new Date(article.expiresAt).getTime() <= Date.now()),
      });
      setJsonLd('blog-post', {
        '@type': 'BlogPosting',
        headline: article.title,
        description,
        datePublished: article.date,
        dateModified: article.modified,
        author: { '@type': 'Organization', name: article.authorName },
        publisher: { '@type': 'Organization', name: 'SolDirectory', url: `${SITE_ORIGIN()}/` },
        mainEntityOfPage: canonical,
        url: canonical,
        inLanguage: 'en-AU',
        articleSection: article.categories[0]?.name,
        keywords: ['NDIS', ...article.categories.map((c) => c.name)].join(', '),
        ...(article.featuredImage?.url ? { image: [article.featuredImage.url] } : {}),
      });
      setJsonLd('blog-breadcrumbs', {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN()}/` },
          { '@type': 'ListItem', position: 2, name: 'Updates & insights', item: `${SITE_ORIGIN()}/blog` },
          { '@type': 'ListItem', position: 3, name: article.title, item: canonical },
        ],
      });
      return () => { setJsonLd('blog-post', null); setJsonLd('blog-breadcrumbs', null); };
    }

    applySeoTags({
      title: 'NDIS updates, plan changes and provider news | SolDirectory',
      description: 'Plain-English NDIS updates, plan and budget changes, pricing explainers and provider news for participants, families and providers across Australia.',
      canonicalUrl: `${SITE_ORIGIN()}/blog`,
      noindex: posts.length === 0 && !submittedQuery && categoryId === null,
    });
    setJsonLd('blog-archive', {
      '@type': 'Blog',
      name: 'SolDirectory updates and insights',
      description: 'Independent explainers and practical guidance about disability and aged care support in Australia.',
      url: `${SITE_ORIGIN()}/blog`,
      blogPost: posts.slice(0, 9).map((post) => ({
        '@type': 'BlogPosting',
        headline: post.title,
        url: `${SITE_ORIGIN()}/blog/${post.slug}`,
        datePublished: post.date,
      })),
    });
    setJsonLd('blog-faq', {
      '@type': 'FAQPage',
      mainEntity: BLOG_FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
    return () => { setJsonLd('blog-archive', null); setJsonLd('blog-faq', null); };
  }, [slug, article, posts]);

  // Reading-progress bar for the article view.
  useEffect(() => {
    if (!slug) return;
    function onScroll() {
      const body = document.querySelector('.blog-article-body');
      if (!body) return;
      const rect = body.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      setProgress(total <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / total)));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug, article]);

  const prepared = useMemo(() => (article ? prepareArticle(article.contentHtml) : null), [article]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedQuery(query.trim());
  }

  function chooseCategory(id: number | null) {
    setPage(1);
    setCategoryId(id);
  }

  if (slug) {
    const expired = !!article?.expiresAt && new Date(article.expiresAt).getTime() <= Date.now();
    const articleUrl = article ? `${SITE_ORIGIN()}/blog/${article.slug}` : '';
    return (
      <>
        <PublicHeader />
        <div className="blog-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress})` }} /></div>

        {loading ? (
          <div className="blog-skel-article" role="status" aria-live="polite" aria-label="Loading article">
            <div className="blog-hero-art blog-hero-art--loading">
              <div className="blog-hero-art-shade">
                <div className="blog-wrap">
                  <div className="blog-skel blog-skel-dark" style={{ width: 220, height: 14, marginBottom: 'clamp(30px, 5vw, 56px)' }} />
                  <div className="blog-skel blog-skel-dark" style={{ width: 120, height: 26, borderRadius: 100 }} />
                  <div className="blog-skel blog-skel-dark" style={{ width: 'min(100%, 760px)', height: 44, marginTop: 20 }} />
                  <div className="blog-skel blog-skel-dark" style={{ width: 'min(100%, 560px)', height: 44, marginTop: 12 }} />
                  <div className="blog-skel blog-skel-dark" style={{ width: 'min(100%, 640px)', height: 18, marginTop: 24 }} />
                  <div className="blog-skel blog-skel-dark" style={{ width: 'min(100%, 420px)', height: 18, marginTop: 10 }} />
                </div>
              </div>
            </div>
            <div className="blog-article-page">
              <div className="blog-wrap">
                <div className="blog-article-layout">
                  <div className="blog-article-main">
                    <div className="blog-skel" style={{ width: 'min(100%, 340px)', height: 40, marginBottom: 34 }} />
                    {[100, 96, 100, 82, 100, 94, 70].map((w, i) => <div key={i} className="blog-skel" style={{ width: `${w}%`, height: 16, marginBottom: 16 }} />)}
                  </div>
                  <div className="blog-rail"><div className="blog-skel" style={{ width: '100%', height: 190, borderRadius: 12 }} /></div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <main className="blog-article-page"><div className="blog-wrap"><p className="blog-state" role="alert">{error}</p></div></main>
        ) : !article || !prepared ? (
          <main className="blog-article-page"><div className="blog-wrap"><section className="blog-not-found"><span className="blog-kicker">SolDirectory journal</span><h1>Article not found</h1><p>This article may have been unpublished or moved.</p><Link className="blog-primary-link" to="/blog">Browse latest updates</Link></section></div></main>
        ) : (
          <>
            <header className="blog-hero-art" style={{ backgroundImage: `url(${postImage(article)})` }}>
              <div className="blog-hero-art-shade">
                <div className="blog-wrap">
                  <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/blog">Updates & insights</Link><span>/</span><span>{article.categories[0]?.name || 'Article'}</span></nav>
                  <div className="blog-hero-art-copy">
                    <div className="blog-article-categories">
                      {article.categories.map((category) => <span key={category.id}>{category.name}</span>)}
                      {expired && <span className="blog-chip-expired">Notice has passed</span>}
                    </div>
                    <h1>{article.title}</h1>
                    {article.excerpt && <p className="blog-article-deck">{article.excerpt}</p>}
                    <div className="blog-article-byline">
                      {article.authorName === 'SolDirectory'
                        ? <img className="blog-byline-logo" src="/images/sol-directory-logo-white-transparent-v2.png" alt="SolDirectory" />
                        : <span className="blog-byline-name">{article.authorName}</span>}
                      <span aria-hidden="true">·</span><time dateTime={article.date}>{formatDate(article.date)}</time>
                      <span aria-hidden="true">·</span><span>{readingMinutes(article.contentHtml)} min read</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="blog-article-page">
              <div className="blog-wrap">
                <div className="blog-article-layout">
                  <article className="blog-article-main">
                    <div className="blog-article-top">
                      <Link className="blog-back-link" to="/blog">← All updates</Link>
                      <BlogShare url={articleUrl} title={article.title} variant="bar" />
                    </div>

                    <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: prepared.html }} />

                    {article.modified && article.modified !== article.date && <p className="blog-updated">Updated {formatDate(article.modified)}. Check linked official sources for current requirements.</p>}
                    {expired && <p className="blog-updated">This scheduled notice has passed. Check the linked official source for current system availability.</p>}

                    {article.editorialSource && (
                      <aside className="blog-source-card">
                        <span className="blog-source-card-label">Primary source · checked {formatDate(article.editorialSource.checkedAt)}</span>
                        <a href={article.editorialSource.url} target="_blank" rel="noopener noreferrer">{article.editorialSource.label} <span aria-hidden="true">↗</span></a>
                        <p>Read the current official notice before acting. Guidance and effective dates can change.</p>
                      </aside>
                    )}

                    <BlogShare url={articleUrl} title={article.title} variant="panel" />

                    <section className="blog-learn" aria-labelledby="blog-learn-heading">
                      <h2 id="blog-learn-heading">Keep learning</h2>
                      <p>Guides and tools that go with this topic.</p>
                      <ul>
                        {relatedLinksFor(article.categories.map((c) => c.name)).map((item) => <li key={item.to}><Link to={item.to}>{item.label} <span aria-hidden="true">→</span></Link></li>)}
                      </ul>
                    </section>

                    <aside className="blog-source-note"><strong>Independent information, not personal advice.</strong><span>NDIS rules and support arrangements can change. Confirm current requirements with the responsible government body before acting.</span><Link to="/guides">Browse practical guides</Link></aside>
                  </article>

                  <aside className="blog-rail" aria-label="Article tools">
                    {prepared.toc.length > 1 && (
                      <nav className="blog-rail-card" aria-label="On this page">
                        <h2>On this page</h2>
                        <ol>{prepared.toc.map((item) => <li key={item.id}><a href={`#${item.id}`}>{item.text}</a></li>)}</ol>
                      </nav>
                    )}
                    <div className="blog-rail-card blog-rail-cta">
                      <h2>Need support?</h2>
                      <p>Compare providers and public-register listings for your area, or send one free request.</p>
                      <button type="button" onClick={() => openMatchModal()}>Get matched, free</button>
                      <Link to="/find-a-provider">Search providers →</Link>
                    </div>
                  </aside>
                </div>

                {related.length > 0 && (
                  <section className="blog-related" aria-labelledby="blog-related-heading">
                    <h2 id="blog-related-heading">Keep reading</h2>
                    <div className="blog-card-grid">{related.map((post) => <BlogCard key={post.slug} post={post} />)}</div>
                  </section>
                )}
              </div>
            </main>
          </>
        )}
        <PublicFooter />
      </>
    );
  }

  const filtering = categoryId !== null || !!submittedQuery;
  const featured = !filtering && page === 1 ? posts[0] : undefined;
  const gridPosts = featured ? posts.slice(1) : posts;
  const newest = posts[0];
  const guides = Object.values(GUIDE_DOCS);

  return (
    <>
      <PublicHeader />

      <div className="directory-page-header directory-page-header--blog" style={hubHeaderStyle('guides')}>
        <div className="directory-page-header-inner">
          <span className="eyebrow eyebrow-light"><span className="eyebrow-rule" />SolDirectory journal</span>
          <h1 className="section-heading section-heading-light">Support changes. Clear answers matter.</h1>
          <p className="directory-page-subtitle">Independent explainers and practical guidance for people navigating disability and aged care support in Australia.</p>
          {posts.length > 0 && !filtering && (
            <ul className="blog-headline" aria-label="Journal at a glance">
              <li><strong>{posts.length}</strong><span>{posts.length === 1 ? 'article' : 'articles'}</span></li>
              {newest && <li><strong>{formatShortDate(newest.date)}</strong><span>latest update</span></li>}
            </ul>
          )}
        </div>
      </div>

      <main className="blog-home">
        <section className="blog-disclosure" aria-label="Editorial approach">
          <strong>Independent information, not government advice.</strong>
          <span>We link to official sources and note when guidance was published or updated. Confirm current rules directly with the responsible agency.</span>
        </section>

        <section className="blog-content" id="latest" aria-labelledby="blog-latest-heading">
          {featured && (
            <div className="blog-feature-row">
              <div className="blog-feature-main">
                <BlogCard post={featured} featured badge="Latest update" />
              </div>
              {posts.length > 1 && (
                <aside className="blog-timeline" aria-label="Recent notices">
                  <h2>Recent notices</h2>
                  <ol>
                    {posts.slice(0, 6).map((post) => (
                      <li key={post.slug}>
                        <time dateTime={post.date}>{formatShortDate(post.date)}</time>
                        <div><span>{post.categories[0]?.name || 'Update'}</span><Link to={`/blog/${post.slug}`}>{post.title}</Link></div>
                      </li>
                    ))}
                  </ol>
                </aside>
              )}
            </div>
          )}

          <div className="blog-section-heading">
            <div><span className="blog-kicker">{filtering ? 'Results' : 'More to read'}</span><h2 id="blog-latest-heading">{filtering ? 'Matching articles' : 'Updates & insights'}</h2></div>
            <span className="blog-results-count">{loading ? 'Loading articles' : `${posts.length} ${posts.length === 1 ? 'article' : 'articles'} shown`}</span>
          </div>

          <div className="blog-tools">
            <form className="blog-search" onSubmit={submitSearch} role="search">
              <label className="visually-hidden" htmlFor="blog-search-input">Search articles</label>
              <input id="blog-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, changes or support…" />
              <button type="submit" aria-label="Search articles">Search</button>
              {submittedQuery && <button type="button" className="blog-search-clear" onClick={() => { setQuery(''); setSubmittedQuery(''); setPage(1); }}>Clear</button>}
            </form>
            <div className="blog-categories" role="group" aria-label="Filter by topic">
              <button type="button" aria-pressed={categoryId === null} className={categoryId === null ? 'is-active' : ''} onClick={() => chooseCategory(null)}>All topics{Object.keys(categoryCounts).length > 0 && categoryId === null && !submittedQuery ? ` (${posts.length})` : ''}</button>
              {categories.filter((category) => category.slug !== 'uncategorized').map((category) => (
                <button type="button" key={category.id} aria-pressed={categoryId === category.id} className={categoryId === category.id ? 'is-active' : ''} onClick={() => chooseCategory(category.id)}>
                  {category.name}{categoryCounts[category.id] ? ` (${categoryCounts[category.id]})` : ''}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="blog-state" role="alert">{error}</p>}
          {loading ? <div className="blog-card-grid" aria-label="Loading articles"><div className="blog-skeleton" /><div className="blog-skeleton" /><div className="blog-skeleton" /></div> : gridPosts.length ? (
            <div className="blog-card-grid">
              {gridPosts.map((post) => <BlogCard key={post.id} post={post} />)}
            </div>
          ) : !error && !featured ? (
            <div className="blog-empty"><h3>{filtering ? 'No articles match that search' : 'No published articles yet'}</h3><p>{filtering ? 'Try a different word, or clear the filter to see everything.' : 'New explainers and practical updates will appear here. In the meantime, browse our current guides and official links.'}</p><Link className="blog-primary-link" to="/guides">Browse guides</Link></div>
          ) : null}

          {posts.length > 0 && page < totalPages && <div className="blog-load-more"><button type="button" onClick={() => setPage((current) => current + 1)} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more articles'}</button></div>}
        </section>

        <section className="blog-guides" aria-labelledby="blog-guides-heading">
          <div className="blog-guides-inner">
            <div className="blog-section-heading"><div><span className="blog-kicker">Start with the basics</span><h2 id="blog-guides-heading">Practical guides</h2></div><Link className="blog-read-link" to="/guides">All guides <span aria-hidden="true">→</span></Link></div>
            <div className="blog-guide-grid">
              {guides.map((guide) => (
                <Link key={guide.slug} className="blog-guide-card" to={`/guides/${guide.slug}`}>
                  <strong>{guide.title}</strong>
                  <span>{guide.summary}</span>
                  <em>Read the guide →</em>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="blog-seo" aria-labelledby="blog-seo-heading">
          <div className="blog-seo-inner">
            <div className="blog-seo-intro">
              <span className="blog-kicker">About this journal</span>
              <h2 id="blog-seo-heading">NDIS updates, plan changes and provider news in plain English</h2>
              <p>SolDirectory’s journal explains changes to the NDIS, aged care and the wider disability support system in language people can act on. Each article covers what a change is, who it may affect and which questions to ask, so participants, families, support coordinators, plan managers and providers can prepare without wading through policy documents.</p>
              <p>We write about NDIS plan and budget changes, the price guide and pricing arrangements, provider responsibilities, claiming and payments, service outages and notices, and how to choose and compare providers. Articles link to the official notice they are based on and show when they were published or updated. For anything that affects a decision, confirm the current rules with the NDIA, the NDIS Commission or My Aged Care.</p>
            </div>

            <h3 className="blog-seo-subhead">What we cover</h3>
            <div className="blog-topic-grid">
              {BLOG_TOPICS.map((topic) => (
                <Link key={topic.title} className="blog-topic-card" to={topic.to}>
                  <strong>{topic.title}</strong>
                  <span>{topic.text}</span>
                  <em>{topic.cta} →</em>
                </Link>
              ))}
            </div>

            <h3 className="blog-seo-subhead" id="blog-faq-heading">Frequently asked questions</h3>
            <div className="blog-faq" aria-labelledby="blog-faq-heading">
              {BLOG_FAQS.map((faq) => (
                <details key={faq.q} className="blog-faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="blog-bottom-band">
          <div><span className="blog-kicker">Make the next decision clearer</span><h2>From updates to support options</h2><p>Understand a change, prepare your questions, then compare providers and public-register information for your area.</p></div>
          <div className="blog-bottom-actions"><Link to="/find-a-provider">Find a provider</Link><Link to="/locations">Browse by location</Link><button type="button" onClick={() => openMatchModal()}>Get matched, free</button></div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}
