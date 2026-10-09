import { useEffect, useState, type FormEvent } from 'react';
import DOMPurify from 'dompurify';
import { Link, useParams } from 'react-router-dom';
import { bannerFor } from '../../data/bannerImages';
import { getBlogCategories, getBlogPost, getBlogPosts, type WPBlogPost, type WPTerm } from '../../api/wordpressApi';
import { applySeoTags, setJsonLd } from '../../lib/seo';
import { PublicFooter, PublicHeader } from './PublicLayout';
import './BlogPage.css';

const SITE_ORIGIN = () => window.location.origin;
const BLOG_PAGE_SIZE = 9;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function postImage(post: WPBlogPost): string {
  return post.featuredImage?.url || bannerFor({ text: post.title, section: 'guides' });
}

function BlogCard({ post, featured = false }: { post: WPBlogPost; featured?: boolean }) {
  const category = post.categories[0]?.name || 'Practical guidance';
  return (
    <article className={`blog-card${featured ? ' blog-card-featured' : ''}`}>
      <Link className="blog-card-image-link" to={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
        <img className="blog-card-image" src={postImage(post)} alt={post.featuredImage?.alt || ''} loading="lazy" />
      </Link>
      <div className="blog-card-copy">
        <div className="blog-card-meta"><span>{category}</span><time dateTime={post.date}>{formatDate(post.date)}</time></div>
        <h2><Link to={`/blog/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt || post.seo.description}</p>
        <Link className="blog-read-link" to={`/blog/${post.slug}`}>Read article <span aria-hidden="true">→</span></Link>
      </div>
    </article>
  );
}

export default function BlogPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [posts, setPosts] = useState<WPBlogPost[]>([]);
  const [categories, setCategories] = useState<WPTerm[]>([]);
  const [article, setArticle] = useState<WPBlogPost | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let current = true;
    setLoading(true);
    setError('');
    setArticle(null);
    getBlogPost(slug)
      .then((result) => { if (current) setArticle(result); })
      .catch(() => { if (current) setError('Unable to load this article right now. Please try again shortly.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [slug]);

  useEffect(() => {
    if (slug) return;
    let current = true;
    setLoading(page === 1);
    setLoadingMore(page > 1);
    setError('');
    Promise.all([
      getBlogPosts({ page, search: submittedQuery, category: categoryId }),
      page === 1 ? getBlogCategories().catch(() => []) : Promise.resolve(categories),
    ])
      .then(([result, availableCategories]) => {
        if (!current) return;
        setPosts((existing) => page === 1 ? result.items : [...existing, ...result.items]);
        setTotalPages(result.totalPages);
        setCategories(availableCategories);
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
        noindex: article.seo.noindex,
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
        ...(article.featuredImage?.url ? { image: [article.featuredImage.url] } : {}),
      });
      return () => setJsonLd('blog-post', null);
    }

    applySeoTags({
      title: 'NDIS updates and practical insights | SolDirectory',
      description: 'Independent explainers on NDIS changes, provider responsibilities and practical support decisions, with links to official sources.',
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
    return () => setJsonLd('blog-archive', null);
  }, [slug, article, posts]);

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
    return (
      <>
        <PublicHeader />
        <main className="blog-article-page">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/blog">Updates & insights</Link><span>/</span><span>{article?.title || 'Article'}</span></nav>
          {loading ? <p className="blog-state">Loading article…</p> : error ? <p className="blog-state" role="alert">{error}</p> : !article ? (
            <section className="blog-not-found"><span className="blog-kicker">SolDirectory journal</span><h1>Article not found</h1><p>This article may have been unpublished or moved.</p><Link className="blog-primary-link" to="/blog">Browse latest updates</Link></section>
          ) : (
            <article className="blog-article">
              <header className="blog-article-header">
                <Link className="blog-back-link" to="/blog">← All updates</Link>
                <div className="blog-article-categories">{article.categories.map((category) => <span key={category.id}>{category.name}</span>)}</div>
                <h1>{article.title}</h1>
                {article.excerpt && <p className="blog-article-deck">{article.excerpt}</p>}
                <div className="blog-article-byline"><span>{article.authorName}</span><span aria-hidden="true">·</span><time dateTime={article.date}>{formatDate(article.date)}</time><span aria-hidden="true">·</span><span>{readingMinutes(article.contentHtml)} min read</span></div>
              </header>
              <img className="blog-article-cover" src={postImage(article)} alt={article.featuredImage?.alt || ''} />
              <div className="blog-article-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.contentHtml) }} />
              {article.modified && article.modified !== article.date && <p className="blog-updated">Updated {formatDate(article.modified)}. Check linked official sources for current requirements.</p>}
              <aside className="blog-source-note"><strong>Keep checking the source.</strong><span>NDIS rules, prices and program details can change. Confirm current requirements with the responsible government body before acting.</span><Link to="/guides">Browse practical guides</Link></aside>
            </article>
          )}
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="blog-home">
        <section className="blog-hero">
          <div className="blog-hero-copy">
            <span className="blog-kicker">SolDirectory journal</span>
            <h1>Support changes. Clear answers matter.</h1>
            <p>Independent explainers and practical guidance for people navigating disability and aged care support in Australia.</p>
            <a className="blog-hero-link" href="#latest">Explore the latest <span aria-hidden="true">↓</span></a>
          </div>
          <div className="blog-hero-image-wrap"><img src={bannerFor({ text: 'support coordination community', section: 'guides' })} alt="" /></div>
        </section>

        <section className="blog-disclosure" aria-label="Editorial approach">
          <strong>Independent information, not government advice.</strong>
          <span>We link to official sources and note when guidance was published or updated. Confirm current rules directly with the responsible agency.</span>
        </section>

        <section className="blog-content" id="latest" aria-labelledby="blog-latest-heading">
          <div className="blog-section-heading">
            <div><span className="blog-kicker">The latest</span><h2 id="blog-latest-heading">Updates & insights</h2></div>
            <span className="blog-results-count">{loading ? 'Loading articles' : `${posts.length} articles shown`}</span>
          </div>

          <div className="blog-tools">
            <form className="blog-search" onSubmit={submitSearch} role="search">
              <label className="visually-hidden" htmlFor="blog-search-input">Search articles</label>
              <input id="blog-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search topics, changes or support…" />
              <button type="submit" aria-label="Search articles">Search</button>
            </form>
            <div className="blog-categories" aria-label="Filter by topic">
              <button type="button" className={categoryId === null ? 'is-active' : ''} onClick={() => chooseCategory(null)}>All topics</button>
              {categories.map((category) => <button type="button" key={category.id} className={categoryId === category.id ? 'is-active' : ''} onClick={() => chooseCategory(category.id)}>{category.name}</button>)}
            </div>
          </div>

          {error && <p className="blog-state" role="alert">{error}</p>}
          {loading ? <div className="blog-card-grid" aria-label="Loading articles"><div className="blog-skeleton" /><div className="blog-skeleton" /><div className="blog-skeleton" /></div> : posts.length ? (
            <div className="blog-card-grid">
              {posts.map((post, index) => <BlogCard key={post.id} post={post} featured={page === 1 && index === 0} />)}
            </div>
          ) : !error ? (
            <div className="blog-empty"><h3>No published articles yet</h3><p>New explainers and practical updates will appear here. In the meantime, browse our current guides and official links.</p><Link className="blog-primary-link" to="/guides">Browse guides</Link></div>
          ) : null}

          {posts.length > 0 && page < totalPages && <div className="blog-load-more"><button type="button" onClick={() => setPage((current) => current + 1)} disabled={loadingMore}>{loadingMore ? 'Loading…' : 'Load more articles'}</button></div>}
        </section>

        <section className="blog-bottom-band">
          <div><span className="blog-kicker">Make the next decision clearer</span><h2>From updates to support options</h2><p>Understand a change, prepare your questions, then compare providers and public-register information for your area.</p></div>
          <div className="blog-bottom-actions"><Link to="/guides">Read practical guides</Link><Link to="/find-a-provider">Find a provider</Link></div>
        </section>
      </main>
      <PublicFooter />
    </>
  );
}