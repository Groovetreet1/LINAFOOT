import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../src/app.ts';
import { totpCode } from '../src/totp.ts';

interface User {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  twoFactorEnabled: boolean;
}

interface AuthResponse {
  token: string;
  user: User;
  balance: number;
}

async function setup(t: test.TestContext) {
  mkdirSync('.test-tmp', { recursive: true });
  const directory = mkdtempSync(join('.test-tmp', 'profile-'));
  const app = await buildApp({ databasePath: join(directory, 'test.sqlite'), tokenTtlHours: 1 });
  t.after(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return app;
}

async function signup(app: Awaited<ReturnType<typeof buildApp>>, email: string, password = 'secret123') {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/signup',
    payload: { displayName: 'Atlas Test', email, password },
  });
  assert.equal(response.statusCode, 201);
  return response.json<AuthResponse>();
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

test('profile can be read, updated, and persists a normalized Moroccan phone', async (t) => {
  const app = await setup(t);
  const auth = await signup(app, 'profile@example.com');
  const headers = authHeaders(auth.token);

  assert.equal(auth.user.email, 'profile@example.com');
  assert.equal(auth.user.phone, null);
  assert.equal(auth.user.twoFactorEnabled, false);

  const initial = await app.inject({ method: 'GET', url: '/api/v1/profile', headers });
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.json<{ user: User }>().user.displayName, 'Atlas Test');

  const updated = await app.inject({
    method: 'POST',
    url: '/api/v1/profile',
    headers,
    payload: { displayName: 'Atlas Maroc', phone: '06 12 34 56 78' },
  });
  assert.equal(updated.statusCode, 200);
  const updatedUser = updated.json<{ user: User }>().user;
  assert.equal(updatedUser.displayName, 'Atlas Maroc');
  assert.equal(updatedUser.phone, '+212612345678');

  const international = await app.inject({
    method: 'POST',
    url: '/api/v1/profile',
    headers,
    payload: { phone: '00212 7 12 34 56 78' },
  });
  assert.equal(international.statusCode, 200);
  assert.equal(international.json<{ user: User }>().user.phone, '+212712345678');

  const persisted = await app.inject({ method: 'GET', url: '/api/v1/profile', headers });
  assert.equal(persisted.json<{ user: User }>().user.displayName, 'Atlas Maroc');
  assert.equal(persisted.json<{ user: User }>().user.phone, '+212712345678');

  const invalid = await app.inject({
    method: 'POST',
    url: '/api/v1/profile',
    headers,
    payload: { phone: '12345' },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(invalid.json().error.code, 'INVALID_PHONE');

  const cleared = await app.inject({
    method: 'POST',
    url: '/api/v1/profile',
    headers,
    payload: { phone: null },
  });
  assert.equal(cleared.statusCode, 200);
  assert.equal(cleared.json<{ user: User }>().user.phone, null);
});

test('password change verifies the current password and revokes other sessions', async (t) => {
  const app = await setup(t);
  const auth = await signup(app, 'password@example.com', 'secret123');
  const headers = authHeaders(auth.token);

  const secondLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'password@example.com', password: 'secret123' },
  });
  assert.equal(secondLogin.statusCode, 200);
  const secondToken = secondLogin.json<AuthResponse>().token;

  const wrong = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/password',
    headers,
    payload: { currentPassword: 'wrong-password', newPassword: 'newsecret456' },
  });
  assert.equal(wrong.statusCode, 400);
  assert.equal(wrong.json().error.code, 'INVALID_PASSWORD');

  const same = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/password',
    headers,
    payload: { currentPassword: 'secret123', newPassword: 'secret123' },
  });
  assert.equal(same.statusCode, 400);
  assert.equal(same.json().error.code, 'SAME_PASSWORD');

  const changed = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/password',
    headers,
    payload: { currentPassword: 'secret123', newPassword: 'newsecret456' },
  });
  assert.equal(changed.statusCode, 200);
  assert.deepEqual(changed.json(), { ok: true });

  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/profile', headers })).statusCode, 200);
  assert.equal((await app.inject({
    method: 'GET', url: '/api/v1/profile', headers: authHeaders(secondToken),
  })).statusCode, 401);

  const oldPassword = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'password@example.com', password: 'secret123' },
  });
  assert.equal(oldPassword.statusCode, 401);

  const newPassword = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'password@example.com', password: 'newsecret456' },
  });
  assert.equal(newPassword.statusCode, 200);
});

