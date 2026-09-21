import type { Role } from '@soldirectory/shared-types';

/**
 * Provider profile pages (/providers/:slug) are login-gated to these roles
 * (see AppRoutes). Public pages must only link to a profile when the
 * visitor can actually open it — otherwise anonymous visitors click a
 * provider's name and land on a login screen.
 */
const PROFILE_ROLES: Role[] = ['coordinator', 'participant', 'admin'];

export function canViewProviderProfiles(role: Role | undefined | null): boolean {
  return !!role && PROFILE_ROLES.includes(role);
}
