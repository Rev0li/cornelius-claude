# 04 — Roadmap & ticketing

Dérivé de la vision, des décisions techniques et de l'architecture. Les tickets
sont des **issues GitHub** du repo (workflow issue → branche `feat/<id>` → PR →
merge, skill ticket-handoff) ; ce tableau en est la vue d'ensemble.

## Sprints

### Sprint 1 — Le pont répond comme Hermes (sans Claude)
| Ticket | Titre | Dépend de | Statut |
|---|---|---|---|
| CC-01 | Squelette : Node 24 + TS + Fastify, tests, Prettier, CI GitHub Actions | — | todo |
| CC-02 | Découverte : `/v1/capabilities`, `/v1/toolsets`, `/v1/skills`, jeton Bearer, écoute locale | CC-01 | todo |
| CC-03 | Cycle des tâches avec un faux exécutant : `/v1/runs`, suivi, `/stop`, idempotence, une tâche à la fois | CC-02 | todo |
| CC-04 | Raccordement réel : Cornelius affiche « Disponible » et lit la réponse du faux exécutant | CC-03 | todo |

### Sprint 2 — Claude Code visible dans Kitty
| Ticket | Titre | Dépend de | Statut |
|---|---|---|---|
| CC-05 | Bac à sable : dossier dédié + réglages Claude Code (permissions, hook Stop) | CC-01 | todo |
| CC-06 | Pilote tmux : session dédiée, lancement de `claude`, dialogues de premier lancement, saisie littérale sûre | CC-05 | todo |
| CC-07 | Fenêtre Kitty : ouverture si aucun client attaché, classe dédiée, règle Hyprland | CC-06 | todo |
| CC-08 | Fin de tâche : hook Stop → pont, lecture du transcript, résumé court en `output` | CC-06 | todo |
| CC-09 | Exécutant Claude branché sur le cycle des tâches (remplace le faux) | CC-03, CC-07, CC-08 | todo |
| CC-10 | Suite et précisions : même `session_id` = même session ; `/steer` ; `/stop` = Échap | CC-09 | todo |

### Sprint 3 — Mise en service
| Ticket | Titre | Dépend de | Statut |
|---|---|---|---|
| CC-11 | Garde-fous : délai max, attente d'accord signalée, journal, relecture sécurité | CC-10 | todo |
| CC-12 | Démarrage auto (service utilisateur dans la session graphique) + doc d'installation | CC-09 | todo |
| CC-13 | Recette réelle à la voix (liste de contrôle) | CC-11, CC-12 | todo |

### Sprint 4 — Proposer en amont
| Ticket | Titre | Dépend de | Statut |
|---|---|---|---|
| CC-14 | README public + démo (GIF), puis issue de proposition sur lfpoulain/Cornelius | CC-13 | todo |

### Plus tard — Voix locale (plus de frais OpenAI)
| Ticket | Titre | Dépend de | Statut |
|---|---|---|---|
| CC-15 | Étude : reconnaissance + synthèse vocales locales, conditions de l'abonnement, forks existants (#11), mesures sur cette machine → ADR | CC-13 | todo |

## Principe de découpage
- 1 ticket = une unité **livrable et testable** (pas un epic).
- Le statut de référence vit dans l'issue (labels `status:*`) ; ce tableau est
  une vue d'ensemble, à resynchroniser ponctuellement.

## Jalons
- **MVP (fin sprint 2) :** à la voix, Cornelius lance une tâche, Claude travaille dans Kitty, Cornelius lit le résumé.
- **v1 (fin sprint 3) :** démarre seul, garde-fous en place, recette à la voix passée.
- **Proposition (sprint 4) :** issue ouverte en amont avec démo.
- **Sans frais d'API (plus tard) :** décision écrite sur la voix locale.
