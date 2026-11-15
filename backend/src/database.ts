import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

interface Fixture {
  league: string;
  leagueLogo: string;
  homeTeam: string;
  homeTeamLogo: string;
  awayTeam: string;
  awayTeamLogo: string;
  kickoffOffsetMinutes: number;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  minute: number | null;
  homeScore: number;
  awayScore: number;
  info: string;
  odds: [number, number, number];
}

// Snapshot réel (14/11/2026) basé sur scores/événements publics consultés.
const fixtures: Fixture[] = [
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Portugal', homeTeamLogo: 'https://flagcdn.com/w160/pt.png', awayTeam: 'Denmark', awayTeamLogo: 'https://flagcdn.com/w160/dk.png', kickoffOffsetMinutes: -62, status: 'LIVE', minute: 62, homeScore: 0, awayScore: 3, info: 'Live: Højbjerg 43’ (pen), Højlund 49’, 57’. Le Danemark mène 3-0.', odds: [2.45, 3.2, 2.8] },
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Northern Ireland', homeTeamLogo: 'https://flagcdn.com/w160/gb-nir.png', awayTeam: 'Ukraine', awayTeamLogo: 'https://flagcdn.com/w160/ua.png', kickoffOffsetMinutes: -68, status: 'LIVE', minute: 68, homeScore: 1, awayScore: 0, info: 'Live: Devlin 68’. Irlande du Nord mène 1-0.', odds: [2.1, 2.9, 3.6] },
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Austria', homeTeamLogo: 'https://flagcdn.com/w160/at.png', awayTeam: 'Republic of Ireland', awayTeamLogo: 'https://flagcdn.com/w160/ie.png', kickoffOffsetMinutes: -64, status: 'LIVE', minute: 64, homeScore: 0, awayScore: 0, info: 'Live: match serré, 0-0, occasions des deux côtés.', odds: [1.95, 3.1, 4.1] },
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Romania', homeTeamLogo: 'https://flagcdn.com/w160/ro.png', awayTeam: 'Poland', awayTeamLogo: 'https://flagcdn.com/w160/pl.png', kickoffOffsetMinutes: -72, status: 'FINISHED', minute: 90, homeScore: 2, awayScore: 0, info: 'Terminé: Cicaldau 68’, Man 72’.', odds: [2.2, 3.0, 3.4] },
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Sweden', homeTeamLogo: 'https://flagcdn.com/w160/se.png', awayTeam: 'Bosnia-Herzegovina', awayTeamLogo: 'https://flagcdn.com/w160/ba.png', kickoffOffsetMinutes: -85, status: 'FINISHED', minute: 90, homeScore: 3, awayScore: 2, info: 'Terminé: Svensson 5’, Gyökeres 11’ (pen), 45+2’ (pen) ; Gigovic 47’, Kolašinac 62’.', odds: [1.75, 3.7, 4.4] },
  { league: 'UEFA Nations League', leagueLogo: 'https://flagcdn.com/w80/eu.png', homeTeam: 'Norway', homeTeamLogo: 'https://flagcdn.com/w160/no.png', awayTeam: 'Wales', awayTeamLogo: 'https://flagcdn.com/w160/gb-wls.png', kickoffOffsetMinutes: -140, status: 'FINISHED', minute: 90, homeScore: 3, awayScore: 1, info: 'Terminé: Nusa 59’, Schjelderup 68’, Haaland 88’ (pen) ; Brooks 79’.', odds: [1.65, 3.9, 5.0] },
  { league: 'International Friendly', leagueLogo: 'https://flagcdn.com/w80/un.png', homeTeam: 'Japan', homeTeamLogo: 'https://flagcdn.com/w160/jp.png', awayTeam: 'Brazil', awayTeamLogo: 'https://flagcdn.com/w160/br.png', kickoffOffsetMinutes: -180, status: 'FINISHED', minute: 90, homeScore: 3, awayScore: 2, info: 'Terminé: Kubo 15’, Nakamura 19’, Sakamoto 90+1’ ; Vinícius Jr 33’, 75’.', odds: [3.4, 3.5, 2.0] },
  { league: 'International Friendly', leagueLogo: 'https://flagcdn.com/w80/un.png', homeTeam: 'Ecuador', homeTeamLogo: 'https://flagcdn.com/w160/ec.png', awayTeam: 'Costa Rica', awayTeamLogo: 'https://flagcdn.com/w160/cr.png', kickoffOffsetMinutes: -210, status: 'FINISHED', minute: 90, homeScore: 2, awayScore: 0, info: 'Terminé: victoire 2-0 de l’Équateur.', odds: [1.8, 3.3, 4.5] },
  { league: "Women's Super League", leagueLogo: 'https://flagcdn.com/w80/gb-eng.png', homeTeam: 'Chelsea Women', homeTeamLogo: 'https://crests.football-data.org/61.png', awayTeam: 'Manchester City Women', awayTeamLogo: 'https://crests.football-data.org/65.png', kickoffOffsetMinutes: -240, status: 'FINISHED', minute: 90, homeScore: 1, awayScore: 0, info: 'Terminé: Baltimore 45+4’.', odds: [2.3, 3.2, 2.9] },
  { league: "Women's Super League", leagueLogo: 'https://flagcdn.com/w80/gb-eng.png', homeTeam: 'Manchester United Women', homeTeamLogo: 'https://crests.football-data.org/66.png', awayTeam: 'Crystal Palace Women', awayTeamLogo: 'https://crests.football-data.org/354.png', kickoffOffsetMinutes: -260, status: 'FINISHED', minute: 90, homeScore: 2, awayScore: 0, info: 'Terminé: Le Tissier 18’, Terland 65’.', odds: [1.45, 4.2, 6.5] },
  { league: 'Concacaf Nations League', leagueLogo: 'https://flagcdn.com/w80/un.png', homeTeam: 'Haiti', homeTeamLogo: 'https://flagcdn.com/w160/ht.png', awayTeam: 'United States', awayTeamLogo: 'https://flagcdn.com/w160/us.png', kickoffOffsetMinutes: 180, status: 'UPCOMING', minute: null, homeScore: 0, awayScore: 0, info: 'À venir (réel): quart de finale aller, coup d’envoi prévu ce soir.', odds: [7.5, 4.8, 1.35] },
  { league: 'Concacaf Nations League', leagueLogo: 'https://flagcdn.com/w80/un.png', homeTeam: 'Jamaica', homeTeamLogo: 'https://flagcdn.com/w160/jm.png', awayTeam: 'Mexico', awayTeamLogo: 'https://flagcdn.com/w160/mx.png', kickoffOffsetMinutes: 240, status: 'UPCOMING', minute: null, homeScore: 0, awayScore: 0, info: 'À venir (réel): quart de finale aller à Kingston.', odds: [4.2, 3.4, 1.8] },
  { league: 'International Friendly', leagueLogo: 'https://flagcdn.com/w80/un.png', homeTeam: 'New Zealand', homeTeamLogo: 'https://flagcdn.com/w160/nz.png', awayTeam: 'India', awayTeamLogo: 'https://flagcdn.com/w160/in.png', kickoffOffsetMinutes: 360, status: 'UPCOMING', minute: null, homeScore: 0, awayScore: 0, info: 'À venir (réel): match amical international.', odds: [1.25, 5.5, 10.0] },
];

