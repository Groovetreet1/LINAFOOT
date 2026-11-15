import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { AppError } from './errors.ts';

export interface AuthUser {
  id: string;
  displayName: string;
  tokenHash: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser;
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(derived, keyBuf);
}

export function authenticate(db: DatabaseSync) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ') || authorization.length <= 7) {
      throw new AppError(401, 'UNAUTHORIZED', 'A valid bearer token is required');
    }

    const token = authorization.slice(7).trim();
    if (!token || token.length > 256) {
      throw new AppError(401, 'UNAUTHORIZED', 'A valid bearer token is required');
    }

    const row = db.prepare(`
      SELECT users.id, users.display_name AS displayName, auth_tokens.token_hash AS tokenHash
      FROM auth_tokens
      JOIN users ON users.id = auth_tokens.user_id
      WHERE auth_tokens.token_hash = ? AND auth_tokens.expires_at > ?
    `).get(hashToken(token), new Date().toISOString()) as AuthUser | undefined;

    if (!row) {
      throw new AppError(401, 'UNAUTHORIZED', 'A valid bearer token is required');
    }
    request.user = row;
  };
}
