import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auth, testApp } from './helpers.js';

test('GET /health répond ok, sans jeton', async () => {
  const app = testApp();
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
  await app.close();
});

test('une route inconnue répond 404 avec le jeton', async () => {
  const app = testApp();
  const response = await app.inject({ method: 'GET', url: '/inconnue', headers: auth });
  assert.equal(response.statusCode, 404);
  await app.close();
});
