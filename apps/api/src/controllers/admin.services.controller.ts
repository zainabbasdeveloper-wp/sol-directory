import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Service from '../models/Service.js';
import { logActivity } from '../models/AdminActivity.js';

export async function listServicesAdmin(req: AuthedRequest, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.active === 'true' || req.query.active === 'false') {
    filter.active = req.query.active === 'true';
  }

  const items = await Service.find(filter).sort({ category: 1, name: 1 }).lean();
  res.json({
    items: items.map((s: any) => ({
      id: String(s._id),
      name: s.name,
      category: s.category,
      description: s.description ?? '',
      active: s.active,
      applicableFunding: s.applicableFunding ?? [],
      applicableRoles: s.applicableRoles ?? [],
      conditionTags: s.conditionTags ?? [],
    })),
  });
}

export async function createService(req: AuthedRequest, res: Response) {
  const { name, category, description, applicableFunding, applicableRoles, conditionTags } = req.body as Record<string, unknown>;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Service name is required' });
  }
  if (!category || typeof category !== 'string' || !category.trim()) {
    return res.status(400).json({ error: 'Category is required' });
  }

  const existing = await Service.findOne({ name: name.trim() });
  if (existing) return res.status(409).json({ error: 'A service with this name already exists' });

  const service = await Service.create({
    name: name.trim(),
    category: category.trim(),
    description: typeof description === 'string' ? description : '',
    applicableFunding: Array.isArray(applicableFunding) ? applicableFunding : [],
    applicableRoles: Array.isArray(applicableRoles) ? applicableRoles : [],
    conditionTags: Array.isArray(conditionTags) ? conditionTags : [],
  });

  await logActivity('service_created', `New service added: ${service.name} (${service.category})`);
  res.status(201).json({ id: String(service._id) });
}

export async function updateService(req: AuthedRequest, res: Response) {
  const { name, category, description, applicableFunding, applicableRoles, conditionTags } = req.body as Record<string, unknown>;

  const service = await Service.findById(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  if (typeof name === 'string' && name.trim()) service.name = name.trim();
  if (typeof category === 'string' && category.trim()) service.category = category.trim();
  if (typeof description === 'string') service.description = description;
  if (Array.isArray(applicableFunding)) service.applicableFunding = applicableFunding as string[];
  if (Array.isArray(applicableRoles)) service.applicableRoles = applicableRoles as any;
  if (Array.isArray(conditionTags)) service.conditionTags = conditionTags as string[];

  await service.save();
  res.json({ id: String(service._id) });
}

export async function setServiceActive(req: AuthedRequest, res: Response) {
  const { active } = req.body as { active: boolean };
  if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be true or false' });

  const service = await Service.findByIdAndUpdate(req.params.id, { active }, { new: true });
  if (!service) return res.status(404).json({ error: 'Service not found' });

  await logActivity('service_status_changed', `${service.name} was ${active ? 'activated' : 'deactivated'}`);
  res.json({ id: String(service._id), active: service.active });
}
