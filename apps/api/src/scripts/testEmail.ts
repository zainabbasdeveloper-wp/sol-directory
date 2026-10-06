/**
 * Checks the SMTP settings in .env actually work: connects, logs in, and sends one test email.
 * EmailService swallows send errors on purpose (a failed email must not break a signup or a payment),
 * so this script exists to show the real error when something is misconfigured.
 *
 * Usage: npm run email:test -w apps/api -- you@example.com
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

async function main() {
  const to = process.argv[2];
  if (!to || !to.includes('@')) {
    console.error('Usage: npm run email:test -w apps/api -- you@example.com');
    process.exit(1);
  }

  const { SMTP_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
  const missing = SMTP_URL ? [] : ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Not configured: ${missing.join(', ')} are empty in apps/api/.env`);
    process.exit(1);
  }
  const from = EMAIL_FROM || 'SolDirectory <no-reply@soldirectory.example>';

  const transporter = SMTP_URL
    ? nodemailer.createTransport(SMTP_URL)
    : nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      });

  console.log(`Server: ${SMTP_URL ? '(from SMTP_URL)' : `${SMTP_HOST}:${SMTP_PORT}`}`);
  console.log(`From:   ${from}`);
  console.log(`To:     ${to}\n`);

  try {
    await transporter.verify();
    console.log('1/2 Connected and logged in OK.');
    const info = await transporter.sendMail({
      from,
      to,
      subject: 'SolDirectory test email',
      html: '<p>If you can read this, SolDirectory email sending works.</p>',
    });
    console.log(`2/2 Brevo/SMTP server accepted the message.`);
    console.log(`    Server reply:  ${info.response}`);
    console.log(`    Accepted for:  ${JSON.stringify(info.accepted)}`);
    console.log(`    Rejected for:  ${JSON.stringify(info.rejected)}`);
    console.log(`    Message id:    ${info.messageId}`);
    console.log("\nAccepted means the provider took it, not that the inbox got it. Check the provider's log, then the inbox and spam folder.");
  } catch (err) {
    console.error('FAILED:', (err as Error).message);
    console.error('\nCommon causes: wrong SMTP_USER/SMTP_PASSWORD, EMAIL_FROM not a verified sender or domain at the provider, or port blocked (try 587 or 2525).');
    process.exit(1);
  }
}

main();
