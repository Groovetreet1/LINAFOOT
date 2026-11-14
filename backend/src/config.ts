export interface AppOptions {
  databasePath?: string;
  tokenTtlHours?: number;
}

function positiveNumber(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

export function getConfig() {
  return {
    port: Math.floor(positiveNumber(process.env.PORT, 3000, 'PORT')),
    host: process.env.HOST ?? '127.0.0.1',
    databasePath: process.env.DATABASE_PATH ?? './data/atlasfoot.sqlite',
    tokenTtlHours: positiveNumber(process.env.TOKEN_TTL_HOURS, 168, 'TOKEN_TTL_HOURS'),
  };
}
