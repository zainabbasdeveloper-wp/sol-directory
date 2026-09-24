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

/**
 * A photo or logo with an initials fallback. Real images only: when a
 * provider or worker hasn't uploaded one we show their initials rather
 * than a stock photo or a made-up face.
 */
export default function Avatar({ src, name, size = 'md', shape = 'round' }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const cls = `avatar avatar-${size} avatar-${shape}`;
  if (src && !failed) {
    return <img className={cls} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return <span className={`${cls} avatar-fallback`} aria-hidden="true">{initialsOf(name)}</span>;
}
