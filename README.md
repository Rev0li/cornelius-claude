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
cp .env.example .env    # facultatif : port d'écoute
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

Le pont n'écoute que sur `127.0.0.1`, ce n'est pas réglable.

## Licence

[MIT](LICENSE)
