import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.middleware.js';
import Notification from '../models/Notification.js';

export async function listMyNotifications(req: AuthedRequest, res: Response) {
  const notifications = await Notification.find({ userId: req.user!.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({
    items: notifications.map((n: any) => ({
      id: String(n._id), type: n.type, message: n.message, link: n.link ?? null, read: n.read, createdAt: n.createdAt,
    })),
    unreadCount: notifications.filter((n: any) => !n.read).length,
  });
}

export async function markNotificationRead(req: AuthedRequest, res: Response) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.id }, // ownership check — can't mark someone else's notification read
    { read: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ error: 'Notification not found' });
  res.json({ id: String(notification._id), read: notification.read });
}
