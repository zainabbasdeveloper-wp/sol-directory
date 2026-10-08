import { escapeHtml, renderEmailLayout } from './emailTemplates.js';
import { senderIdentityHtml } from './emailTokens.js';

/**
 * Emails sent by the follow-up automations (see leadFollowUp.service.ts). Anything that is not a direct reply to the
 * recipient's own action carries who sent it and a one-click way to stop, as the Spam Act 2003 requires.
 */
const footer = (unsubscribeUrl: string, why: string) =>
  `${escapeHtml(why)} <a href="${escapeHtml(unsubscribeUrl)}">Stop these emails</a><br />${escapeHtml(senderIdentityHtml())}`;

const where = (need: string | undefined, suburb: string | undefined) =>
  [need && !/^not sure yet$/i.test(need) ? need : 'support', suburb ? `in ${suburb}` : ''].filter(Boolean).join(' ');

export interface Email { subject: string; html: string }

// --- To the person who made the request -------------------------------------------------------------------------

export function requestViewedTemplate(input: { need?: string; suburb?: string; viewedCount: number; searchUrl: string; unsubscribeUrl: string }): Email {
  const many = input.viewedCount > 1;
  const html = renderEmailLayout({
    preheader: `${many ? `${input.viewedCount} providers have` : 'A provider has'} looked at your request`,
    heading: many ? 'Providers have looked at your request' : 'A provider has looked at your request',
    bodyHtml: `
      <p>Your request for <strong>${escapeHtml(where(input.need, input.suburb))}</strong> has now been opened by ${many ? `<strong>${input.viewedCount} providers</strong>` : 'a provider'}.</p>
      <p>They may contact you by phone or email, so keep an eye on both. Providers decide for themselves whether to follow up, and how quickly.</p>
      <p>While you wait, you can look at other providers in your area and contact them directly.</p>`,
    ctaLabel: 'Browse providers near you',
    ctaUrl: input.searchUrl,
    footerHtml: footer(input.unsubscribeUrl, 'You are receiving this because you sent a request through SolDirectory.'),
  });
  return { subject: many ? 'Providers have looked at your SolDirectory request' : 'A provider has looked at your SolDirectory request', html };
}

export function requestRespondedTemplate(input: { providerName: string; need?: string; suburb?: string; searchUrl: string; unsubscribeUrl: string }): Email {
  const html = renderEmailLayout({
    preheader: `${input.providerName} has taken up your request`,
    heading: 'A provider has taken up your request',
    bodyHtml: `
      <p><strong>${escapeHtml(input.providerName)}</strong> has opened the contact details you gave for <strong>${escapeHtml(where(input.need, input.suburb))}</strong> and may be in touch soon.</p>
      <p>Before agreeing to anything, check their registration, prices and service agreement, and ask about availability. You do not have to choose the first provider who calls.</p>`,
    ctaLabel: 'Compare other providers',
    ctaUrl: input.searchUrl,
    footerHtml: footer(input.unsubscribeUrl, 'You are receiving this because you sent a request through SolDirectory.'),
  });
  return { subject: `${input.providerName} has taken up your SolDirectory request`, html };
}

export function weeklyMatchesTemplate(input: {
  need?: string; suburb?: string; weekNumber: number; viewedCount: number; matchedCount: number;
  providers: { name: string; url: string }[]; searchUrl: string; unsubscribeUrl: string;
}): Email {
  const list = input.providers.map((p) => `<li style="margin-bottom:8px"><a href="${escapeHtml(p.url)}"><strong>${escapeHtml(p.name)}</strong></a></li>`).join('');
  const status = input.matchedCount === 0
    ? 'We have not found a provider that fits every detail yet, but new providers join regularly.'
    : input.viewedCount > 0
    ? `${input.viewedCount} of ${input.matchedCount} matched provider${input.matchedCount === 1 ? '' : 's'} ${input.viewedCount === 1 ? 'has' : 'have'} looked at it so far.`
    : `${input.matchedCount} provider${input.matchedCount === 1 ? ' was' : 's were'} matched to it, and none has opened it yet.`;
  const html = renderEmailLayout({
    preheader: `Your matches for ${where(input.need, input.suburb)}`,
    heading: 'Your provider matches this week',
    bodyHtml: `
      <p>You asked for <strong>${escapeHtml(where(input.need, input.suburb))}</strong>. ${escapeHtml(status)}</p>
      ${list ? `<p>Providers matched to your request:</p><ul style="padding-left:20px">${list}</ul>` : ''}
      <p>You do not have to wait for a provider to call. You can look at profiles, compare providers and get in touch with the ones you like straight from the site.</p>`,
    ctaLabel: 'See your matches',
    ctaUrl: input.searchUrl,
    footerHtml: footer(input.unsubscribeUrl, `This is reminder ${input.weekNumber} of up to 4, sent because you sent a request through SolDirectory.`),
  });
  return { subject: `Your provider matches for ${where(input.need, input.suburb)}`, html };
}

// --- To a provider ----------------------------------------------------------------------------------------------

export function providerLeadReminderTemplate(input: { providerName: string; count: number; dashboardUrl: string; unsubscribeUrl?: string }): Email {
  const many = input.count > 1;
  const html = renderEmailLayout({
    preheader: `${input.count} enquir${many ? 'ies are' : 'y is'} waiting for you`,
    heading: many ? `${input.count} enquiries are waiting for you` : 'An enquiry is waiting for you',
    bodyHtml: `
      <p>Hi ${escapeHtml(input.providerName)},</p>
      <p>${many ? `${input.count} people have` : 'Someone has'} asked for support that matches your listing and ${many ? 'have' : 'has'} not heard from you yet. Families usually choose the first provider who gets in touch.</p>
      <p>Open your leads list to see ${many ? 'them' : 'it'}.</p>`,
    ctaLabel: 'View your leads',
    ctaUrl: input.dashboardUrl,
    footerHtml: input.unsubscribeUrl ? footer(input.unsubscribeUrl, 'You are receiving this because enquiries were matched to your SolDirectory listing.') : undefined,
  });
  return { subject: many ? `${input.count} enquiries are waiting for you on SolDirectory` : 'An enquiry is waiting for you on SolDirectory', html };
}

// --- To a register listing (a business that appears on the public register but has not joined) -------------------

export function registerLeadNoticeTemplate(input: { listingName: string; category: string; suburb: string; listingUrl: string; unsubscribeUrl: string }): Email {
  const html = renderEmailLayout({
    preheader: `Someone near ${input.suburb} is looking for ${input.category.toLowerCase()}`,
    heading: `New enquiry near ${escapeHtml(input.suburb)}`,
    bodyHtml: `
      <p>Hello ${escapeHtml(input.listingName)},</p>
      <p>A person near <strong>${escapeHtml(input.suburb)}</strong> has just asked SolDirectory for <strong>${escapeHtml(input.category.toLowerCase())}</strong>. Your organisation is listed on the public register for this support in the area.</p>
      <p>We have not shared the person's details. To receive enquiries like this, with their contact details, open your free listing and manage it.</p>`,
    ctaLabel: 'Manage your listing',
    ctaUrl: input.listingUrl,
    footerHtml: footer(input.unsubscribeUrl, 'We sent this to the business email address published for your register listing.'),
  });
  return { subject: `New ${input.category.toLowerCase()} enquiry near ${input.suburb}`, html };
}
