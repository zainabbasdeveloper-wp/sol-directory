import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { ensureDefaultPlans } from './models/PlanConfig.js';

import authRoutes from './routes/auth.routes.js';
import workersRoutes from './routes/workers.routes.js';
import leadsRoutes from './routes/leads.routes.js';
import plansRoutes from './routes/plans.routes.js';
import onboardingRoutes from './routes/onboarding.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import wpRoutes from './routes/wp.routes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/wp', wpRoutes);

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
