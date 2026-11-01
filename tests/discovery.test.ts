import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auth, testApp } from './helpers.js';

// Contrat : reprend les règles de discover() dans server/hermes-client.ts de Cornelius.
// Si Cornelius les change, ce test doit changer avec elles.

const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

async function fetchJson(url: string) {
  const app = testApp();
  const response = await app.inject({ method: 'GET', url, headers: auth });
  await app.close();
  assert.equal(response.statusCode, 200, url);
  assert.ok(response.body.length <= 256 * 1024, `${url} dépasse 256 Kio`);
  const data = object(response.json());
  assert.ok(Object.keys(data).length > 0, `${url} : réponse vide`);
  return data;
}

test('capabilities : Cornelius déclare l’agent disponible, sans accord ni précision', async () => {
  const features = object((await fetchJson('/v1/capabilities')).features);
  assert.equal(features.run_submission, true);
  assert.equal(features.run_status, true);
  assert.equal(features.run_stop, true);
  // Cornelius : approval = run_approval_response === true || run_approval === true.
  assert.notEqual(features.run_approval_response, true);
  assert.notEqual(features.run_approval, true);
  assert.notEqual(features.run_steer, true);
});

test('toolsets : chaque entrée est retenue par Cornelius, sans troncature', async () => {
  const { data } = await fetchJson('/v1/toolsets');
  assert.ok(Array.isArray(data) && data.length > 0 && data.length <= 150);
  for (const raw of data) {
    const row = object(raw);
    assert.equal(row.enabled, true);
    assert.equal(row.configured, true);
    assert.ok(typeof row.name === 'string' && row.name.length > 0 && row.name.length <= 100);
    assert.ok(typeof row.description === 'string' && row.description.length <= 350);
    assert.ok(Array.isArray(row.tools) && row.tools.length <= 30);
    for (const tool of row.tools) assert.ok(typeof tool === 'string' && tool.length <= 80);
  }
});

test('skills : la compétence claude-code est retenue par Cornelius, sans troncature', async () => {
  const { data } = await fetchJson('/v1/skills');
  assert.ok(Array.isArray(data) && data.length > 0 && data.length <= 150);
  for (const raw of data) {
    const row = object(raw);
    assert.notEqual(row.disabled, true);
    assert.notEqual(row.enabled, false);
    assert.notEqual(row.available, false);
    assert.ok(typeof row.name === 'string' && row.name.length > 0 && row.name.length <= 100);
    assert.ok(typeof row.description === 'string' && row.description.length <= 350);
  }
  assert.ok(data.some((row) => object(row).name === 'claude-code'));
});

test('aucun texte de découverte ne contient de caractère de contrôle', async () => {
  for (const url of ['/v1/capabilities', '/v1/toolsets', '/v1/skills'])
    assert.doesNotMatch(JSON.stringify(await fetchJson(url)), /\\u00[01][0-9a-f]/i, url);
});
