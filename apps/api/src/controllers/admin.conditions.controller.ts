import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Condition from '../models/Condition.js';
import { logActivity } from '../models/AdminActivity.js';

export async function listConditionsAdmin(req: AuthedRequest, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === 'true' || req.query.active === 'false') {
    filter.active = req.query.active === 'true';
  }

  const items = await Condition.find(filter).sort({ category: 1, name: 1 }).lean();
  res.json({
    items: items.map((c: any) => ({ id: String(c._id), name: c.name, category: c.category, active: c.active })),
  });
}

export async function createCondition(req: AuthedRequest, res: Response) {
  const { name, category } = req.body as Record<string, unknown>;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Condition name is required' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'Category is required' });
  }

  const existing = await Condition.findOne({ name: name.trim() });
  if (existing) return res.status(409).json({ error: 'A condition with this name already exists' });

  const condition = await Condition.create({ name: name.trim(), category: category.trim() });
  await logActivity('condition_created', `New condition added: ${condition.name} (${condition.category})`);
  res.status(201).json({ id: String(condition._id) });
}

export async function setConditionActive(req: AuthedRequest, res: Response) {
  const { active } = req.body as { active: boolean };
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be true or false' });

  const condition = await Condition.findByIdAndUpdate(req.params.id, { active }, { new: true });
  if (!condition) return res.status(404).json({ error: 'Condition not found' });

  await logActivity('condition_status_changed', `${condition.name} was ${active ? 'activated' : 'deactivated'}`);
  res.json({ id: String(condition._id), active: condition.active });
}
