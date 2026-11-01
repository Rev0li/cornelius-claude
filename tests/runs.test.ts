import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Executor, Task } from '../src/executor.js';
import { IdempotencyConflictError, QueueFullError, RunRegistry } from '../src/runs.js';

// Exécutant piloté à la main : chaque tâche attend qu'on la termine ou qu'on l'échoue.
function manualExecutor() {
  const pending: { task: Task; resolve: (out: string) => void; reject: (e: Error) => void }[] = [];
  const executor: Executor = {
    run: (task, signal) =>
      new Promise((resolve, reject) => {
        pending.push({ task, resolve, reject });
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
  };
  return { executor, pending };
}

const task = (input: string): Task => ({ input, sessionId: 's1', instructions: null });
const tick = () => new Promise((resolve) => setImmediate(resolve));

test('une tâche passe de running à completed avec le résumé', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const { run, replayed } = registry.submit(task('bonjour'), null);
  assert.equal(replayed, false);
  assert.match(run.run_id, /^run_[a-zA-Z0-9_-]+$/);
  assert.equal(registry.get(run.run_id)!.status, 'running');
  pending[0]!.resolve('Fait.');
  await tick();
  const done = registry.get(run.run_id)!;
  assert.equal(done.status, 'completed');
  assert.equal(done.output, 'Fait.');
  assert.equal(done.session_id, 's1');
});

test('un échec de l’exécutant donne failed, sans détail interne', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const { run } = registry.submit(task('x'), null);
  pending[0]!.reject(new Error('/chemin/secret introuvable'));
  await tick();
  const failed = registry.get(run.run_id)!;
  assert.equal(failed.status, 'failed');
  assert.ok(!failed.error!.includes('/chemin/secret'));
});

test('une seule tâche à la fois, les suivantes attendent dans l’ordre', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const a = registry.submit(task('a'), null).run;
  const b = registry.submit(task('b'), null).run;
  const c = registry.submit(task('c'), null).run;
  assert.equal(b.status, 'queued');
  assert.equal(pending.length, 1);
  pending[0]!.resolve('A');
  await tick();
  assert.equal(registry.get(a.run_id)!.status, 'completed');
  assert.equal(registry.get(b.run_id)!.status, 'running');
  assert.equal(registry.get(c.run_id)!.status, 'queued');
  assert.equal(pending[1]!.task.input, 'b');
});

test('file pleine : au-delà de 3 en attente, refus', () => {
  const { executor } = manualExecutor();
  const registry = new RunRegistry({ executor });
  for (const input of ['actif', 'q1', 'q2', 'q3']) registry.submit(task(input), null);
  assert.throws(() => registry.submit(task('de trop'), null), QueueFullError);
});

test('arrêt d’une tâche en attente : cancelled, jamais lancée', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  registry.submit(task('a'), null);
  const b = registry.submit(task('b'), null).run;
  assert.equal(registry.stop(b.run_id)!.status, 'cancelled');
  pending[0]!.resolve('A');
  await tick();
  assert.equal(pending.length, 1);
});

test('arrêt d’une tâche en cours : stopping puis cancelled, la suivante démarre', async () => {
  const { executor } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const a = registry.submit(task('a'), null).run;
  const b = registry.submit(task('b'), null).run;
  assert.equal(registry.stop(a.run_id)!.status, 'stopping');
  await tick();
  assert.equal(registry.get(a.run_id)!.status, 'cancelled');
  assert.equal(registry.get(b.run_id)!.status, 'running');
});

test('arrêt d’une tâche terminée : état inchangé', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const a = registry.submit(task('a'), null).run;
  pending[0]!.resolve('A');
  await tick();
  assert.equal(registry.stop(a.run_id)!.status, 'completed');
});

test('même clé, même demande : la même tâche est rejouée', () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const first = registry.submit(task('a'), 'cle-1').run;
  const again = registry.submit(task('a'), 'cle-1');
  assert.equal(again.replayed, true);
  assert.equal(again.run.run_id, first.run_id);
  assert.equal(pending.length, 1);
});

test('même clé, autre demande : conflit', () => {
  const { executor } = manualExecutor();
  const registry = new RunRegistry({ executor });
  registry.submit(task('a'), 'cle-1');
  assert.throws(() => registry.submit(task('b'), 'cle-1'), IdempotencyConflictError);
});

test('les tâches terminées les plus anciennes sont oubliées', async () => {
  const { executor, pending } = manualExecutor();
  const registry = new RunRegistry({ executor, retainFinished: 2 });
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    ids.push(registry.submit(task(String(i)), `cle-${i}`).run.run_id);
    pending[i]!.resolve('ok');
    await tick();
  }
  assert.equal(registry.get(ids[0]!), null);
  assert.equal(registry.get(ids[2]!)!.status, 'completed');
  // Clé oubliée avec sa tâche : elle peut resservir.
  assert.equal(registry.submit(task('autre'), 'cle-0').replayed, false);
});

test('arrêt du pont : en cours → interrupted, en file → cancelled', async () => {
  const { executor } = manualExecutor();
  const registry = new RunRegistry({ executor });
  const a = registry.submit(task('a'), null).run;
  const b = registry.submit(task('b'), null).run;
  registry.shutdown();
  await tick();
  assert.equal(registry.get(a.run_id)!.status, 'interrupted');
  assert.equal(registry.get(b.run_id)!.status, 'cancelled');
});
