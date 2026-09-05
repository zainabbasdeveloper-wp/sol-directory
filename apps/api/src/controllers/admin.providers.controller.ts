import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Provider from '../models/Provider.js';
import { logActivity } from '../models/AdminActivity.js';

const MAX_LIMIT = 50;

// Route-level requireRole('admin') already guarantees only admin
// reaches these — no additional role check needed inside the
// handlers themselves.

export async function listProvidersAdmin(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  const filter: Record<string, unknown> = {};
  if (req.query.status === 'active' || req.query.status === 'suspended') {
    filter.accountStatus = req.query.status;
  }

  const [docs, total] = await Promise.all([
    Provider.find(filter)
      .populate('userId', 'name email')
      .select('legalEntityName tradingName abn plan intakeStatus accountStatus createdAt userId')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Provider.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((p: any) => ({
      id: String(p._id),
      legalEntityName: p.legalEntityName,
      tradingName: p.tradingName,
      abn: p.abn,
      plan: p.plan,
      intakeStatus: p.intakeStatus,
      accountStatus: p.accountStatus,
      createdAt: p.createdAt,
      ownerName: p.userId?.name ?? null,
      ownerEmail: p.userId?.email ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function getProviderAdmin(req: AuthedRequest, res: Response) {
  const provider = await Provider.findById(req.params.id).populate('userId', 'name email mobile').lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  res.json(provider);
}

export async function setProviderAccountStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body as { status: string };
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'status must be "active" or "suspended"' });
  }

  const provider = await Provider.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true }).lean();
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const name = provider.tradingName || provider.legalEntityName || 'A provider';
  await logActivity('provider_status_changed', `${name} was ${status === 'suspended' ? 'suspended' : 'reactivated'}`);

  res.json({ id: String(provider._id), accountStatus: provider.accountStatus });
}
