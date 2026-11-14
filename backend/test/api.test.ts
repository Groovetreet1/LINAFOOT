import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { buildApp } from '../src/app.ts';

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  markets: { id: 'h2h'; selections: { id: 'home' | 'draw' | 'away'; label: '1' | 'X' | '2'; odds: number }[] }[];
}

interface Auth {
  token: string;
  user: { id: string; displayName: string };
  balance: number;
}

async function setup(t: test.TestContext) {
  mkdirSync('.test-tmp', { recursive: true });
  const directory = mkdtempSync(join('.test-tmp', 'case-'));
  const app = await buildApp({ databasePath: join(directory, 'test.sqlite'), tokenTtlHours: 1 });
  t.after(async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const response = await app.inject({ method: 'POST', url: '/api/v1/auth/demo', payload: {} });
  assert.equal(response.statusCode, 201);
  const auth = response.json<Auth>();
  return { app, auth, headers: { authorization: `Bearer ${auth.token}` } };
}

async function getMatch(app: Awaited<ReturnType<typeof buildApp>>, authorization: string): Promise<Match> {
  const response = await app.inject({ method: 'GET', url: '/api/v1/matches?filter=upcoming', headers: { authorization } });
  assert.equal(response.statusCode, 200);
  const matches = response.json<{ matches: Match[] }>().matches;
  assert.ok(matches.length >= 3);
  return matches[0]!;
}

test('health, demo authentication, protected endpoints, and initial virtual credits', async (t) => {
  const { app, auth, headers } = await setup(t);
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.deepEqual(health.json(), { status: 'ok' });
  assert.equal(auth.balance, 1000);
  assert.equal(auth.user.displayName, 'Demo Fan');
  assert.ok(auth.token.length >= 40);

  const unauthorized = await app.inject({ method: 'GET', url: '/api/v1/wallet' });
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.json().error.code, 'UNAUTHORIZED');

  const wallet = await app.inject({ method: 'GET', url: '/api/v1/wallet', headers });
  assert.equal(wallet.statusCode, 200);
  assert.equal(wallet.json().balance, 1000);
  assert.equal(wallet.json().transactions[0].type, 'CREDIT');

  const live = await app.inject({ method: 'GET', url: '/api/v1/matches?filter=live', headers });
  assert.equal(live.statusCode, 200);
  assert.ok(live.json<{ matches: Match[] }>().matches.every((match) => match.status === 'LIVE'));
});

test('successful bet atomically debits wallet and records a pending bet', async (t) => {
  const { app, headers } = await setup(t);
  const match = await getMatch(app, headers.authorization);
  const odds = match.markets[0]!.selections[0]!.odds;
  const response = await app.inject({
    method: 'POST', url: '/api/v1/bets', headers,
    payload: { matchId: match.id, selection: 'home', expectedOdds: odds, stake: 100, idempotencyKey: 'successful-bet' },
  });
  assert.equal(response.statusCode, 201);
  const body = response.json<{ bet: Record<string, unknown>; balance: number }>();
  assert.equal(body.balance, 900);
  assert.equal(body.bet.status, 'PENDING');
  assert.equal(body.bet.matchId, match.id);
  assert.equal(body.bet.selectionLabel, '1');
  assert.equal(body.bet.potentialPayout, Math.round(100 * odds));

  const wallet = await app.inject({ method: 'GET', url: '/api/v1/wallet', headers });
  assert.equal(wallet.json().balance, 900);
  assert.equal(wallet.json().transactions[0].type, 'DEBIT');
  assert.equal(wallet.json().transactions[0].amount, 100);
  const bets = await app.inject({ method: 'GET', url: '/api/v1/bets', headers });
  assert.equal(bets.json().bets.length, 1);
  assert.equal(bets.json().bets[0].id, body.bet.id);
});

test('bet with insufficient funds is rejected without a wallet debit', async (t) => {
  const { app, headers } = await setup(t);
  const match = await getMatch(app, headers.authorization);
  const response = await app.inject({
    method: 'POST', url: '/api/v1/bets', headers,
    payload: { matchId: match.id, selection: 'home', expectedOdds: match.markets[0]!.selections[0]!.odds, stake: 1001, idempotencyKey: 'too-large' },
  });
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.json(), { error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient virtual credit balance' } });
  const wallet = await app.inject({ method: 'GET', url: '/api/v1/wallet', headers });
  assert.equal(wallet.json().balance, 1000);
  assert.equal(wallet.json().transactions.length, 1);
});

test('changed odds are rejected using server-authoritative prices', async (t) => {
  const { app, headers } = await setup(t);
  const match = await getMatch(app, headers.authorization);
  const response = await app.inject({
    method: 'POST', url: '/api/v1/bets', headers,
    payload: { matchId: match.id, selection: 'away', expectedOdds: match.markets[0]!.selections[2]!.odds + 0.5, stake: 10, idempotencyKey: randomUUID() },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.json().error.code, 'ODDS_CHANGED');
  const wallet = await app.inject({ method: 'GET', url: '/api/v1/wallet', headers });
  assert.equal(wallet.json().balance, 1000);
});

test('idempotent replay returns the original bet and never charges twice', async (t) => {
  const { app, headers } = await setup(t);
  const match = await getMatch(app, headers.authorization);
  const payload = {
    matchId: match.id,
    selection: 'draw',
    expectedOdds: match.markets[0]!.selections[1]!.odds,
    stake: 25,
    idempotencyKey: 'replay-key-123',
  };
  const first = await app.inject({ method: 'POST', url: '/api/v1/bets', headers, payload });
  const replay = await app.inject({ method: 'POST', url: '/api/v1/bets', headers, payload });
  assert.equal(first.statusCode, 201);
  assert.equal(replay.statusCode, 201);
  assert.deepEqual(replay.json(), first.json());

  const wallet = await app.inject({ method: 'GET', url: '/api/v1/wallet', headers });
  assert.equal(wallet.json().balance, 975);
  assert.equal(wallet.json().transactions.length, 2);
  const bets = await app.inject({ method: 'GET', url: '/api/v1/bets', headers });
  assert.equal(bets.json().bets.length, 1);

  const conflict = await app.inject({ method: 'POST', url: '/api/v1/bets', headers, payload: { ...payload, stake: 30 } });
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error.code, 'IDEMPOTENCY_CONFLICT');
  assert.equal((await app.inject({ method: 'GET', url: '/api/v1/wallet', headers })).json().balance, 975);
});
