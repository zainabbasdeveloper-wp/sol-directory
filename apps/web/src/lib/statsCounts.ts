import type { PublicStats } from '../api/resources';

/**
 * Turns real aggregate counts (api /stats/public) into display labels.
 * Every function returns null when there's no real number to show, and
 * callers omit the label — the site never shows a count it can't back.
 */
export function providerCountLabel(n: number | null | undefined): string | null {
  if (!n || n < 1) return null;
  return `${n.toLocaleString('en-AU')} ${n === 1 ? 'provider' : 'providers'}`;
}

export function serviceCount(stats: PublicStats | null, service: string): number | null {
  const n = stats?.providersByService?.[service];
  return n && n > 0 ? n : null;
}

/** Sum of listed providers across the given state abbreviations. */
export function stateGroupCount(stats: PublicStats | null, states: string[]): number | null {
  if (!stats) return null;
  const total = states.reduce((sum, s) => sum + (stats.providersByState?.[s] ?? 0), 0);
  return total > 0 ? total : null;
}
