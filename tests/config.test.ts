import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_PORT, loadConfig } from '../src/config.js';

test('sans PORT : port par défaut, écoute locale', () => {
  assert.deepEqual(loadConfig({}), { host: '127.0.0.1', port: DEFAULT_PORT });
});

test('PORT valide est repris', () => {
  assert.equal(loadConfig({ PORT: ' 9000 ' }).port, 9000);
});

test('PORT invalide est refusé', () => {
  for (const PORT of ['0', '65536', '80.5', 'abc', '-1'])
    assert.throws(() => loadConfig({ PORT }), /PORT invalide/, PORT);
});

test("l'hôte ne se règle pas depuis l'environnement", () => {
  assert.equal(loadConfig({ HOST: '0.0.0.0' } as NodeJS.ProcessEnv).host, '127.0.0.1');
});
