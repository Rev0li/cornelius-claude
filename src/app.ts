import Fastify, { type FastifyServerOptions } from 'fastify';
import { requireToken } from './auth.js';
import { registerDiscovery } from './discovery.js';
import { fakeExecutor, type Executor } from './executor.js';
import { RunRegistry } from './runs.js';
import { registerRuns } from './runs-api.js';

export interface AppOptions {
  token: string;
  executor?: Executor;
  server?: FastifyServerOptions;
}

// Construit le serveur sans l'écouter : les tests l'interrogent avec `inject`.
export function buildApp({ token, executor = fakeExecutor(), server = {} }: AppOptions) {
  // Pas de conversion de types : un `input` numérique est refusé, pas changé en texte.
  const app = Fastify({ ...server, ajv: { customOptions: { coerceTypes: false } } });
  const registry = new RunRegistry({ executor });
  app.addHook('onClose', async () => registry.shutdown());
  requireToken(app, token);
  app.get('/health', async () => ({ status: 'ok' }));
  registerDiscovery(app);
  registerRuns(app, registry);
  return app;
}
