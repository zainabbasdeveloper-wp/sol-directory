export type Role = 'worker' | 'provider' | 'coordinator' | 'participant' | 'admin';

export type ClearanceStatus = 'verified' | 'flagged' | 'unmarked';

export interface ClearanceMeta {
  name: string; // e.g. "NDIS Worker Check" — statutory term, do not rename
  issuingBody?: string;
  referenceNumber?: string;
  expiry?: string | null; // ISO date
  status: ClearanceStatus;
  // Documents themselves never appear here — see DocumentAsset.
}

export interface DocumentAsset {
  id: string;
  ownerId: string; // Worker or Provider id
  kind: string; // 'ndis_worker_check' | 'police_check' | 'insurance_pl' | ...
  contentType: string;
  s3Key: string; // never sent to the client directly
  uploadedAt: string;
}

/**
 * The masked shape is what an anonymous/non-unlocked directory
 * search or profile view returns. It is a DISTINCT TYPE from
 * WorkerUnlocked on purpose — lastName/email/phone don't exist on
 * this type at all, so a route that accidentally tries to return
 * them on a masked response fails to compile rather than fails at
 * runtime in front of a participant.
 */
export interface WorkerMasked {
  id: string;
  firstName: string;
  lastInitial: string;
  role: string;
  employer: string;
  yearsExperience: string;
  suburb: string;
  gender: string;
  hasCar: boolean;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  services: string[];
  languages: string[];
  conditionExperience: string[];
  availability: string[];
  availableDays: string[];
  availabilityNote: string;
  bio: string;
  feedback: { text: string; by: string }[];
}

export interface WorkerUnlocked extends WorkerMasked {
  lastName: string;
  email: string;
  phone: string;
}

export type WorkerProfile = WorkerMasked | WorkerUnlocked;

export function isUnlocked(w: WorkerProfile): w is WorkerUnlocked {
  return 'email' in w;
}

export interface LeadMasked {
  id: string;
  need: string;
  suburb: string;
  distanceKm: number;
  hoursPerWeek: string;
  funding: 'Plan-managed' | 'Self-managed' | 'NDIA-managed';
  status: 'matched' | 'unlocked' | 'closed';
  createdAt: string;
}

export interface LeadUnlocked extends LeadMasked {
  contactName: string;
  contactPhone: string;
  budget: string;
  note: string;
}

export type Lead = LeadMasked | LeadUnlocked;

export function isLeadUnlocked(l: Lead): l is LeadUnlocked {
  return 'contactName' in l;
}

export interface PlanConfig {
  key: 'starter' | 'growth' | 'scale';
  name: string;
  priceCents: number;
  quota: number | null; // null = unlimited
  seats?: number;
  features: string[];
  popular?: boolean;
}

export interface Provider {
  id: string;
  legalEntityName: string;
  abn: string;
  tradingName: string;
  registrationGroups: string[];
  intakeEmail: string;
  serviceSuburbs: string[];
  travelRadiusKm: number;
  weeklyCapacityHours: number;
  intakeStatus: 'Open to referrals' | 'Limited capacity' | 'Waitlist only' | 'Closed';
  plan: PlanConfig['key'];
  leadUnlocksUsedThisPeriod: number;
}

export interface OnboardingStep {
  key: 'org' | 'insurance' | 'areas' | 'team' | 'policy' | 'billing';
  title: string;
  complete: boolean;
  data?: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  workerId: string;
  what: string;
  who: string;
  at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface WorkerSearchQuery {
  service?: string;
  suburb?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  language?: string;
  gender?: string;
  condition?: string;
  minRate?: number;
  maxRate?: number;
  minRating?: number;
  q?: string;
  page?: number;
  limit?: number;
}
