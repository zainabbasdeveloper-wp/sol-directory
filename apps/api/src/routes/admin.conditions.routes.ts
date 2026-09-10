import { Router } from 'express';
import { listConditionsAdmin, createCondition, setConditionActive } from '../controllers/admin.conditions.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';

const router = Router();
const adminOnly = requireRole('admin');

router.get('/', requireAuth, adminOnly, listConditionsAdmin);
router.post('/', requireAuth, adminOnly, createCondition);
router.patch('/:id/active', requireAuth, adminOnly, setConditionActive);

export default router;
