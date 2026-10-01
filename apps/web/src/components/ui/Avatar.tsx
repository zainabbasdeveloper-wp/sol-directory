import { useState } from 'react';
import './Avatar.css';

interface AvatarProps {
  /** Photo or logo URL. Without one (or if it fails to load) the initials show instead. */
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  /** "round" for people, "square" for business logos. */
  shape?: 'round' | 'square';
}

export const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

// A small, fixed palette of on-brand gradients (see Avatar.css) so a name
// without a real photo/logo still looks deliberate rather than flat grey —
// deterministic per name (same business always gets the same one), not
// random, so it doesn't shift between page loads or admin vs. public view.
const GRADIENT_COUNT = 6;
function gradientIndexOf(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % GRADIENT_COUNT;
}

/**
 * A photo or logo with an initials fallback. Real images only: when a
 * provider or worker hasn't uploaded one we show their initials, on a
 * deterministic brand-gradient background, rather than a stock photo or
 * a made-up face.
 */
export default function Avatar({ src, name, size = 'md', shape = 'round' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const cls = `avatar avatar-${size} avatar-${shape}`;
  if (src && !failed) {
    return <img className={cls} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <span className={`${cls} avatar-fallback avatar-grad-${gradientIndexOf(name)}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
