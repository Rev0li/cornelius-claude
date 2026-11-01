// Réglages lus dans l'environnement (.env chargé par `npm start`).

export interface Config {
  /** Toujours 127.0.0.1 : le pont n'est jamais joignable depuis le réseau (ADR-008). */
  host: '127.0.0.1';
  port: number;
  /** Jeton Bearer que Cornelius présente à chaque requête. */
  token: string;
}

export const DEFAULT_PORT = 8643;
export const MIN_TOKEN_LENGTH = 32;

/** Erreur de réglage : le message suffit, sans pile d'appels. */
export class ConfigError extends Error {}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const raw = env.PORT?.trim();
  const port = raw ? Number(raw) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new ConfigError(`PORT invalide : « ${raw} » (entier de 1 à 65535 attendu).`);

  const token = env.BRIDGE_TOKEN?.trim() ?? '';
  if (token.length < MIN_TOKEN_LENGTH)
    throw new ConfigError(
      `BRIDGE_TOKEN ${token ? 'trop court' : 'absent'} : ${MIN_TOKEN_LENGTH} caractères au moins. ` +
        'Générez-en un avec « openssl rand -hex 32 » et mettez-le dans .env.',
    );

  return { host: '127.0.0.1', port, token };
}
