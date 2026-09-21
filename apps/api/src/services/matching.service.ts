import type { LeadDoc } from '../models/Lead.js';
import type { ProviderDoc } from '../models/Provider.js';

// Weighted match scoring between a lead (participant request) and a
// provider. No existing matching algorithm was found anywhere in
// this codebase to extend, so these weights are the ones your own
// spec proposed — they're a named constant specifically so they're
// easy to find and tune later, not buried in the calculation.
export const MATCH_WEIGHTS = {
  funding: 0.25,
  service: 0.30,
  condition: 0.25,
  location: 0.10,
  availability: 0.10,
} as const;

export interface MatchBreakdown {
  providerId: string;
  score: number; // 0-100
  breakdown: {
    funding: { score: number; matched: boolean };
    service: { score: number; matched: boolean };
    condition: { score: number; matchedCount: number; requiredCount: number; matchedConditions: string[] };
    location: { score: number; matched: boolean };
    availability: { score: number; status: string };
  };
}

function scoreFunding(lead: LeadDoc, provider: ProviderDoc): { score: number; matched: boolean } {
  // A non-NDIS lead (Aged Care, Private, DVA, etc.) never has this
  // set — the wizard only asks NDIS plan-management style when the
  // broader funding type is 'NDIS'. That's genuinely "no data to
  // compare" here, not a missing value to treat as non-matching, so
  // this dimension is neutral (full score) rather than 0 — same
  // principle scoreCondition already uses when a lead has no
  // condition requirements at all.
  if (!lead.funding) return { score: 100, matched: false };
  const matched = (provider.acceptedFunding ?? []).includes(lead.funding);
  return { score: matched ? 100 : 0, matched };
}

// The wizard offers "Not sure yet" for the service step. That's "any
// service", not "a service nobody provides" — score it neutral so
// providers aren't all zeroed on the heaviest-weighted factor.
const SERVICE_NOT_SURE = 'not sure yet';

function scoreService(lead: LeadDoc, provider: ProviderDoc): { score: number; matched: boolean } {
  if ((lead.need ?? '').trim().toLowerCase() === SERVICE_NOT_SURE) return { score: 50, matched: false };
  const matched = (provider.registrationGroups ?? []).some(
    (g) => g.toLowerCase() === lead.need.toLowerCase()
  );
  return { score: matched ? 100 : 0, matched };
}

function scoreCondition(lead: LeadDoc, provider: ProviderDoc) {
  const required = lead.conditions ?? [];
  const providerConditions = new Set((provider.conditionExperience ?? []).map((c) => c.toLowerCase()));
  const matchedConditions = required.filter((c) => providerConditions.has(c.toLowerCase()));
  // No conditions specified on the lead means condition compatibility
  // isn't a differentiator for this match — full score rather than
  // penalizing a provider for something the participant didn't ask
  // about.
  const score = required.length === 0 ? 100 : Math.round((matchedConditions.length / required.length) * 100);
  return { score, matchedCount: matchedConditions.length, requiredCount: required.length, matchedConditions };
}

// Great-circle distance in km between two [lng, lat] points.
function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[1] - a[1]);
  const dLng = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function scoreLocation(lead: LeadDoc, provider: ProviderDoc): { score: number; matched: boolean } {
  const suburb = lead.suburb?.trim().toLowerCase();
  const matched = !!suburb && (provider.serviceSuburbs ?? []).some((s) => s.trim().toLowerCase() === suburb);
  if (matched) return { score: 100, matched: true };

  // Partial credit if within travel radius but not a listed suburb —
  // still real signal, just weaker than an exact suburb match. Distance
  // is measured between the lead's geocoded point and the provider's
  // real coordinates; lead.distanceKm (a field nothing in the app ever
  // populated) is kept only as a fallback.
  const leadPoint = lead.location?.coordinates as [number, number] | undefined;
  const providerPoint = provider.location?.coordinates as [number, number] | undefined;
  const km = leadPoint?.length === 2 && providerPoint?.length === 2 ? distanceKm(leadPoint, providerPoint) : lead.distanceKm;
  if (provider.travelRadiusKm && km != null && km <= provider.travelRadiusKm) {
    return { score: 60, matched: false };
  }
  return { score: 0, matched: false };
}

function scoreAvailability(provider: ProviderDoc): { score: number; status: string } {
  const map: Record<string, number> = { 'Open to referrals': 100, 'Limited capacity': 50, 'Waitlist only': 20, Closed: 0 };
  return { score: map[provider.intakeStatus] ?? 0, status: provider.intakeStatus };
}

// A match is only worth notifying/showing a provider about above this
// score...
export const MATCH_THRESHOLD = 40;

/**
 * ...AND only if the provider can actually reach the family. Location is
 * only 10% of the weighted score, so on score alone a Bankstown provider
 * scored ~90 for a Melbourne enquiry (right service, right funding, open
 * to referrals) and got notified. Location is therefore a gate, not just
 * a weight: the suburb must be one they list, or the family must be
 * inside their travel radius.
 */
export function isGenuineMatch(result: { score: number; breakdown: { location: { score: number } } }): boolean {
  return result.score >= MATCH_THRESHOLD && result.breakdown.location.score > 0;
}

/**
 * Computes a 0-100 match score plus a full breakdown. This is a
 * ranking signal to help a participant/admin compare options — not
 * a clinical suitability claim. The breakdown is returned so the UI
 * can show *why* a provider ranked where it did (e.g. "no condition
 * experience for Low vision") rather than a bare unexplained number.
 */
export function scoreMatch(lead: LeadDoc, provider: ProviderDoc): MatchBreakdown {
  const funding = scoreFunding(lead, provider);
  const service = scoreService(lead, provider);
  const condition = scoreCondition(lead, provider);
  const location = scoreLocation(lead, provider);
  const availability = scoreAvailability(provider);

  const score = Math.round(
    funding.score * MATCH_WEIGHTS.funding +
    service.score * MATCH_WEIGHTS.service +
    condition.score * MATCH_WEIGHTS.condition +
    location.score * MATCH_WEIGHTS.location +
    availability.score * MATCH_WEIGHTS.availability
  );

  return {
    providerId: String(provider._id),
    score,
    breakdown: {
      funding,
      service,
      condition: { score: condition.score, matchedCount: condition.matchedCount, requiredCount: condition.requiredCount, matchedConditions: condition.matchedConditions },
      location,
      availability,
    },
  };
}
