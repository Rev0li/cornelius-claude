import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigError, DEFAULT_PORT, loadConfig } from '../src/config.js';
import { TOKEN } from './helpers.js';

const base = { BRIDGE_TOKEN: TOKEN };

test('sans PORT : port par défaut, écoute locale', () => {
  assert.deepEqual(loadConfig(base), { host: '127.0.0.1', port: DEFAULT_PORT, token: TOKEN });
});

test('PORT valide est repris', () => {
  assert.equal(loadConfig({ ...base, PORT: ' 9000 ' }).port, 9000);
});

test('PORT invalide est refusé', () => {
  for (const PORT of ['0', '65536', '80.5', 'abc', '-1'])
    assert.throws(() => loadConfig({ ...base, PORT }), /PORT invalide/, PORT);
});

test("l'hôte ne se règle pas depuis l'environnement", () => {
  assert.equal(loadConfig({ ...base, HOST: '0.0.0.0' }).host, '127.0.0.1');
});

test('BRIDGE_TOKEN absent ou trop court est refusé, avec la commande pour en créer un', () => {
  for (const BRIDGE_TOKEN of [undefined, '', '   ', 'a'.repeat(31)])
    assert.throws(
      () => loadConfig({ BRIDGE_TOKEN }),
      (error: unknown) =>
        error instanceof ConfigError &&
        /BRIDGE_TOKEN (absent|trop court)/.test(error.message) &&
        error.message.includes('openssl rand -hex 32'),
      String(BRIDGE_TOKEN),
    );
});

test('BRIDGE_TOKEN de 32 caractères est accepté, espaces retirés', () => {
  assert.equal(loadConfig({ BRIDGE_TOKEN: ` ${'a'.repeat(32)} ` }).token, 'a'.repeat(32));
});
