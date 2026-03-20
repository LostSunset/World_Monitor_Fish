import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const API_KEYS = new Set(
  (process.env.INTEGRATION_API_KEYS || '').split(',').map(k => k.trim()).filter(Boolean)
);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth in development if no keys configured
  if (API_KEYS.size === 0 && process.env.NODE_ENV === 'development') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-integration-key'] as string | undefined;

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (apiKeyHeader) {
    token = apiKeyHeader;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const isValid = Array.from(API_KEYS).some(key => timingSafeEqual(token!, key));

  if (!isValid) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
