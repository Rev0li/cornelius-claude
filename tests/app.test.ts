import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';

test('GET /health répond ok', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
  await app.close();
});

test('une route inconnue répond 404', async () => {
  const app = buildApp();
  const response = await app.inject({ method: 'GET', url: '/inconnue' });
  assert.equal(response.statusCode, 404);
  await app.close();
});
