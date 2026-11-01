import type { FastifyInstance, FastifyReply } from 'fastify';
import { IdempotencyConflictError, QueueFullError, type RunRegistry } from './runs.js';

// Routes des tâches, au format de l'API Hermes lu par Cornelius (server/agents.ts).

const ID = '^[a-zA-Z0-9_-]{1,200}$';

interface SubmitBody {
  input: string;
  session_id?: string;
  instructions?: string;
}

const submitSchema = {
  body: {
    type: 'object',
    required: ['input'],
    properties: {
      input: { type: 'string', minLength: 1, maxLength: 16000, pattern: '\\S' },
      session_id: { type: 'string', pattern: ID },
      instructions: { type: 'string', maxLength: 4000 },
    },
  },
  headers: {
    type: 'object',
    properties: { 'idempotency-key': { type: 'string', pattern: ID } },
  },
};

const runParams = {
  params: {
    type: 'object',
    required: ['runId'],
    properties: { runId: { type: 'string', pattern: ID } },
  },
};

const error = (reply: FastifyReply, status: number, code: string, message: string) =>
  reply.code(status).send({ error: { message, type: 'invalid_request_error', code } });

const notFound = (reply: FastifyReply) => error(reply, 404, 'run_not_found', 'Tâche introuvable.');

export function registerRuns(app: FastifyInstance, registry: RunRegistry) {
  app.post<{ Body: SubmitBody }>('/v1/runs', { schema: submitSchema }, async (request, reply) => {
    const { input, session_id, instructions } = request.body;
    const key = request.headers['idempotency-key'];
    try {
      const { run, replayed } = registry.submit(
        {
          input: input.trim(),
          sessionId: session_id ?? null,
          instructions: instructions?.trim() || null,
        },
        typeof key === 'string' ? key : null,
      );
      return reply.code(202).send({ run_id: run.run_id, status: run.status, replayed });
    } catch (e) {
      if (e instanceof IdempotencyConflictError)
        return error(reply, 409, 'idempotency_key_conflict', e.message);
      if (e instanceof QueueFullError) return error(reply, 409, 'queue_full', e.message);
      throw e;
    }
  });

  app.get<{ Params: { runId: string } }>(
    '/v1/runs/:runId',
    { schema: runParams },
    async (request, reply) => registry.get(request.params.runId) ?? notFound(reply),
  );

  app.post<{ Params: { runId: string } }>(
    '/v1/runs/:runId/stop',
    { schema: runParams },
    async (request, reply) => {
      const run = registry.stop(request.params.runId);
      return run ? { run_id: run.run_id, status: run.status } : notFound(reply);
    },
  );
}
