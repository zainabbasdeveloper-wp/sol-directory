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
  // their staff's clearances are what's being verified. Allied
  // Health and participants aren't being screened, so showing them
  // this line would be legally meaningless for their account type.
  showClearanceConsent: boolean;
  // Whether this account type can be chosen on the public signup page.
  // 'participant' is retired for NEW registrations (families and
  // participants use the free "Get matched" request instead of an account);
  // existing participant accounts still sign in, so the type stays here.
  availableForSignup: boolean;
}

// Single source of truth for account-type behavior across signup,
// login, and post-auth routing. Extracted verbatim where the wording
// is copy; postSignupRoute/showClearanceConsent are the only fields
// that drive real application logic.
//
// Internal role keys ('worker', 'coordinator', 'participant') stay
// unchanged for backward compatibility with existing accounts and
// the database schema — only the user-facing title/labels changed
// (NDIS Worker terminology confirmed already correct; 'Support
// coordinator' -> 'Allied Health'; 'Participant or family' ->
// 'Participant').
export const ACCOUNT_TYPES: AccountType[] = [
  {
    key: 'worker',
    title: 'NDIS Worker',
    desc: 'Support workers, nurses and allied health assistants who want to be found and contacted for shifts.',
    meta: 'Builds a searchable worker listing',
    signupHeading: 'Create your worker account',
    signupCta: 'Create worker account →',
    // Workers can't access /workers themselves (that's the directory
    // OTHER roles use to find them) — /dashboard is their real home.
    postSignupRoute: '/dashboard',
    showClearanceConsent: true,
    availableForSignup: true,
  },
  {
    key: 'provider',
    title: 'Provider',
    desc: 'Registered or unregistered providers, including sole-practitioner allied health, listing their services and coverage.',
    meta: 'Provider profile and referrals',
    signupHeading: 'Create your provider account',
    signupCta: 'Create provider account →',
    postSignupRoute: '/onboarding',
    showClearanceConsent: true,
    availableForSignup: true,
  },
  {
    key: 'coordinator',
    title: 'Allied Health',
    desc: 'Allied health professionals and coordinators who search for providers and refer the people they support.',
    meta: 'Search, shortlist and refer',
    signupHeading: 'Create your Allied Health account',
    signupCta: 'Create Allied Health account →',
    // /workers now requires admin or a pro-plan provider — Allied
    // Health lost access to it. Their real home is the provider
    // directory.
    postSignupRoute: '/find-providers',
    showClearanceConsent: false,
    availableForSignup: true,
  },
  {
    key: 'participant',
    title: 'Participant',
    desc: 'Participants hiring support directly for themselves or someone they care for.',
    meta: 'Search and request contact',
    signupHeading: 'Create your account',
    signupCta: 'Create account →',
    postSignupRoute: '/find-providers',
    showClearanceConsent: false,
    availableForSignup: false,
  },
];

/** Account types offered on the public signup page. */
export const SIGNUP_ACCOUNT_TYPES = ACCOUNT_TYPES.filter((a) => a.availableForSignup);

export function getAccountType(role: Role): AccountType {
  return ACCOUNT_TYPES.find((a) => a.key === role) ?? ACCOUNT_TYPES[0];
}
