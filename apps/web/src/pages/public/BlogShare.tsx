import { useState } from 'react';

interface Props {
  url: string;
  title: string;
  /** "bar" is the compact row under the headline; "panel" is the larger one at the end of the article. */
  variant?: 'bar' | 'panel';
}

const ICON_PROPS = { width: 18, height: 18, viewBox: '0 0 24 24', 'aria-hidden': true as const, focusable: false as const };

const Icons = {
  facebook: <svg {...ICON_PROPS} fill="currentColor"><path d="M13.5 22v-8.2h2.8l.5-3.4h-3.3V8.3c0-1 .4-1.7 1.8-1.7h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.5 0-4.2 1.5-4.2 4.3v2.6H7.5v3.4h2.8V22h3.2z" /></svg>,
  x: <svg {...ICON_PROPS} fill="currentColor"><path d="M17.7 3h3.1l-6.8 7.7L22 21h-6.3l-4.9-6.4L5.2 21H2.1l7.3-8.3L2 3h6.4l4.4 5.9L17.7 3zm-1.1 16.2h1.7L7.5 4.7H5.7l10.9 14.5z" /></svg>,
  linkedin: <svg {...ICON_PROPS} fill="currentColor"><path d="M4.2 9h3.6v11.5H4.2V9zm1.8-5.5a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM10 9h3.4v1.6h.1c.5-.9 1.6-1.9 3.4-1.9 3.6 0 4.3 2.4 4.3 5.5v6.3h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H10V9z" /></svg>,
  whatsapp: <svg {...ICON_PROPS} fill="currentColor"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2zm5.4 13.9c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.2-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.3.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.2.5.2.5.4.1.2.1.8-.1 1.4z" /></svg>,
  email: <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7.5 8.5 6 8.5-6" /></svg>,
  link: <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1" /></svg>,
  check: <svg {...ICON_PROPS} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
};

/** Real share links — each opens that network's own share page in a new tab; nothing is sent from here. */
export default function BlogShare({ url, title, variant = 'bar' }: Props) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const targets: { key: string; label: string; href: string; icon: JSX.Element }[] = [
    { key: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: Icons.facebook },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, icon: Icons.x },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: Icons.linkedin },
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}`, icon: Icons.whatsapp },
    { key: 'email', label: 'Email', href: `mailto:?subject=${t}&body=${t}%0A${u}`, icon: Icons.email },
  ];

  function copy() {
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2200); }).catch(() => {});
  }

  return (
    <div className={`blog-share blog-share--${variant}`} role="group" aria-label="Share this article">
      {variant === 'panel' && <p className="blog-share-title">Found this useful? Share it.</p>}
      <div className="blog-share-row">
        {variant === 'bar' && <span className="blog-share-label">Share</span>}
        {targets.map((target) => (
          <a
            key={target.key}
            className={`blog-share-btn blog-share-btn--${target.key}`}
            href={target.href}
            {...(target.key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
            aria-label={`Share on ${target.label}`}
            title={`Share on ${target.label}`}
          >
            {target.icon}
            {variant === 'panel' && <span>{target.label}</span>}
          </a>
        ))}
        <button type="button" className={`blog-share-btn blog-share-btn--copy${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy link" title="Copy link">
          {copied ? Icons.check : Icons.link}
          <span className={variant === 'panel' ? '' : 'blog-share-copy-text'}>{copied ? 'Copied' : 'Copy link'}</span>
        </button>
        {canNativeShare && (
          <button type="button" className="blog-share-btn blog-share-btn--native" onClick={() => { navigator.share({ title, url }).catch(() => {}); }}>
            <span>Share…</span>
          </button>
        )}
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</span>
    </div>
  );
}
