// Shared branded layout — table-based HTML, since that's still what
// actually renders consistently across real email clients (Outlook
// in particular ignores modern CSS layout). Every specific email
// wraps its content through this function rather than building its
// own <html> document.

const NAVY = '#0B2D5C';
const PRIMARY = '#1769E0';
const BG = '#F5F8FC';
const TEXT_MUTED = '#5A6B84';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderEmailLayout(opts: {
  preheader: string; // hidden preview text shown in inbox lists
  heading: string;
  bodyHtml: string; // pre-built inner HTML — paragraphs, etc.
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl } = opts;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background:${BG}; font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
  <span style="display:none; font-size:1px; color:${BG}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG}; padding: 32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #E8EEF7;">
        <tr>
          <td style="background:${NAVY}; padding:22px 28px;">
            <span style="color:#ffffff; font-size:18px; font-weight:700; letter-spacing:-0.02em;">SolDirectory</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 12px;">
            <h1 style="margin:0 0 16px; font-size:20px; font-weight:700; color:${NAVY};">${heading}</h1>
            <div style="font-size:14.5px; line-height:1.6; color:#10233F;">${bodyHtml}</div>
          </td>
        </tr>
        ${ctaLabel && ctaUrl ? `
        <tr>
          <td style="padding: 4px 28px 28px;">
            <a href="${ctaUrl}" style="display:inline-block; background:${PRIMARY}; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:12px 24px; border-radius:8px;">${ctaLabel}</a>
          </td>
        </tr>` : ''}
        <tr>
          <td style="padding:20px 28px; border-top:1px solid #E8EEF7; font-size:12px; color:${TEXT_MUTED};">
            SolDirectory · This is an automated message.<br />
            Need help? Contact support at the details in your account, or visit the SolDirectory support page.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function leadConfirmationTemplate(input: { requestNumber: string; need: string; trackingUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: `We've received your care request — reference ${input.requestNumber}`,
    heading: "We've received your care request",
    bodyHtml: `
      <p>Thanks for submitting a request for <strong>${input.need}</strong> through SolDirectory.</p>
      <p>Your reference number is <strong>${input.requestNumber}</strong> — keep this for your records.</p>
      <p><strong>What happens next:</strong> providers matching your request can now review it. Most participants hear back from a provider within a few business days, though this varies by service and location.</p>
    `,
    ctaLabel: input.trackingUrl ? 'Track your request' : undefined,
    ctaUrl: input.trackingUrl,
  });
  return { subject: "We've received your SolDirectory care request", html };
}

export function providerMatchedTemplate(input: { need: string; trackingUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'A provider has been matched to your request',
    heading: 'A provider has been matched to your request',
    bodyHtml: `<p>Good news — a provider offering <strong>${input.need}</strong> has been matched to your request and may be in touch soon.</p>`,
    ctaLabel: input.trackingUrl ? 'View your request' : undefined,
    ctaUrl: input.trackingUrl,
  });
  return { subject: 'A provider has been matched to your request', html };
}

export function providerResponseTemplate(input: { providerName: string; trackingUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: `${input.providerName} has responded to your request`,
    heading: 'A provider has responded to your request',
    bodyHtml: `<p><strong>${input.providerName}</strong> has responded to your care request. Log in to see their response and next steps.</p>`,
    ctaLabel: input.trackingUrl ? 'View response' : undefined,
    ctaUrl: input.trackingUrl,
  });
  return { subject: 'A provider has responded to your request', html };
}

export function capacityConfirmationTemplate(input: { providerName: string; confirmUrl: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'Confirm you can still take new referrals this week',
    heading: 'Weekly capacity check-in',
    bodyHtml: `<p>Hi ${input.providerName},</p><p>Please confirm you're still able to take new referrals this week. If we don't hear from you within 7 days, your listing is paused and dropped from search results until you confirm again.</p>`,
    ctaLabel: 'Confirm capacity',
    ctaUrl: input.confirmUrl,
  });
  return { subject: 'Confirm your capacity — SolDirectory', html };
}

export function providerLeadNotificationTemplate(input: { need: string; suburb: string; dashboardUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'A new care opportunity is available',
    heading: 'New care opportunity available',
    bodyHtml: `<p>A new request for <strong>${input.need}</strong> in <strong>${input.suburb}</strong> is available in your leads list.</p>`,
    ctaLabel: input.dashboardUrl ? 'View opportunity' : undefined,
    ctaUrl: input.dashboardUrl,
  });
  return { subject: 'New care opportunity available', html };
}

