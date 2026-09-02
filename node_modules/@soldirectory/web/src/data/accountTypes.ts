import type { Role } from '@soldirectory/shared-types';

export interface AccountType {
  key: Role;
  title: string;
  desc: string;
  meta: string;
}

// Extracted verbatim from SolDirectory Workers.dc.html's ACCOUNT_TYPES
// constant. Per CLAUDE.md: "Do not rewrite copy."
export const ACCOUNT_TYPES: AccountType[] = [
  {
    key: 'worker',
    title: 'NDIS worker',
    desc: 'Support workers, nurses and allied health assistants who want to be found and contacted for shifts.',
    meta: 'Builds a searchable worker listing',
  },
  {
    key: 'provider',
    title: 'Provider organisation',
    desc: 'Registered or unregistered providers listing a business, its services and its coverage.',
    meta: 'Business profile and staff accounts',
  },
  {
    key: 'coordinator',
    title: 'Support coordinator',
    desc: 'Coordinators and plan managers placing participants with workers and providers.',
    meta: 'Search, shortlist and refer',
  },
  {
    key: 'participant',
    title: 'Participant or family',
    desc: 'Participants, families and carers hiring support directly for themselves or someone they care for.',
    meta: 'Search and request contact',
  },
];
