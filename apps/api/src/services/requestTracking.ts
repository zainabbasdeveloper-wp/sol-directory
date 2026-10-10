import { signToken, verifyToken, siteOrigin } from './emailTokens.js';

/**
 * Everything the person who made a request can see about it: a plain timeline and the status of each provider.
 * Built from the Lead and its LeadMatch rows; nothing here ever includes another person's contact details.
 */

export const trackUrl = (leadId: string) => `${siteOrigin()}/track/${leadId}?t=${signToken('track', leadId)}`;
export const verifyTrackToken = (leadId: string, token: string) => verifyToken('track', leadId, token);

export type ProviderProgress = 'waiting' | 'viewed' | 'responded' | 'declined';

export interface TrackedRequest {
  id: string;
  reference: string;
  createdAt: string;
  need: string;
  suburb?: string;
  state?: string;
  careFor?: string;
  timeframe?: string;
  requestedProvider?: string;
  /** Overall position: 1 received, 2 sent, 3 viewed, 4 responded. */
  stage: 1 | 2 | 3 | 4;
  steps: { key: 'received' | 'sent' | 'viewed' | 'responded'; label: string; detail: string; at?: string; done: boolean }[];
  providers: { name: string; progress: ProviderProgress; at?: string }[];
  note?: string;
  searchUrl: string;
}

const PROGRESS: Record<string, ProviderProgress> = { notified: 'waiting', viewed: 'viewed', contacted: 'responded', declined: 'declined' };

export function buildTrackedRequest(
  lead: any,
  matches: { providerId: unknown; status: string; notifiedAt?: Date; viewedAt?: Date; respondedAt?: Date }[],
  providerNames: Map<string, string>,
): TrackedRequest {
  const reference = String(lead._id).slice(-8).toUpperCase();
  const need = lead.need && !/^not sure yet$/i.test(lead.need) ? lead.need : lead.serviceContext || 'Support';
  const requested: string | undefined = lead.preferredListing?.name || undefined;

  const providers = matches.map((m) => ({
    name: providerNames.get(String(m.providerId)) ?? 'A matched provider',
    progress: PROGRESS[m.status] ?? 'waiting',
    at: (m.respondedAt ?? m.viewedAt ?? m.notifiedAt)?.toISOString(),
  }));
  const anySent = matches.length > 0;
  const viewedTimes = matches.map((m) => m.viewedAt ?? (m.status === 'contacted' ? m.respondedAt : undefined)).filter(Boolean) as Date[];
  const respondedTimes = matches.map((m) => m.respondedAt).filter((d, i) => !!d && matches[i].status === 'contacted') as Date[];
  const earliest = (ds: Date[]) => (ds.length ? new Date(Math.min(...ds.map((d) => d.getTime()))).toISOString() : undefined);
  const viewed = viewedTimes.length > 0 || providers.some((p) => p.progress === 'viewed' || p.progress === 'responded');
  const responded = respondedTimes.length > 0 || providers.some((p) => p.progress === 'responded');

  const who = requested ? requested : anySent ? `${matches.length} matching provider${matches.length === 1 ? '' : 's'}` : 'providers';
  const steps: TrackedRequest['steps'] = [
    { key: 'received', label: 'Request received', detail: 'Your request is with SolDirectory.', at: lead.createdAt?.toISOString?.(), done: true },
    {
      key: 'sent',
      label: requested ? `Sent to ${requested}` : 'Sent to matching providers',
      detail: anySent ? `Shared with ${who}.` : requested ? `Recorded for ${requested}.` : 'We are looking for providers that fit your request.',
      at: earliest(matches.map((m) => m.notifiedAt).filter(Boolean) as Date[]),
      done: anySent || !!requested,
    },
    { key: 'viewed', label: 'A provider has looked at it', detail: viewed ? 'Your request has been opened.' : 'Waiting for a provider to open it.', at: earliest(viewedTimes), done: viewed },
    { key: 'responded', label: 'A provider has taken it up', detail: responded ? 'They may contact you by phone or email.' : 'Providers decide whether and how quickly to follow up.', at: earliest(respondedTimes), done: responded },
  ];
  const stage = (responded ? 4 : viewed ? 3 : anySent || requested ? 2 : 1) as TrackedRequest['stage'];

  const params = new URLSearchParams();
  if (lead.suburb) params.set('suburb', lead.suburb);
  return {
    id: String(lead._id),
    reference,
    createdAt: lead.createdAt?.toISOString?.() ?? new Date().toISOString(),
    need,
    suburb: lead.suburb,
    state: lead.state,
    careFor: lead.careFor,
    timeframe: lead.timeframe,
    requestedProvider: requested,
    stage,
    steps,
    providers,
    note: requested && !anySent
      ? `${requested} does not manage requests through SolDirectory, so we cannot show when they see yours. You can contact them directly, or compare other providers below.`
      : undefined,
    searchUrl: `${siteOrigin()}/find-a-provider${params.toString() ? `?${params}` : ''}`,
  };
}
