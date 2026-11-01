import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApp } from '../src/app.js';
import { sameToken } from '../src/auth.js';
import { auth, TOKEN, testApp } from './helpers.js';

const get = async (url: string, authorization?: string) => {
  const app = testApp();
  const response = await app.inject({
    method: 'GET',
    url,
    headers: authorization === undefined ? {} : { authorization },
  });
  await app.close();
  return response;
};

test('sans jeton ou avec un mauvais jeton : 401', async () => {
  for (const authorization of [
    undefined,
    '',
    'Bearer',
    'Bearer ',
    `Bearer ${TOKEN}x`,
    `Bearer ${TOKEN.slice(0, -1)}`,
    `bearer ${TOKEN}`,
    `Basic ${TOKEN}`,
    TOKEN,
  ]) {
    const response = await get('/v1/capabilities', authorization);
    assert.equal(response.statusCode, 401, String(authorization));
    assert.equal(response.json().error.type, 'authentication_error');
  }
});

test('avec le bon jeton : 200', async () => {
  assert.equal((await get('/v1/capabilities', `Bearer ${TOKEN}`)).statusCode, 200);
});

test('une route inconnue sans jeton répond 401, pas 404', async () => {
  assert.equal((await get('/v1/runs/inconnue')).statusCode, 401);
  assert.equal((await get('/ailleurs')).statusCode, 401);
});

test('variantes de méthode et d’adresse sans jeton : 401', async () => {
  for (const [method, url] of [
    ['HEAD', '/v1/capabilities'],
    ['OPTIONS', '/v1/capabilities'],
    ['GET', '/v1/capabilities/'],
    ['GET', '/V1/capabilities'],
    ['GET', '/v1/capabilities?route=/health'],
    ['GET', '/health/'],
  ] as const) {
    const app = testApp();
    const response = await app.inject({ method, url });
    await app.close();
    assert.equal(response.statusCode, 401, `${method} ${url}`);
  }
});

test('HEAD /health reste public', async () => {
  const app = testApp();
  assert.equal((await app.inject({ method: 'HEAD', url: '/health' })).statusCode, 200);
  await app.close();
});

test('le journal ne contient jamais le jeton', async () => {
  const lines: string[] = [];
  const app = buildApp({
    token: TOKEN,
    server: { logger: { level: 'trace', stream: { write: (line: string) => lines.push(line) } } },
  });
  await app.inject({ method: 'GET', url: '/v1/capabilities', headers: auth });
  await app.inject({
    method: 'GET',
    url: '/v1/capabilities',
    headers: { authorization: 'Bearer x' },
  });
  await app.close();
  assert.ok(lines.length > 0);
  assert.ok(lines.every((line) => !line.includes(TOKEN)));
});

test('le message d’erreur ne renvoie pas le jeton reçu', async () => {
  const response = await get('/v1/capabilities', 'Bearer secret-envoye-par-erreur');
  assert.ok(!response.body.includes('secret-envoye-par-erreur'));
});

test('sameToken compare des jetons de longueurs différentes sans lever', () => {
  assert.equal(sameToken('a', 'a'), true);
  assert.equal(sameToken('a', 'ab'), false);
  assert.equal(sameToken('', TOKEN), false);
});
