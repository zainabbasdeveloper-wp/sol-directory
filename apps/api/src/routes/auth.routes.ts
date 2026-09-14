import { Router } from 'express';
import { signup, login, me, forgotPassword, resetPassword } from '../controllers/auth.controller.js';

const router = Router();
router.post('/signup', signup);
router.post('/login', login);
router.get('/me', me);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
export default router;