test('TOTP setup, login challenge, and disable use a real time-based code', async (t) => {
  const app = await setup(t);
  const auth = await signup(app, 'twofactor@example.com');
  const headers = authHeaders(auth.token);

  const setupResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/2fa/setup',
    headers,
    payload: { password: 'secret123' },
  });
  assert.equal(setupResponse.statusCode, 200);
  const { secret, otpauthUri } = setupResponse.json<{ secret: string; otpauthUri: string }>();
  assert.match(secret, /^[A-Z2-7]{32}$/);
  assert.ok(otpauthUri.startsWith('otpauth://totp/LINAFOOT:twofactor%40example.com?'));

  const code = totpCode(secret);
  const wrongCode = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
  const wrongEnable = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/2fa/enable',
    headers,
    payload: { code: wrongCode },
  });
  assert.equal(wrongEnable.statusCode, 400);
  assert.equal(wrongEnable.json().error.code, 'INVALID_2FA_CODE');

  const enabled = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/2fa/enable',
    headers,
    payload: { code },
  });
  assert.equal(enabled.statusCode, 200);
  assert.deepEqual(enabled.json(), { twoFactorEnabled: true });

  const profile = await app.inject({ method: 'GET', url: '/api/v1/profile', headers });
  assert.equal(profile.json<{ user: User }>().user.twoFactorEnabled, true);

  const login = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'twofactor@example.com', password: 'secret123' },
  });
  assert.equal(login.statusCode, 200);
  const challenge = login.json<{ requiresTwoFactor: boolean; challengeToken: string }>();
  assert.equal(challenge.requiresTwoFactor, true);
  assert.ok(challenge.challengeToken.length >= 40);

  const badChallengeCode = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login/2fa',
    payload: { challengeToken: challenge.challengeToken, code: wrongCode },
  });
  assert.equal(badChallengeCode.statusCode, 401);
  assert.equal(badChallengeCode.json().error.code, 'INVALID_2FA_CODE');

  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login/2fa',
    payload: { challengeToken: challenge.challengeToken, code: totpCode(secret) },
  });
  assert.equal(verified.statusCode, 200);
  const session = verified.json<AuthResponse>();
  assert.equal(session.user.twoFactorEnabled, true);
  assert.ok(session.token.length >= 40);

  const replay = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login/2fa',
    payload: { challengeToken: challenge.challengeToken, code: totpCode(secret) },
  });
  assert.equal(replay.statusCode, 401);
  assert.equal(replay.json().error.code, 'INVALID_2FA_CHALLENGE');

  const wrongDisable = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/2fa/disable',
    headers: authHeaders(session.token),
    payload: { password: 'wrong-password' },
  });
  assert.equal(wrongDisable.statusCode, 400);
  assert.equal(wrongDisable.json().error.code, 'INVALID_PASSWORD');

  const disabled = await app.inject({
    method: 'POST',
    url: '/api/v1/profile/2fa/disable',
    headers: authHeaders(session.token),
    payload: { password: 'secret123' },
  });
  assert.equal(disabled.statusCode, 200);
  assert.deepEqual(disabled.json(), { twoFactorEnabled: false });

  const plainLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: 'twofactor@example.com', password: 'secret123' },
  });
  assert.equal(plainLogin.statusCode, 200);
  assert.ok(plainLogin.json<AuthResponse>().token);
  assert.equal(plainLogin.json<AuthResponse>().user.twoFactorEnabled, false);
});

test('TOTP implementation matches the RFC 6238 SHA-1 test vector', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
  assert.equal(totpCode(secret, 59_000), '287082');
});
