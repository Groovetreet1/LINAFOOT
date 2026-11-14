import { buildApp } from './app.ts';
import { getConfig } from './config.ts';

const config = getConfig();
const app = await buildApp({ databasePath: config.databasePath, tokenTtlHours: config.tokenTtlHours });

try {
  await app.listen({ port: config.port, host: config.host });
  console.log(`AtlasFoot sandbox API listening on http://${config.host}:${config.port}`);
} catch (error) {
  app.log.error(error);
  await app.close();
  process.exit(1);
}
