// Réglages lus dans l'environnement (.env chargé par `npm start`).

export interface Config {
  /** Toujours 127.0.0.1 : le pont n'est jamais joignable depuis le réseau (ADR-008). */
  host: '127.0.0.1';
  port: number;
}

export const DEFAULT_PORT = 8643;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const raw = env.PORT?.trim();
  const port = raw ? Number(raw) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error(`PORT invalide : « ${raw} » (entier de 1 à 65535 attendu).`);
  return { host: '127.0.0.1', port };
}
