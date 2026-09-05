import type { Role } from '@soldirectory/shared-types';

export interface AccountType {
  key: Role;
  title: string;
  desc: string;
  meta: string;
  signupHeading: string;
  signupCta: string;
  // Only provider has a real onboarding flow in this codebase today.
  // Everyone else goes straight to their destination — there is no
  // invented per-role onboarding route.
  postSignupRoute: string;
  // Clearance-verification consent only makes sense for people whose
  // own clearances get checked — workers directly, providers because
  // their staff's clearances are what's being verified. Coordinators
  // and participants aren't being screened, so showing them this line
  // would be legally meaningless for their account type.
  showClearanceConsent: boolean;
}

// Single source of truth for account-type behavior across signup,
// login, and post-auth routing. Extracted verbatim where the wording
// is copy; postSignupRoute/showClearanceConsent are the only fields
// that drive real application logic.
export const ACCOUNT_TYPES: AccountType[] = [
  {
    key: 'worker',
    title: 'NDIS worker',
    desc: 'Support workers, nurses and allied health assistants who want to be found and contacted for shifts.',
    meta: 'Builds a searchable worker listing',
    signupHeading: 'Create your worker account',
    signupCta: 'Create worker account →',
    postSignupRoute: '/workers',
    showClearanceConsent: true,
  },
  {
    key: 'provider',
    title: 'Provider organisation',
    desc: 'Registered or unregistered providers listing a business, its services and its coverage.',
    meta: 'Business profile and staff accounts',
    signupHeading: 'Create your provider account',
    signupCta: 'Create provider account →',
    postSignupRoute: '/onboarding',
    showClearanceConsent: true,
  },
  {
    key: 'coordinator',
    title: 'Support coordinator',
    desc: 'Coordinators and plan managers placing participants with workers and providers.',
    meta: 'Search, shortlist and refer',
    signupHeading: 'Create your coordinator account',
    signupCta: 'Create coordinator account →',
    postSignupRoute: '/workers',
    showClearanceConsent: false,
  },
  {
    key: 'participant',
    title: 'Participant or family',
    desc: 'Participants, families and carers hiring support directly for themselves or someone they care for.',
    meta: 'Search and request contact',
    signupHeading: 'Create your account',
    signupCta: 'Create account →',
    postSignupRoute: '/workers',
    showClearanceConsent: false,
  },
];

export function getAccountType(role: Role): AccountType {
  return ACCOUNT_TYPES.find((a) => a.key === role) ?? ACCOUNT_TYPES[0];
}
