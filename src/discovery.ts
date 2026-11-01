import type { FastifyInstance } from 'fastify';

// Découverte au format de l'API Hermes, telle que Cornelius la lit
// (server/hermes-client.ts, discover()). On n'annonce que ce qui existe.

export const SKILL_DESCRIPTION =
  "Confie une tâche à Claude Code, qui travaille dans un terminal visible sur l'ordinateur du " +
  'miroir, dans le dossier de travail dédié : écrire ou corriger du code, lancer des commandes, ' +
  'expliquer ou explorer un projet. Tâches de quelques minutes ; la réponse est un résumé court.';

export const capabilities = {
  object: 'hermes.api_server.capabilities',
  platform: 'cornelius-claude',
  auth: { type: 'bearer', required: true },
  features: {
    // Exigés par Cornelius pour déclarer l'agent disponible.
    run_submission: true,
    run_status: true,
    run_stop: true,
    // Précision pendant le travail : annoncée avec CC-10.
    run_steer: false,
    // Les accords se donnent dans le terminal (ADR-005).
    run_approval_response: false,
  },
  endpoints: {
    health: { method: 'GET', path: '/health' },
    runs: { method: 'POST', path: '/v1/runs' },
    run_status: { method: 'GET', path: '/v1/runs/{run_id}' },
    run_stop: { method: 'POST', path: '/v1/runs/{run_id}/stop' },
    skills: { method: 'GET', path: '/v1/skills' },
    toolsets: { method: 'GET', path: '/v1/toolsets' },
  },
};

export const toolsets = {
  object: 'list',
  platform: 'cornelius-claude',
  data: [
    {
      name: 'terminal',
      label: 'Claude Code',
      description: 'Claude Code dans un terminal visible, limité au dossier de travail',
      enabled: true,
      configured: true,
      tools: ['claude_code'],
    },
  ],
};

export const skills = {
  object: 'list',
  data: [{ name: 'claude-code', description: SKILL_DESCRIPTION, category: 'autonomous-ai-agents' }],
};

export function registerDiscovery(app: FastifyInstance) {
  app.get('/v1/capabilities', async () => capabilities);
  app.get('/v1/toolsets', async () => toolsets);
  app.get('/v1/skills', async () => skills);
}
