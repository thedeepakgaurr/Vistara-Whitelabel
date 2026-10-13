import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { SessionPayload } from '@/types';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
      throw new Error('JWT_SECRET is not set. Add it to .env');
    }
    return 'temporary-dev-build-secret-key-32-chars-min';
  }
  return secret;
}

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}

export function generateApiKey(): string {
  return `cd_live_${crypto.randomBytes(24).toString('hex')}`;
}
