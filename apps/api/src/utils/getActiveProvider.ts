import Provider, { type ProviderDoc } from '../models/Provider.js';

/**
 * SECURITY + RELIABILITY: the one correct way to look up "the
 * provider record for the currently authenticated user" anywhere in
 * this codebase.
 *
 * Two real issues found during a security audit, fixed together here:
 *
 * 1. Provider.findOne({ userId }) was being called directly, without
 *    an accountStatus filter, in six places across four controllers
 *    (leads, onboarding, referrals, workers). JWTs are valid for 7
 *    days with no revocation list, so without this filter, a
 *    provider suspended by an admin keeps full access — to leads,
 *    onboarding edits, document upload URLs, the worker directory —
 *    for up to 7 more days.
 *
 * 2. This codebase has no express-async-errors (or equivalent)
 *    anywhere — an error thrown inside an async route handler here
 *    is an unhandled promise rejection, not a clean response. It can
 *    hang the request or, depending on Node version, crash the whole
 *    process. So this helper returns null on failure instead of
 *    throwing — every caller must explicitly check and respond, the
 *    same safe pattern already used elsewhere in this codebase
 *    (e.g. onboarding.controller.ts's inline checks before this
 *    helper existed).
 */
export async function getActiveProviderForUser(userId: string): Promise<ProviderDoc | null> {
  return Provider.findOne({ userId, accountStatus: 'active' });
}
