import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSession, verifySession } from './session';
import type { SafeUser, SessionPayload, UserRow } from '@/types';

export { SESSION_COOKIE, generateApiKey } from './session';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function stripPassword(user: UserRow): SafeUser {
  const { password_hash: _password_hash, ...safe } = user;
  return safe;
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function fetchUserById(id: number): Promise<UserRow | null> {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  const list = rows as UserRow[];
  return list[0] ?? null;
}

/** Reads the session cookie and loads the current user fresh from the DB. Server-side only. */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const user = await fetchUserById(payload.userId);
  if (!user || !user.is_active) return null;

  return stripPassword(user);
}

export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new AuthError('Admin access required', 403);
  }
  return user;
}

export async function getUserByApiKey(apiKey: string): Promise<UserRow | null> {
  const [rows] = await pool.query('SELECT * FROM users WHERE api_key = ? LIMIT 1', [apiKey]);
  const list = rows as UserRow[];
  return list[0] ?? null;
}

/** Authenticates an external API request via the x-api-key header. */
export async function requireApiKeyUser(request: Request): Promise<SafeUser> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) throw new AuthError('API key required (x-api-key header)', 401);

  const user = await getUserByApiKey(apiKey);
  if (!user || !user.is_active) throw new AuthError('Invalid API key', 401);

  return stripPassword(user);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
