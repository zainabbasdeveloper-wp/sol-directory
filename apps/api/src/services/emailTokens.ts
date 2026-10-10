import crypto from 'node:crypto';

/**
 * Stateless, tamper-proof links for unsubscribe: the token is an HMAC of "<kind>:<id>" using the server's own secret,
 * so a link can be built for any lead or listing without storing anything, and nobody can forge one for someone else.
 */
export type UnsubscribeKind = 'lead' | 'listing' | 'track';

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_SECRET or JWT_SECRET must be set to build unsubscribe links.');
  return s;
}

export function signToken(kind: UnsubscribeKind, id: string): string {
  return crypto.createHmac('sha256', secret()).update(`${kind}:${id}`).digest('base64url').slice(0, 32);
}

export function verifyToken(kind: UnsubscribeKind, id: string, token: string): boolean {
  if (!token || token.length !== 32) return false;
  const expected = Buffer.from(signToken(kind, id));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** The public site origin used in every email link (no trailing slash). */
export function siteOrigin(): string {
  return (process.env.CLIENT_ORIGIN || process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

export function unsubscribeUrl(kind: UnsubscribeKind, id: string): string {
  return `${siteOrigin()}/api/email/unsubscribe?kind=${kind}&id=${encodeURIComponent(id)}&t=${signToken(kind, id)}`;
}

/** Who is sending, for the footer of any email that is not a direct reply to the recipient's own action. */
export function senderIdentityHtml(): string {
  const name = process.env.SENDER_LEGAL_NAME || 'SolDirectory';
  const address = process.env.SENDER_ADDRESS_LINE;
  const contact = process.env.SENDER_CONTACT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL;
  return [
    `Sent by ${name}${address ? `, ${address}` : ''}.`,
    contact ? `Contact: ${contact}.` : '',
  ].filter(Boolean).join(' ');
}
