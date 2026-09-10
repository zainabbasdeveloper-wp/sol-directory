// Shared branded layout — table-based HTML, since that's still what
// actually renders consistently across real email clients (Outlook
// in particular ignores modern CSS layout). Every specific email
// wraps its content through this function rather than building its
// own <html> document.

const NAVY = '#0B2D5C';
const PRIMARY = '#1769E0';
const BG = '#F5F8FC';
const TEXT_MUTED = '#5A6B84';

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
