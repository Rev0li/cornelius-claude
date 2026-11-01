import Fastify, { type FastifyServerOptions } from 'fastify';
import { requireToken } from './auth.js';
import { registerDiscovery } from './discovery.js';

export interface AppOptions {
  token: string;
  server?: FastifyServerOptions;
}

// Construit le serveur sans l'écouter : les tests l'interrogent avec `inject`.
export function buildApp({ token, server = {} }: AppOptions) {
  const app = Fastify(server);
  requireToken(app, token);
  app.get('/health', async () => ({ status: 'ok' }));
  registerDiscovery(app);
  return app;
}