export function openDatabase(databasePath: string): DatabaseSync {
  const path = databasePath === ':memory:' ? databasePath : resolve(databasePath);
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (path !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      balance INTEGER NOT NULL CHECK (balance >= 0),
      created_at TEXT NOT NULL
    ) STRICT;

    CREATE TABLE IF NOT EXISTS auth_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_user ON auth_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_expiry ON auth_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS two_factor_challenges (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_two_factor_challenges_user ON two_factor_challenges(user_id);

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      league TEXT NOT NULL,
      league_logo TEXT NOT NULL DEFAULT '',
      home_team TEXT NOT NULL,
      home_team_logo TEXT NOT NULL DEFAULT '',
      away_team TEXT NOT NULL,
      away_team_logo TEXT NOT NULL DEFAULT '',
      kickoff TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('LIVE', 'UPCOMING', 'FINISHED')),
      minute INTEGER,
      home_score INTEGER NOT NULL CHECK (home_score >= 0),
      away_score INTEGER NOT NULL CHECK (away_score >= 0),
      info TEXT NOT NULL DEFAULT '',
      home_odds REAL NOT NULL CHECK (home_odds > 1),
      draw_odds REAL NOT NULL CHECK (draw_odds > 1),
      away_odds REAL NOT NULL CHECK (away_odds > 1)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_matches_status_kickoff ON matches(status, kickoff);

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL REFERENCES matches(id),
      selection TEXT NOT NULL CHECK (selection IN ('home', 'draw', 'away')),
      odds REAL NOT NULL CHECK (odds > 1),
      stake INTEGER NOT NULL CHECK (stake >= 10),
      potential_payout INTEGER NOT NULL CHECK (potential_payout >= 0),
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
      idempotency_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      settled_at TEXT,
      payout_amount INTEGER NOT NULL DEFAULT 0 CHECK (payout_amount >= 0),
      UNIQUE (user_id, idempotency_key)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_bets_user_created ON bets(user_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_bets_status_match ON bets(status, match_id);

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
      description TEXT NOT NULL,
      bet_id TEXT REFERENCES bets(id),
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE INDEX IF NOT EXISTS idx_wallet_user_created ON wallet_transactions(user_id, created_at DESC, id DESC);
  `);

  migrateMatches(db);
  migrateBets(db);
  migrateUsers(db);
  seedMatches(db);
  return db;
}

function hasColumn(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function migrateMatches(db: DatabaseSync): void {
  for (const column of ['league_logo', 'home_team_logo', 'away_team_logo', 'info']) {
    if (!hasColumn(db, 'matches', column)) {
      db.exec(`ALTER TABLE matches ADD COLUMN ${column} TEXT NOT NULL DEFAULT ''`);
    }
  }
}

function migrateBets(db: DatabaseSync): void {
  const needsMigration =
    !hasColumn(db, 'bets', 'settled_at') ||
    !hasColumn(db, 'bets', 'payout_amount') ||
    !(() => {
      const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bets'").get() as { sql?: string } | undefined;
      return row?.sql?.includes("'WON'") ?? false;
    })();
  if (!needsMigration) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN IMMEDIATE;
    CREATE TABLE bets_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      match_id TEXT NOT NULL REFERENCES matches(id),
      selection TEXT NOT NULL CHECK (selection IN ('home', 'draw', 'away')),
      odds REAL NOT NULL CHECK (odds > 1),
      stake INTEGER NOT NULL CHECK (stake >= 10),
      potential_payout INTEGER NOT NULL CHECK (potential_payout >= 0),
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'WON', 'LOST', 'REFUNDED')),
      idempotency_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      settled_at TEXT,
      payout_amount INTEGER NOT NULL DEFAULT 0 CHECK (payout_amount >= 0),
      UNIQUE (user_id, idempotency_key)
    ) STRICT;
    INSERT INTO bets_new (id, user_id, match_id, selection, odds, stake, potential_payout, status, idempotency_key, created_at, settled_at, payout_amount)
    SELECT id, user_id, match_id, selection, odds, stake, potential_payout, status, idempotency_key, created_at, NULL, 0 FROM bets;
    DROP TABLE bets;
    ALTER TABLE bets_new RENAME TO bets;
    CREATE INDEX IF NOT EXISTS idx_bets_user_created ON bets(user_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_bets_status_match ON bets(status, match_id);
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function migrateUsers(db: DatabaseSync): void {
  if (!hasColumn(db, 'users', 'email')) db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
  if (!hasColumn(db, 'users', 'password_hash')) db.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
  if (!hasColumn(db, 'users', 'phone')) db.exec(`ALTER TABLE users ADD COLUMN phone TEXT`);
  if (!hasColumn(db, 'users', 'two_factor_secret')) db.exec(`ALTER TABLE users ADD COLUMN two_factor_secret TEXT`);
  if (!hasColumn(db, 'users', 'two_factor_enabled')) {
    db.exec(`ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER NOT NULL DEFAULT 0`);
  }
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
}

function seedMatches(db: DatabaseSync): void {
  const row = db.prepare('SELECT COUNT(*) AS count FROM matches').get() as { count: number };
  const shouldReseed = row.count !== fixtures.length || row.count === 0
    || (db.prepare("SELECT COUNT(*) AS count FROM matches WHERE info = ''").get() as { count: number }).count > 0;
  if (!shouldReseed) return;

  db.exec('DELETE FROM wallet_transactions WHERE bet_id IS NOT NULL; DELETE FROM bets; DELETE FROM matches;');

  const insert = db.prepare(`
    INSERT INTO matches (
      id, league, league_logo, home_team, home_team_logo, away_team, away_team_logo, kickoff, status, minute,
      home_score, away_score, info, home_odds, draw_odds, away_odds
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const fixture of fixtures) {
      insert.run(
        randomUUID(), fixture.league, fixture.leagueLogo, fixture.homeTeam, fixture.homeTeamLogo, fixture.awayTeam, fixture.awayTeamLogo,
        new Date(now + fixture.kickoffOffsetMinutes * 60_000).toISOString(),
        fixture.status, fixture.minute, fixture.homeScore, fixture.awayScore, fixture.info,
        ...fixture.odds,
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
