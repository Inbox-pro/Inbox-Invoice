import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '../shared/types.ts';

const ACCESS_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex');

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required' },
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Session expired or invalid token' },
    });
  }
}

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in a minute.',
    },
  },
});
