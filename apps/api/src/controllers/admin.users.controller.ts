import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import User from '../models/User.js';

const MAX_LIMIT = 50;

// Handles coordinator and participant — the two roles with no
// separate profile model, so User itself is the whole record. Not
// used for provider/worker (they have their own admin.*.controller
// pairs) or admin (never listed/managed here).
const MANAGEABLE_ROLES = ['coordinator', 'participant'];

export async function listUsersAdmin(req: AuthedRequest, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Number(req.query.limit) || 20);

  const filter: Record<string, unknown> = { role: { $in: MANAGEABLE_ROLES } };
  if (req.query.role === 'coordinator' || req.query.role === 'participant') {
    filter.role = req.query.role;
  }
  if (req.query.status === 'active' || req.query.status === 'suspended') {
    filter.accountStatus = req.query.status;
  }

  const [docs, total] = await Promise.all([
    User.find(filter)
      .select('name email mobile role accountStatus createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    items: docs.map((u: any) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      mobile: u.mobile ?? null,
      role: u.role,
      accountStatus: u.accountStatus,
      createdAt: u.createdAt,
    })),
    page,
    limit,
    total,
    hasMore: page * limit < total,
  });
}

export async function getUserAdmin(req: AuthedRequest, res: Response) {
  const user = await User.findOne({ _id: req.params.id, role: { $in: MANAGEABLE_ROLES } })
    .select('name email mobile role accountStatus createdAt')
    .lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
}

export async function setUserAccountStatus(req: AuthedRequest, res: Response) {
  const { status } = req.body as { status: string };
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ error: 'status must be "active" or "suspended"' });
  }

  const user = await User.findOneAndUpdate(
    { _id: req.params.id, role: { $in: MANAGEABLE_ROLES } },
    { accountStatus: status },
    { new: true }
  )
    .select('accountStatus')
    .lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ id: String(user._id), accountStatus: user.accountStatus });
}
