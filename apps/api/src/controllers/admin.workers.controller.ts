import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Worker from '../models/Worker.js';
import { logActivity } from '../models/AdminActivity.js';

const MAX_LIMIT = 50;

// Route-level requireRole('admin') already guarantees only admin
// reaches these. Uses UNLOCKED-equivalent full field access directly
// (not the masked/unlocked projections built for participant-facing
// search) since admin oversight needs the complete record regardless.

export async function listWorkersAdmin(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  const filter: Record<string, unknown> = {};
  if (req.query.status === 'active' || req.query.status === 'suspended') {
    filter.accountStatus = req.query.status;
  }
  if (req.query.verification) {
    filter.verificationStatus = req.query.verification;
  }

  const [docs, total] = await Promise.all([
    Worker.find(filter)
      .populate('userId', 'name email')
      .select('firstName lastName role suburb verificationStatus accountStatus published createdAt userId')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Worker.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((w: any) => ({
      id: String(w._id),
      firstName: w.firstName,
      lastName: w.lastName,
      role: w.role,
      suburb: w.suburb,
      verificationStatus: w.verificationStatus,
      accountStatus: w.accountStatus,
      published: w.published,
      createdAt: w.createdAt,
      ownerName: w.userId?.name ?? null,
      ownerEmail: w.userId?.email ?? null,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function getWorkerAdmin(req: AuthedRequest, res: Response) {
  const worker = await Worker.findById(req.params.id).populate('userId', 'name email mobile').lean();
  if (!worker) return res.status(404).json({ error: 'Worker not found' });
  res.json(worker);
}

export async function setWorkerAccountStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body as { status: string };
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'status must be "active" or "suspended"' });
  }

  const worker = await Worker.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true }).lean();
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  await logActivity('worker_status_changed', `${worker.firstName} ${worker.lastName} was ${status === 'suspended' ? 'suspended' : 'reactivated'}`);

  res.json({ id: String(worker._id), accountStatus: worker.accountStatus });
}
