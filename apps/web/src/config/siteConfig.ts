/**
 * Public contact/legal details shown in the header and footer.
 *
 * These were previously hardcoded to made-up values (a 1800 number, a
 * Sydney street address, a company name) that don't belong to the
 * business. They now come ONLY from environment variables and render
 * only when set — a blank value simply hides that line, so the site
 * never shows contact details nobody actually owns.
 *
 * Set in apps/web/.env (see .env.example):
 *   VITE_CONTACT_EMAIL, VITE_CONTACT_PHONE, VITE_CONTACT_ADDRESS,
 *   VITE_LEGAL_ENTITY, VITE_SUPPORT_HOURS
 */
const env = (import.meta as any).env ?? {};
const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

export const siteConfig = {
  contactEmail: clean(env.VITE_CONTACT_EMAIL),
  contactPhone: clean(env.VITE_CONTACT_PHONE),
  contactAddress: clean(env.VITE_CONTACT_ADDRESS),
  legalEntity: clean(env.VITE_LEGAL_ENTITY),
  supportHours: clean(env.VITE_SUPPORT_HOURS),
};

/** tel: links want digits only. */
export const phoneHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`;
