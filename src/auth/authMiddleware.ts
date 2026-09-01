import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthUserPayload {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  address?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-auth-token'] as string);

  if (!token) {
    // Optional auth - proceed without user attached
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    // Token is invalid/expired
    next();
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      status: 'error',
      message: 'Authentication required. Please sign in to continue.'
    });
    return;
  }
  next();
}
