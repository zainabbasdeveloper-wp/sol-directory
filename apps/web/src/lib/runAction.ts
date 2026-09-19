/**
 * One shared interpreter for every WordPress-controlled button/link
 * (ACF "URL/Action" fields on services, service-area pages and mega
 * menu CTAs). Previously each page re-implemented this slightly
 * differently, and WordPressCPTPage passed a no-op `navigate`, so any
 * button pointing at a path silently did nothing.
 *
 * Accepted values:
 *  - an action key: 'get_matched' | 'find_providers' -> opens the wizard
 *  - '#anchor'                                       -> smooth-scrolls
 *  - 'https://…' / 'mailto:' / 'tel:'                -> real navigation
 *  - '/path'                                         -> client-side route
 */
export interface ActionDeps {
  openMatchModal: () => void;
  navigate: (path: string) => void;
}

export const MATCH_ACTIONS = new Set(['get_matched', 'find_providers']);

export function runAction(value: string | undefined | null, deps: ActionDeps, opts?: { newTab?: boolean }): void {
  const v = (value ?? '').trim();
  if (!v) return;

  if (MATCH_ACTIONS.has(v)) { deps.openMatchModal(); return; }

  if (v.startsWith('#')) {
    document.getElementById(v.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (/^(https?:|mailto:|tel:)/i.test(v)) {
    if (opts?.newTab) window.open(v, '_blank', 'noopener,noreferrer');
    else window.location.href = v;
    return;
  }

  // Relative path from WordPress — tolerate a missing leading slash.
  deps.navigate(v.startsWith('/') ? v : `/${v}`);
}
