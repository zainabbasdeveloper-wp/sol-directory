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
  const matched = (provider.acceptedFunding ?? []).includes(lead.funding);
  return { score: matched ? 100 : 0, matched };
}

function scoreService(lead: LeadDoc, provider: ProviderDoc): { score: number; matched: boolean } {
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

function scoreLocation(lead: LeadDoc, provider: ProviderDoc): { score: number; matched: boolean } {
  const matched = (provider.serviceSuburbs ?? []).some((s) => s.toLowerCase() === lead.suburb?.toLowerCase());
  // Partial credit if within travel radius but not a listed suburb —
  // still real signal, just weaker than an exact suburb match.
  if (matched) return { score: 100, matched: true };
  if (provider.travelRadiusKm && lead.distanceKm != null && lead.distanceKm <= provider.travelRadiusKm) {
    return { score: 60, matched: false };
  }
  return { score: 0, matched: false };
}

function scoreAvailability(provider: ProviderDoc): { score: number; status: string } {
  const map: Record<string, number> = { 'Open to referrals': 100, 'Limited capacity': 50, 'Waitlist only': 20, Closed: 0 };
  return { score: map[provider.intakeStatus] ?? 0, status: provider.intakeStatus };
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
