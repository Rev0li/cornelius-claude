# 02 — Architecture (de départ)

> ⚠️ **Architecture de départ, susceptible d'évoluer.** Ce document est un point
> de départ, pas un contrat. Quand l'archi change en cours de route, mettre ce
> fichier à jour et noter le changement.

## Vue d'ensemble

```
 Toi (voix)
    │
    ▼
 Cornelius (miroir, :3000) ──HTTP + Bearer──▶ Pont cornelius-claude (127.0.0.1:8643)
    ▲   « agent Hermes »                          │            ▲
    │                                    tmux send-keys        │ hook Stop (HTTP local)
    │ résumé lu à voix haute                      ▼            │
    └──────────── output du run ◀──  tmux « cornelius-claude » : claude (bac à sable)
                                                  │
                                                  ▼
                                       Fenêtre Kitty (à côté du miroir)
```

## Composants
| Composant | Rôle | Techno |
|---|---|---|
| API Hermes simulée | `/v1/capabilities`, `/v1/toolsets`, `/v1/skills`, `/v1/runs`, `/v1/runs/:id`, `/stop`, `/steer` ; jeton Bearer | Fastify |
| Registre des tâches | runs, sessions, statuts (`queued`, `running`, `completed`, `failed`, `cancelled`, `interrupted`), clé d'idempotence ; une tâche active à la fois | TypeScript, en mémoire |
| Pilote tmux | crée ou réutilise la session, lance `claude` dans le bac à sable, tape la demande en mode littéral, interrompt (Échap) | `tmux` en sous-processus |
| Ouvreur Kitty | ouvre `kitty --class cornelius-claude tmux attach` si aucun client n'est attaché | `kitty` en sous-processus |
| Récepteur de hook | reçoit le hook `Stop` de Claude Code, lit le transcript, clôt le run | route locale + script de hook |
| Lecteur de transcript | extrait le dernier message de l'assistant (seul code qui connaît ce format) | TypeScript |
| Bac à sable | dossier de travail + `.claude/settings.json` (hook Stop, permissions) | Claude Code |

## Flux principaux

1. **Découverte** : Cornelius → `GET /v1/capabilities` (`run_submission`, `run_status`, `run_stop` à vrai ; `run_steer` à vrai ; `run_approval` à faux) → `/v1/toolsets` et `/v1/skills` décrivent « Claude Code dans le bac à sable » → badge « Disponible pour Cornelius ».
2. **Demande** : phrase à la voix → Cornelius `POST /v1/runs {input, session_id, instructions}` + `Idempotency-Key` → le pont répond tout de suite `{run_id, status: "running"}` → session tmux prête (Claude lancé si besoin), fenêtre Kitty ouverte → demande + consigne de résumé tapées dans Claude.
3. **Suivi et fin** : Cornelius interroge `GET /v1/runs/:id` toutes les ~2,5 s → hook `Stop` → le pont lit le dernier message → `status: "completed", output: <résumé>` → Cornelius lit le résumé.
4. **Suite** : demande de précision sur une tâche finie = nouveau run, même `session_id` → même session Claude (contexte gardé). Pendant un run : `/steer` tape le message dans Claude ; `/stop` envoie Échap puis `cancelled`.

## Données & secrets
- **Jeton du pont** : `.env` du pont (non versionné) ; collé une fois dans Cornelius (Administration → Agents → Jeton de connexion).
- **Hook → pont** : appel local avec un second jeton, propre au hook (fichier lisible par l'utilisateur seulement).
- **Pas de base de données** : tâches en mémoire, journal en fichier ; un redémarrage du pont oublie les tâches (Cornelius affichera « État à vérifier »).
- **Transcripts** : ceux de Claude Code, à leur place habituelle ; le pont les lit sans les copier.

## Points d'évolution anticipés
- **Voix locale** : remplacer la conversation OpenAI de Cornelius par reconnaissance vocale locale → Claude → synthèse locale. Change de nature : ce n'est plus un agent, c'est un fournisseur de conversation (évolution du cœur ou fork, voir 03-scope).
- **Plugin en amont** : transformer le pont en plugin Claude Code installable, ou en type d'agent natif de Cornelius, selon la réponse des mainteneurs.
- **Périmètre** : liste de projets autorisés au lieu d'un seul bac à sable.
- **Persistance** : SQLite si l'oubli des tâches au redémarrage gêne.
