import { createHash, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';

// Routes ouvertes sans jeton : elles ne révèlent rien.
const PUBLIC_ROUTES = new Set(['/health']);

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Compare en temps constant : les empreintes ont toujours la même longueur. */
export function sameToken(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * Exige `Authorization: Bearer <jeton>` partout sauf sur les routes publiques.
 * Une route inconnue répond aussi 401 sans jeton : on ne dévoile pas ce qui existe.
 */
export function requireToken(app: FastifyInstance, token: string) {
  app.addHook('onRequest', async (request, reply) => {
    if (request.routeOptions.url && PUBLIC_ROUTES.has(request.routeOptions.url)) return;
    const match = /^Bearer (.+)$/.exec(request.headers.authorization ?? '');
    if (match?.[1] && sameToken(match[1], token)) return;
    return reply.code(401).send({
      error: { message: 'Jeton absent ou invalide.', type: 'authentication_error' },
    });
  });
}
