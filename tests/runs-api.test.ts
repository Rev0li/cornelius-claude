import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { fakeExecutor } from '../src/executor.js';
import { auth, TOKEN } from './helpers.js';

const app = (delayMs = 20) => buildApp({ token: TOKEN, executor: fakeExecutor(delayMs) });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const submit = (
  server: ReturnType<typeof app>,
  payload: Record<string, unknown>,
  headers: Record<string, string> = {},
) => server.inject({ method: 'POST', url: '/v1/runs', headers: { ...auth, ...headers }, payload });

test('POST /v1/runs → 202, puis GET suit la tâche jusqu’au résumé', async () => {
  const server = app();
  const created = await submit(server, { input: 'liste les fichiers', session_id: 's-1' });
  assert.equal(created.statusCode, 202);
  const { run_id, status, replayed } = created.json();
  assert.equal(status, 'running');
  assert.equal(replayed, false);

  await wait(60);
  const done = await server.inject({ method: 'GET', url: `/v1/runs/${run_id}`, headers: auth });
  assert.equal(done.statusCode, 200);
  const view = done.json();
  assert.equal(view.run_id, run_id);
  assert.equal(view.status, 'completed');
  assert.equal(view.session_id, 's-1');
  assert.match(view.output, /liste les fichiers/);
  await server.close();
});

test('Idempotency-Key : rejeu identique → même tâche ; autre demande → 409', async () => {
  const server = app(1000);
  const headers = { 'idempotency-key': 'tache-123' };
  const first = (await submit(server, { input: 'a' }, headers)).json();
  const again = await submit(server, { input: 'a' }, headers);
  assert.equal(again.statusCode, 202);
  assert.equal(again.json().run_id, first.run_id);
  assert.equal(again.json().replayed, true);
  const conflict = await submit(server, { input: 'b' }, headers);
  assert.equal(conflict.statusCode, 409);
  assert.equal(conflict.json().error.code, 'idempotency_key_conflict');
  await server.close();
});

test('file : la 2e demande attend, la 5e est refusée', async () => {
  const server = app(1000);
  const statuses = [];
  for (const input of ['1', '2', '3', '4', '5'])
    statuses.push((await submit(server, { input })).statusCode);
  assert.deepEqual(statuses, [202, 202, 202, 202, 409]);
  await server.close();
});

test('POST /v1/runs/:id/stop arrête la tâche', async () => {
  const server = app(1000);
  const { run_id } = (await submit(server, { input: 'long' })).json();
  const stop = await server.inject({
    method: 'POST',
    url: `/v1/runs/${run_id}/stop`,
    headers: auth,
    payload: {},
  });
  assert.equal(stop.statusCode, 200);
  assert.deepEqual(stop.json(), { run_id, status: 'stopping' });
  await wait(10);
  const view = (
    await server.inject({ method: 'GET', url: `/v1/runs/${run_id}`, headers: auth })
  ).json();
  assert.equal(view.status, 'cancelled');
  await server.close();
});

test('tâche inconnue → 404 (suivi et arrêt)', async () => {
  const server = app();
  for (const [method, url] of [
    ['GET', '/v1/runs/run_inconnue'],
    ['POST', '/v1/runs/run_inconnue/stop'],
  ] as const) {
    const response = await server.inject({
      method,
      url,
      headers: auth,
      payload: method === 'POST' ? {} : undefined,
    });
    assert.equal(response.statusCode, 404, url);
    assert.equal(response.json().error.code, 'run_not_found');
  }
  await server.close();
});

test('demandes invalides → 400', async () => {
  const server = app();
  for (const [payload, headers] of [
    [{}, {}],
    [{ input: '' }, {}],
    [{ input: '   ' }, {}],
    [{ input: 42 }, {}],
    [{ input: 'x'.repeat(16001) }, {}],
    [{ input: 'ok', session_id: '../../etc' }, {}],
    [{ input: 'ok' }, { 'idempotency-key': 'clé avec espaces' }],
  ] as const) {
    const response = await submit(server, payload, headers);
    assert.equal(response.statusCode, 400, JSON.stringify([payload, headers]));
  }
  const badId = await server.inject({ method: 'GET', url: '/v1/runs/a%2Fb', headers: auth });
  assert.equal(badId.statusCode, 400);
  await server.close();
});

test('les routes des tâches exigent le jeton', async () => {
  const server = app();
  for (const [method, url] of [
    ['POST', '/v1/runs'],
    ['GET', '/v1/runs/run_x'],
    ['POST', '/v1/runs/run_x/stop'],
  ] as const)
    assert.equal((await server.inject({ method, url, payload: {} })).statusCode, 401, url);
  await server.close();
});
