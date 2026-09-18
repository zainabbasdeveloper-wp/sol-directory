import nodemailer, { type Transporter } from 'nodemailer';
import {
  leadConfirmationTemplate, providerMatchedTemplate, providerResponseTemplate,
  providerLeadNotificationTemplate, adminNotificationTemplate, renderEmailLayout,
  passwordResetTemplate, passwordChangedTemplate, verificationResultTemplate, welcomeTemplate,
  capacityConfirmationTemplate,
} from './emailTemplates.js';
import EmailLog from '../models/EmailLog.js';

// Backend-only. Credentials come from environment variables, never
// hardcoded and never sent to the frontend — nothing in this file
// is imported by anything in apps/web.
//
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM must be
// set in the API's .env. If they're missing, sendMail logs a clear
// warning and returns false rather than throwing — matching the
// reliability requirement that email failures must never break the
// operation that triggered them (e.g. lead submission).

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    console.warn('[EmailService] SMTP_HOST/PORT/USER/PASSWORD not fully configured — emails will be logged, not sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * The one real send path every method below funnels through.
 * Never throws — logs failures instead, since a failed email must
 * never be allowed to fail the request that triggered it (per the
 * "lead submission isn't lost if email sending fails" requirement).
 * Returns true/false so callers CAN check and retry/log further up
 * the stack if they want to, without being forced to.
 */
async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM || 'SolDirectory <no-reply@soldirectory.example>';

  if (!t) {
    console.log(`[EmailService] (not sent — SMTP not configured) To: ${to} | Subject: ${subject}`);
    EmailLog.create({ to, subject, status: 'skipped_not_configured' }).catch(() => {});
    return false;
  }

  try {
    await t.sendMail({ from, to, subject, html });
    EmailLog.create({ to, subject, status: 'sent' }).catch(() => {});
    return true;
  } catch (err) {
    // Logged, not thrown. TODO: push failed sends to a retry
    // queue/table if this needs stronger reliability than
    // best-effort — no existing job queue was found in this
    // codebase to hook into.
    console.error(`[EmailService] Failed to send "${subject}" to ${to}:`, err);
    EmailLog.create({ to, subject, status: 'failed', error: (err as Error).message }).catch(() => {});
    return false;
  }
}

export const EmailService = {
  async sendLeadConfirmation(to: string, requestNumber: string, need: string, trackingUrl?: string) {
    const { subject, html } = leadConfirmationTemplate({ requestNumber, need, trackingUrl });
    return sendMail(to, subject, html);
  },

  async sendProviderMatchedNotification(to: string, need: string, trackingUrl?: string) {
    const { subject, html } = providerMatchedTemplate({ need, trackingUrl });
    return sendMail(to, subject, html);
  },

  async sendProviderResponseNotification(to: string, providerName: string, trackingUrl?: string) {
    const { subject, html } = providerResponseTemplate({ providerName, trackingUrl });
    return sendMail(to, subject, html);
  },

  async sendContactRequestNotification(to: string, requesterName: string, dashboardUrl?: string) {
    const html = renderEmailLayout({
      preheader: `${requesterName} requested to connect with you`,
      heading: 'New request received',
      bodyHtml: `<p><strong>${requesterName}</strong> has requested a callback from your organisation through SolDirectory. Log in to respond.</p>`,
      ctaLabel: dashboardUrl ? 'View request' : undefined,
      ctaUrl: dashboardUrl,
    });
    return sendMail(to, 'New request received on SolDirectory', html);
  },

  async sendProviderLeadNotification(to: string, need: string, suburb: string, dashboardUrl?: string) {
    const { subject, html } = providerLeadNotificationTemplate({ need, suburb, dashboardUrl });
    return sendMail(to, subject, html);
  },

  async sendCapacityConfirmation(to: string, providerName: string, confirmUrl: string) {
    const { subject, html } = capacityConfirmationTemplate({ providerName, confirmUrl });
    return sendMail(to, subject, html);
  },

  async sendAdminNotification(to: string, title: string, message: string, dashboardUrl?: string) {
    const { subject, html } = adminNotificationTemplate({ title, message, dashboardUrl });
    return sendMail(to, subject, html);
  },

  async sendPasswordReset(to: string, resetUrl: string) {
    const { subject, html } = passwordResetTemplate({ resetUrl });
    return sendMail(to, subject, html);
  },

  async sendPasswordChanged(to: string) {
    const { subject, html } = passwordChangedTemplate();
    return sendMail(to, subject, html);
  },

  async sendVerificationResult(to: string, approved: boolean, reason?: string) {
    const { subject, html } = verificationResultTemplate({ approved, reason });
    return sendMail(to, subject, html);
  },

  async sendWelcome(to: string, name: string) {
    const { subject, html } = welcomeTemplate({ name });
    return sendMail(to, subject, html);
  },
};
