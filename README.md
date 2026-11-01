# cornelius-claude

Pont local entre [Cornelius](https://github.com/lfpoulain/Cornelius), le miroir conversationnel, et [Claude Code](https://code.claude.com/docs) : on parle à Cornelius, Claude Code travaille dans une fenêtre Kitty visible à côté du miroir, puis Cornelius lit un résumé court.

Le pont imite l'API d'un agent Hermes : Cornelius le relie dans **Administration → Agents**, sans aucune modification de son code.

> 🚧 En construction : rien n'est encore utilisable. Le plan est dans [`docs/`](docs/).

| Doc                                                    | Contenu                                     |
| ------------------------------------------------------ | ------------------------------------------- |
| [00 — Vision](docs/00-vision.md)                       | Le problème, le but, les principes          |
| [01 — Décisions techniques](docs/01-tech-decisions.md) | Stack et décisions (ADR)                    |
| [02 — Architecture](docs/02-architecture.md)           | Composants et flux                          |
| [03 — Scope](docs/03-scope.md)                         | Hors périmètre, risques, questions ouvertes |
| [04 — Roadmap](docs/04-roadmap.md)                     | Sprints et tickets (issues GitHub)          |

## Développer

Il faut **Node.js 24** (24.2 ou plus récent) dans le `PATH` : le pont refuse de démarrer avec une autre version, et `npm install` aussi (`engine-strict`).

```sh
node --version          # v24.x attendu
npm install
cp .env.example .env    # puis : BRIDGE_TOKEN=$(openssl rand -hex 32)
npm start               # http://127.0.0.1:8643/health
```

> [!TIP]
> Si votre Node par défaut est plus ancien, mettez un Node 24 devant dans le `PATH` le temps de la session, par exemple sous Fedora (paquet `nodejs24`, binaire `node-24`) :
>
> ```sh
> mkdir -p .local/node24/bin
> for b in node npm npx; do ln -sf /usr/bin/$b-24 .local/node24/bin/$b; done
> export PATH="$PWD/.local/node24/bin:$PATH"
> ```

| Commande               | Rôle                      |
| ---------------------- | ------------------------- |
| `npm test`             | Tests (`node --test`)     |
| `npm run check`        | Types (TypeScript strict) |
| `npm run format:check` | Mise en forme (Prettier)  |

Le pont n'écoute que sur `127.0.0.1`, ce n'est pas réglable. Il refuse de démarrer sans `BRIDGE_TOKEN` (32 caractères au moins) : c'est le jeton à coller dans Cornelius, **Administration → Agents → Jeton de connexion**. Toutes les routes l'exigent, sauf `/health`.

| Route                    | Rôle                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `GET /health`            | État du pont, sans jeton                                                                                   |
| `GET /v1/capabilities`   | Fonctions annoncées à Cornelius (format Hermes)                                                            |
| `GET /v1/toolsets`       | Outils : `terminal` (`claude_code`)                                                                        |
| `GET /v1/skills`         | Compétence `claude-code`, lue par Cornelius pour choisir quand déléguer                                    |
| `POST /v1/runs`          | Nouvelle tâche (`input`, `session_id`, `instructions`, en-tête `Idempotency-Key`) → `202`                  |
| `GET /v1/runs/:id`       | Suivi : `queued`, `running`, `stopping`, `completed` (avec `output`), `failed`, `cancelled`, `interrupted` |
| `POST /v1/runs/:id/stop` | Arrêt de la tâche (retirée de la file, ou interrompue)                                                     |

Une seule tâche tourne à la fois ; jusqu'à 3 autres attendent leur tour, au-delà la demande est refusée (`409`). Les tâches vivent en mémoire : un redémarrage du pont les oublie. Pour l'instant, un **faux exécutant** répond après quelques secondes en reprenant la demande ; Claude Code le remplacera (CC-09).

## Licence

[MIT](LICENSE)
