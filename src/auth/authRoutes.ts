import { Router } from 'express';
import { authController } from './authController';
import { authMiddleware, requireAuth } from './authMiddleware';

export const authRouter = Router();

authRouter.post('/register', (req, res) => authController.register(req, res));
authRouter.post('/login', (req, res) => authController.login(req, res));
authRouter.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
authRouter.post('/reset-password', (req, res) => authController.resetPassword(req, res));

authRouter.get('/me', authMiddleware, requireAuth, (req, res) => authController.getMe(req, res));
authRouter.put('/profile', authMiddleware, requireAuth, (req, res) => authController.updateProfile(req, res));
