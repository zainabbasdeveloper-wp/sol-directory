import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Worker from '../models/Worker.js';
import AuditEntry, { appendAuditEntry } from '../models/AuditEntry.js';

export async function listQueue(req: AuthedRequest, res: Response) {
  const { status } = req.query;
  const filter = status ? { verificationStatus: status } : {};
  const workers = await Worker.find(filter).select('firstName lastName role suburb verificationStatus clearances createdAt').lean();
  res.json(workers);
}

export async function getQueueDetail(req: AuthedRequest, res: Response) {
  const worker = await Worker.findById(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const trail = await AuditEntry.find({ workerId: worker._id }).sort({ at: 1 }).lean();
  res.json({ worker, trail });
}

export async function markDocument(req: AuthedRequest, res: Response) {
  const { docIndex, mark } = req.body as { docIndex: number; mark: 'verified' | 'flagged' };
  const worker = await Worker.findById(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const doc = worker.clearances[docIndex];
  if (!doc) return res.status(400).json({ error: 'No such document' });

  doc.status = doc.status === mark ? 'unmarked' : mark; // idempotent toggle
  await worker.save();

  res.json(worker.clearances);
}

export async function approve(req: AuthedRequest, res: Response) {
  const worker = await Worker.findById(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  const unverified = worker.clearances.filter((c) => c.status !== 'verified');
  if (unverified.length > 0) {
    return res.status(400).json({
      error: `Every document has to be marked verified before you can approve this worker. ${unverified.length} still unmarked or flagged.`,
    });
  }

  worker.verificationStatus = 'approved';
  worker.published = true;
  await worker.save();
  await appendAuditEntry(worker._id as any, 'Approved and published', req.user?.email ?? 'Admin');

  res.json({ status: 'approved' });
}

export async function reject(req: AuthedRequest, res: Response) {
  const { reason, note } = req.body as { reason?: string; note?: string };
  if (!reason) return res.status(400).json({ error: 'Choose a reason. It is sent to the worker with your decision.' });

  const worker = await Worker.findById(req.params.id);
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  worker.verificationStatus = 'rejected';
  worker.published = false;
  await worker.save();
  await appendAuditEntry(worker._id as any, `Rejected: ${reason}${note ? ` — ${note}` : ''}`, req.user?.email ?? 'Admin');

  res.json({ status: 'rejected' });
}
