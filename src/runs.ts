import { createHash, randomUUID } from 'node:crypto';
import type { Executor, Task } from './executor.js';

// Registre des tâches au format « run » de Hermes. Une seule tâche tourne à la fois ;
// les suivantes attendent dans une file courte. Tout vit en mémoire (02-architecture).

export type RunStatus =
  'queued' | 'running' | 'stopping' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

const TERMINAL: ReadonlySet<RunStatus> = new Set([
  'completed',
  'failed',
  'cancelled',
  'interrupted',
]);
export const isTerminal = (status: RunStatus) => TERMINAL.has(status);

export interface RunView {
  object: 'hermes.run';
  run_id: string;
  status: RunStatus;
  session_id: string;
  output: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

interface Run {
  view: RunView;
  task: Task;
  fingerprint: string;
  idempotencyKey: string | null;
  abort: AbortController;
}

export class QueueFullError extends Error {}
export class IdempotencyConflictError extends Error {}

export interface RegistryOptions {
  executor: Executor;
  maxQueued?: number;
  /** Tâches terminées gardées pour le suivi ; les plus anciennes sont oubliées. */
  retainFinished?: number;
  now?: () => number;
}

const seconds = (ms: number) => Math.floor(ms / 1000);

export class RunRegistry {
  private readonly runs = new Map<string, Run>();
  private readonly byKey = new Map<string, string>();
  private readonly queue: string[] = [];
  private active: string | null = null;
  private readonly executor: Executor;
  private readonly maxQueued: number;
  private readonly retainFinished: number;
  private readonly now: () => number;

  constructor({ executor, maxQueued = 3, retainFinished = 100, now = Date.now }: RegistryOptions) {
    this.executor = executor;
    this.maxQueued = maxQueued;
    this.retainFinished = retainFinished;
    this.now = now;
  }

  /**
   * Crée une tâche, ou rejoue celle déjà créée avec la même clé d'idempotence.
   * Sans session donnée, une nouvelle session est ouverte ; l'empreinte porte sur la demande
   * reçue, pas sur cette session générée, pour qu'un rejeu reste identique.
   */
  submit(
    request: Omit<Task, 'sessionId'> & { sessionId: string | null },
    idempotencyKey: string | null,
  ): { run: RunView; replayed: boolean } {
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    if (idempotencyKey) {
      const existing = this.runs.get(this.byKey.get(idempotencyKey) ?? '');
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new IdempotencyConflictError(
            'Clé d’idempotence déjà utilisée pour une autre demande.',
          );
        return { run: { ...existing.view }, replayed: true };
      }
    }
    if (this.active && this.queue.length >= this.maxQueued)
      throw new QueueFullError('Trop de demandes en attente.');

    const task: Task = { ...request, sessionId: request.sessionId ?? 'session_' + randomUUID() };
    const at = seconds(this.now());
    const run: Run = {
      view: {
        object: 'hermes.run',
        run_id: 'run_' + randomUUID(),
        status: 'queued',
        session_id: task.sessionId,
        output: null,
        error: null,
        created_at: at,
        updated_at: at,
      },
      task,
      fingerprint,
      idempotencyKey,
      abort: new AbortController(),
    };
    this.runs.set(run.view.run_id, run);
    if (idempotencyKey) this.byKey.set(idempotencyKey, run.view.run_id);
    this.queue.push(run.view.run_id);
    this.pump();
    return { run: { ...run.view }, replayed: false };
  }

  get(runId: string): RunView | null {
    const run = this.runs.get(runId);
    return run ? { ...run.view } : null;
  }

  /** Arrête une tâche : retirée de la file, ou interrompue si elle tourne. */
  stop(runId: string): RunView | null {
    const run = this.runs.get(runId);
    if (!run) return null;
    if (run.view.status === 'queued') {
      this.queue.splice(this.queue.indexOf(runId), 1);
      this.finish(run, 'cancelled');
    } else if (run.view.status === 'running') {
      this.update(run, 'stopping');
      run.abort.abort(new Error('Arrêt demandé.'));
    }
    return { ...run.view };
  }

  /** Arrêt du pont : la tâche en cours est interrompue, la file annulée. */
  shutdown() {
    for (const runId of this.queue.splice(0)) this.finish(this.runs.get(runId)!, 'cancelled');
    const active = this.active && this.runs.get(this.active);
    if (active) active.abort.abort(new Error('Arrêt du pont.'));
  }

  private pump() {
    if (this.active) return;
    const runId = this.queue.shift();
    if (!runId) return;
    const run = this.runs.get(runId)!;
    this.active = runId;
    this.update(run, 'running');
    this.executor.run(run.task, run.abort.signal).then(
      (output) => {
        if (run.abort.signal.aborted) this.finish(run, this.abortedStatus(run));
        else this.finish(run, 'completed', { output });
      },
      () => {
        if (run.abort.signal.aborted) this.finish(run, this.abortedStatus(run));
        else this.finish(run, 'failed', { error: 'La tâche a échoué.' });
      },
    );
  }

  private abortedStatus(run: Run): RunStatus {
    return run.view.status === 'stopping' ? 'cancelled' : 'interrupted';
  }

  private update(run: Run, status: RunStatus, fields: Partial<RunView> = {}) {
    Object.assign(run.view, fields, { status, updated_at: seconds(this.now()) });
  }

  private finish(run: Run, status: RunStatus, fields: Partial<RunView> = {}) {
    this.update(run, status, fields);
    if (this.active === run.view.run_id) {
      this.active = null;
      this.pump();
    }
    this.forgetOldest();
  }

  private forgetOldest() {
    const finished = [...this.runs.values()].filter((run) => isTerminal(run.view.status));
    for (const run of finished.slice(0, Math.max(0, finished.length - this.retainFinished))) {
      this.runs.delete(run.view.run_id);
      if (run.idempotencyKey) this.byKey.delete(run.idempotencyKey);
    }
  }
}
