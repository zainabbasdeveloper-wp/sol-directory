import User from '../models/User.js';

/**
 * SMS via Twilio's REST API (developer brief: SMS for new-enquiry alerts
 * and the weekly capacity prompt). Deliberately dependency-free — one
 * form-encoded POST, so there's no SDK to install or keep patched.
 *
 * INERT UNTIL CONFIGURED: with no TWILIO_* env vars every call is a
 * silent no-op that resolves false, so the rest of the platform behaves
 * exactly as it did before SMS existed. Same failure-tolerant contract as
 * EmailService/geocoding: callers fire-and-forget, a failed text never
 * fails the request that triggered it.
 *
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN   (server-side secrets only)
 *   TWILIO_FROM_NUMBER  or  TWILIO_MESSAGING_SERVICE_SID
 *
 * Consent: providers are texted only if they've explicitly switched on
 * Provider.smsNotifications (Spam Act 2003 — consent + a way to stop).
 */
const TIMEOUT_MS = 8000;

/** Australian mobile -> E.164 (+614XXXXXXXX). null for anything that isn't one. */
export function normaliseAuMobile(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let n = raw.replace(/[\s\-().]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0')) n = `61${n.slice(1)}`;
  return /^614\d{8}$/.test(n) ? `+${n}` : null;
}

function config() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !messagingServiceSid)) return null;
  return { sid, token, from, messagingServiceSid };
}

export const SmsService = {
  isConfigured(): boolean {
    return config() !== null;
  },

  /** Resolves true if Twilio accepted the message; false on any problem (never throws). */
  async send(to: string, body: string): Promise<boolean> {
    const cfg = config();
    if (!cfg) return false;
    const e164 = normaliseAuMobile(to);
    if (!e164) return false;

    const form = new URLSearchParams({ To: e164, Body: body });
    if (cfg.messagingServiceSid) form.set('MessagingServiceSid', cfg.messagingServiceSid);
    else form.set('From', cfg.from!);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
        signal: controller.signal,
      });
      if (!res.ok) {
        console.error(`[sms] Twilio rejected message (${res.status}):`, (await res.text().catch(() => '')).slice(0, 200));
        return false;
      }
      return true;
    } catch (err) {
      console.error('[sms] send failed:', err instanceof Error ? err.message : err);
      return false;
    } finally {
      clearTimeout(timer);
    }
  },

  /**
   * Text a provider's account owner — but only if they opted in. The
   * mobile lives on the User (collected at signup), not the Provider.
   */
  async sendToProvider(provider: { userId: unknown; smsNotifications?: boolean }, body: string): Promise<boolean> {
    if (!provider.smsNotifications || !this.isConfigured()) return false;
    const user = await User.findById(provider.userId).select('mobile').lean();
    return this.send(user?.mobile ?? '', body);
  },
};
