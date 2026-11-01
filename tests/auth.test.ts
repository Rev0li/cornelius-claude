import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sameToken } from '../src/auth.js';
import { TOKEN, testApp } from './helpers.js';

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

test('le message d’erreur ne renvoie pas le jeton reçu', async () => {
  const response = await get('/v1/capabilities', 'Bearer secret-envoye-par-erreur');
  assert.ok(!response.body.includes('secret-envoye-par-erreur'));
});

test('sameToken compare des jetons de longueurs différentes sans lever', () => {
  assert.equal(sameToken('a', 'a'), true);
  assert.equal(sameToken('a', 'ab'), false);
  assert.equal(sameToken('', TOKEN), false);
});
