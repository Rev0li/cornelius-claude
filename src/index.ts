import { buildApp } from './app.js';
import { ConfigError, loadConfig, type Config } from './config.js';

const [major = 0, minor = 0] = process.versions.node.split('.').map(Number);
if (major !== 24 || minor < 2) {
  console.error(
    `Node.js ${process.version} détecté : le pont demande Node.js 24.2 ou plus récent.`,
  );
  process.exit(1);
}

let config: Config;
try {
  config = loadConfig();
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;
  console.error(error.message);
  process.exit(1);
}

const app = buildApp({ token: config.token, server: { logger: true } });

// systemd arrête le service par SIGTERM : on ferme proprement les connexions.
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });

await app.listen({ host: config.host, port: config.port });
