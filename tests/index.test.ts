import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { TOKEN } from './helpers.js';

// Lance le vrai point d'entrée, comme `npm start`, dans un processus séparé.
function start(env: NodeJS.ProcessEnv) {
  return spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    env: { ...process.env, BRIDGE_TOKEN: TOKEN, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function refusal(env: NodeJS.ProcessEnv) {
  const child = start(env);
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => (stderr += chunk));
  const [code] = await once(child, 'exit');
  return { code: code as number, stderr };
}

async function freePort() {
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address() as { port: number };
  server.close();
  return port;
}

test('démarre, répond sur /health, puis s’arrête proprement sur SIGTERM', async () => {
  const port = await freePort();
  const child = start({ PORT: String(port) });
  try {
    let output = '';
    child.stdout.setEncoding('utf8');
    await new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (chunk: string) => {
        output += chunk;
        if (output.includes('Server listening')) resolve();
      });
      child.once('exit', (code) => reject(new Error(`arrêt prématuré (code ${code})`)));
    });
    assert.match(output, new RegExp(`http://127\\.0\\.0\\.1:${port}`));

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });

    child.kill('SIGTERM');
    const [code] = await once(child, 'exit');
    assert.equal(code, 0);
  } finally {
    child.kill('SIGKILL');
  }
});

test('refuse de démarrer avec un PORT invalide, sans pile d’appels', async () => {
  const { code, stderr } = await refusal({ PORT: 'abc' });
  assert.equal(code, 1);
  assert.match(stderr, /PORT invalide/);
  assert.doesNotMatch(stderr, /\n\s+at /);
});

test('refuse de démarrer sans BRIDGE_TOKEN', async () => {
  const { code, stderr } = await refusal({ BRIDGE_TOKEN: '' });
  assert.equal(code, 1);
  assert.match(stderr, /BRIDGE_TOKEN absent/);
});
