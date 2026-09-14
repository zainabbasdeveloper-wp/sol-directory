import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { ensureDefaultPlans } from './models/PlanConfig.js';

import authRoutes from './routes/auth.routes.js';
import workersRoutes from './routes/workers.routes.js';
import providersRoutes from './routes/providers.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import referralsRoutes from './routes/referrals.routes.js';
import conditionsRoutes from './routes/conditions.routes.js';
import shortlistRoutes from './routes/shortlist.routes.js';
import servicesRoutes from './routes/services.routes.js';
import plansRoutes from './routes/plans.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import wpRoutes from './routes/wp.routes.js';
import matchRequestsRoutes from './routes/matchRequests.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import sitemapRoutes from './routes/sitemap.routes.js';
import adminRoutes from './routes/admin.routes.js';
import adminDashboardRoutes from './routes/admin.dashboard.routes.js';
import adminPlansRoutes from './routes/admin.plans.routes.js';
import adminServicesRoutes from './routes/admin.services.routes.js';
import adminConditionsRoutes from './routes/admin.conditions.routes.js';
import adminDiagnosticsRoutes from './routes/admin.diagnostics.routes.js';
import adminLeadsRoutes from './routes/admin.leads.routes.js';
import adminEmailLogsRoutes from './routes/admin.emailLogs.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/referrals', referralsRoutes);
app.use('/api/conditions', conditionsRoutes);
app.use('/api/shortlists', shortlistRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/wp', wpRoutes);
app.use('/api/match-requests', matchRequestsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/plans', adminPlansRoutes);
app.use('/api/admin/services', adminServicesRoutes);
app.use('/api/admin/conditions', adminConditionsRoutes);
// These three existed as real files but were never actually mounted
// here — found by directly comparing the deployed routes/ directory
// against this file, not assumed.
app.use('/api/admin/diagnostics', adminDiagnosticsRoutes);
app.use('/api/admin/leads', adminLeadsRoutes);
app.use('/api/admin/email-logs', adminEmailLogsRoutes);
app.use('/sitemap.xml', sitemapRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'Something went wrong' });
});

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => ensureDefaultPlans())
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
