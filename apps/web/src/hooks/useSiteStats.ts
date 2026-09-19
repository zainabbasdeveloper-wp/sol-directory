import { useEffect, useState } from 'react';
import { getPublicStats, type PublicStats } from '../api/resources';

// One fetch per page load, shared by every component that shows a
// site-wide number. Never throws: a stats failure must not break the
// marketing pages — callers just get null and hide the stat.
let inflight: Promise<PublicStats | null> | null = null;

function fetchOnce(): Promise<PublicStats | null> {
  if (!inflight) inflight = getPublicStats().catch(() => null);
  return inflight;
}

export function useSiteStats(): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null);
  useEffect(() => {
    let alive = true;
    fetchOnce().then((s) => { if (alive) setStats(s); });
    return () => { alive = false; };
  }, []);
  return stats;
}
