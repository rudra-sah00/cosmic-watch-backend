import { Router } from 'express';
import { authenticate, authLimiter, validate } from '../../middlewares';
import { AuthController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

const router = Router();

// ── Public Routes ─────────────────────────────────────────────
router.post('/register', authLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);
router.post('/refresh', AuthController.refreshToken);

// ── Protected Routes ──────────────────────────────────────────
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