export function providerLeadTeaserTemplate(input: { need: string; suburb: string; dashboardUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: `A new ${escapeHtml(input.need)} lead is available in ${escapeHtml(input.suburb)}`,
    heading: 'New lead in your service area',
    bodyHtml: `<p>A new request for <strong>${escapeHtml(input.need)}</strong> in <strong>${escapeHtml(input.suburb)}</strong> may suit your organisation.</p><p>Upgrade your plan to unlock the full brief and contact details. The requester's email and phone number are hidden until the lead is unlocked.</p>`,
    ctaLabel: input.dashboardUrl ? 'View lead opportunity' : undefined,
    ctaUrl: input.dashboardUrl,
  });
  return { subject: `New ${input.need} lead in ${input.suburb}`, html };
}

export function providerLeadFullTemplate(input: {
  need: string;
  suburb: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  careFor: string;
  timeframe: string;
  fundingType: string;
  planManagement?: string;
  additionalDetails?: string;
  dashboardUrl?: string;
}): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: `New ${escapeHtml(input.need)} lead in ${escapeHtml(input.suburb)} with contact details`,
    heading: 'New matched lead',
    bodyHtml: `
      <p>A new request for <strong>${escapeHtml(input.need)}</strong> in <strong>${escapeHtml(input.suburb)}</strong> has been matched to your organisation.</p>
      <p><strong>Requester:</strong> ${escapeHtml(input.requesterName)}<br />
      <strong>Email:</strong> ${escapeHtml(input.requesterEmail)}<br />
      <strong>Phone:</strong> ${escapeHtml(input.requesterPhone || 'Not provided')}</p>
      <p><strong>Support for:</strong> ${escapeHtml(input.careFor)}<br />
      <strong>Timeframe:</strong> ${escapeHtml(input.timeframe)}<br />
      <strong>Funding:</strong> ${escapeHtml(input.fundingType)}${input.planManagement ? ` (${escapeHtml(input.planManagement)})` : ''}</p>
      ${input.additionalDetails ? `<p><strong>Additional details:</strong><br />${escapeHtml(input.additionalDetails)}</p>` : ''}
    `,
    ctaLabel: input.dashboardUrl ? 'Open lead in dashboard' : undefined,
    ctaUrl: input.dashboardUrl,
  });
  return { subject: `New matched ${input.need} lead in ${input.suburb}`, html };
}

export function adminNotificationTemplate(input: { title: string; message: string; dashboardUrl?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: input.title,
    heading: input.title,
    bodyHtml: `<p>${input.message}</p>`,
    ctaLabel: input.dashboardUrl ? 'Open admin dashboard' : undefined,
    ctaUrl: input.dashboardUrl,
  });
  return { subject: `[SolDirectory Admin] ${input.title}`, html };
}

export function passwordResetTemplate(input: { resetUrl: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'Reset your SolDirectory password',
    heading: 'Reset your password',
    bodyHtml: `
      <p>We received a request to reset your SolDirectory password. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `,
    ctaLabel: 'Reset password',
    ctaUrl: input.resetUrl,
  });
  return { subject: 'Reset your SolDirectory password', html };
}

export function passwordChangedTemplate(): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'Your password was changed',
    heading: 'Your password was changed',
    bodyHtml: `<p>Your SolDirectory password was just changed. If this wasn't you, contact support immediately.</p>`,
  });
  return { subject: 'Your SolDirectory password was changed', html };
}

export function verificationResultTemplate(input: { approved: boolean; reason?: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: input.approved ? 'Your verification has been approved' : 'An update on your verification',
    heading: input.approved ? "You're verified!" : 'Verification update',
    bodyHtml: input.approved
      ? `<p>Good news — your worker verification has been approved and your profile is now published.</p>`
      : `<p>Your worker verification was not approved this time.${input.reason ? ` Reason: ${input.reason}` : ''}</p><p>You're welcome to update your documents and resubmit.</p>`,
  });
  return { subject: input.approved ? "You're verified on SolDirectory" : 'Your SolDirectory verification update', html };
}

export function welcomeTemplate(input: { name: string }): { subject: string; html: string } {
  const html = renderEmailLayout({
    preheader: 'Welcome to SolDirectory',
    heading: `Welcome, ${input.name}!`,
    bodyHtml: `<p>Your SolDirectory account is ready. We're glad you're here.</p>`,
  });
  return { subject: 'Welcome to SolDirectory', html };
}
