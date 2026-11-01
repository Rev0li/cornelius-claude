import Fastify, { type FastifyServerOptions } from 'fastify';

// Construit le serveur sans l'écouter : les tests l'interrogent avec `inject`.
export function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);
  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}
