# AtlasFoot Sandbox Backend

**SANDBOX ONLY:** this API uses integer virtual credits exclusively. It has no real-money deposits, withdrawals, payments, prizes, cash value, or integration with payment providers. All bets pending settlement are simulated product data, not gambling services.

Local MVP API built with Node.js 24, TypeScript, Fastify, Zod, and Node's built-in SQLite driver.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The development/start scripts optionally load `.env` using Node's built-in environment-file support. You can also export variables in your shell or use your process manager. Defaults are `127.0.0.1:3000`, `./data/atlasfoot.sqlite`, and tokens valid for 168 hours.

```powershell
$env:PORT = "3000"
$env:HOST = "127.0.0.1"
$env:DATABASE_PATH = "./data/atlasfoot.sqlite"
$env:TOKEN_TTL_HOURS = "168"
npm run dev
```

`DATABASE_PATH` is resolved from the process working directory and its parent directory is created automatically. Use `:memory:` for an in-memory database. Health checks are public; matches, wallet, and bets require `Authorization: Bearer <token>`.

## Scripts

- `npm run dev` — watch mode
- `npm test` — Node test runner using Fastify injection and temporary SQLite databases
- `npm run typecheck` — strict TypeScript checking
- `npm run build` — compile to `dist/`
- `npm start` — run the compiled server

## Demo flow

1. `POST /api/v1/auth/demo` with `{}` or `{"displayName":"Fan"}`. Returns a bearer token and 1,000 virtual credits.
2. `GET /api/v1/matches?filter=all|live|upcoming`.
3. `POST /api/v1/bets` using the current listed odds, a stake of at least 10 credits, and a new idempotency key per intended bet.
4. Inspect `GET /api/v1/wallet` and `GET /api/v1/bets`.

There is deliberately no admin or payment functionality. Demo fixtures are dynamically seeded relative to startup time.
