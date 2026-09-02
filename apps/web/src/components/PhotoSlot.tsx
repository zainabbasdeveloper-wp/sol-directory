import { useState } from 'react';

type Variant = 'care' | 'meeting' | 'team';

interface PhotoSlotProps {
  src: string; // e.g. "/images/hero.jpg" — drop a real file at this path in /public
  alt: string;
  variant?: Variant;
  className?: string;
}

/**
 * Drop a real photo at /public{src} (e.g. public/images/hero.jpg for
 * src="/images/hero.jpg") and it renders automatically. Until then,
 * shows a finished-looking illustration instead of an empty box or a
 * fabricated stock-photo URL — see README "Photography" section for
 * exact filenames and free-license search terms.
 */
export default function PhotoSlot({ src, alt, variant = 'care', className = '' }: PhotoSlotProps) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>
      <Illustration variant={variant} />
    </div>
  );
}

function Illustration({ variant }: { variant: Variant }) {
  if (variant === 'meeting') {
    return (
      <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="400" fill="#F2F7FF" />
        <path d="M0 260 Q200 200 400 260 L400 400 L0 400 Z" fill="#DCE8FA" />
        <g transform="translate(120,150)">
          <circle cx="30" cy="30" r="26" fill="#1769E0" />
          <path d="M-5 200 Q-5 110 30 90 Q65 110 65 200 Z" fill="#1769E0" />
        </g>
        <g transform="translate(210,150)">
          <circle cx="30" cy="30" r="26" fill="#0B2D5C" />
          <path d="M-5 200 Q-5 110 30 90 Q65 110 65 200 Z" fill="#0B2D5C" />
        </g>
        <rect x="165" y="215" width="70" height="10" rx="5" fill="#2F80ED" />
      </svg>
    );
  }
  if (variant === 'team') {
    return (
      <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="400" fill="#0B2D5C" />
        <circle cx="120" cy="180" r="34" fill="#1769E0" opacity="0.8" />
        <circle cx="210" cy="150" r="34" fill="#2F80ED" opacity="0.8" />
        <circle cx="290" cy="200" r="34" fill="#1769E0" opacity="0.6" />
        <path d="M60 320 Q200 260 340 320 L340 400 L60 400 Z" fill="#123A70" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 400 400" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="400" fill="#F2F7FF" />
      <circle cx="200" cy="140" r="150" fill="#DCE8FA" />
      <g transform="translate(90,190)">
        <circle cx="45" cy="30" r="28" fill="#1769E0" />
        <path d="M0 230 Q0 110 45 95 Q90 110 90 230 Z" fill="#1769E0" />
      </g>
      <g transform="translate(215,150)">
        <circle cx="40" cy="26" r="24" fill="#0B2D5C" />
        <path d="M0 210 Q-6 130 40 116 Q86 130 80 210 Z" fill="#0B2D5C" />
      </g>
      <path d="M140 260 Q200 235 260 260" stroke="#2F80ED" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}
