# 03 — Scope, non-goals & risques

Le rempart anti scope-creep. Si une demande tombe dans les non-goals, on dit non
(ou on l'ajoute consciemment à la roadmap).

## Dans le scope (v1)
- Pont local qui imite l'API Hermes utilisée par Cornelius.
- Claude Code interactif dans tmux, affiché par une fenêtre Kitty, dans un bac à sable.
- Fin de tâche par hook `Stop`, résumé court lu par Cornelius.
- Suite de conversation (même session), précision pendant le travail, arrêt.
- Démarrage automatique, doc d'installation, recette réelle à la voix.

## Non-goals (hors scope, assumé)
- Modifier le cœur de Cornelius — **jamais** pour le pont (la voix locale est un sujet à part).
- Validation des actions de Claude à la voix ou dans l'admin Cornelius — **pour l'instant**.
- Accès de Claude hors du bac à sable — **pour l'instant**.
- Plusieurs utilisateurs ou plusieurs tâches en parallèle — **pour l'instant**.
- Écoute réseau / miroir sur une autre machine — **pour l'instant**.
- Affichage du travail de Claude dans l'interface du miroir — **jamais** (le terminal suffit).

## Risques
| Risque | Impact | Probabilité | Mitigation |
|---|---|---|---|
| Le contrat Hermes de Cornelius change | Pont refusé ou tâches mal suivies | Moyenne | Tests de contrat calqués sur `server/hermes-client.ts` ; suivre les versions de Cornelius |
| Phrase mal comprise → action non voulue | Fichiers modifiés | Moyenne | Bac à sable, validations dans le terminal, personne seule et reconnue |
| Injection de texte dans tmux (caractères spéciaux, retours à la ligne) | Demande tronquée ou touches parasites | Moyenne | `send-keys -l`, nettoyage des caractères de contrôle, tests |
| Format du transcript de Claude Code qui bouge | Résumé vide | Moyenne | Lecture isolée dans un module testé, repli sur « tâche finie, voir le terminal » |
| Kitty ne s'ouvre pas depuis un service (variables Wayland absentes) | Rien de visible | Moyenne | Service lancé dans la session graphique ; test dédié |
| Tâche longue ou attente d'accord oubliée | Session bloquée | Faible | Délai max, statut visible, arrêt par Cornelius |
| Dépôt public : fuite de chemin, jeton ou config perso | Sécurité | Faible | `.env` ignoré, valeurs par défaut génériques, relecture avant push |

## Questions ouvertes
- [ ] Comment Claude Code signale une attente d'accord : faut-il un hook dédié pour que Cornelius dise « Claude attend ton accord dans le terminal » ?
- [ ] Où placer la fenêtre Kitty : règle Hyprland (espace de travail, côté de l'écran) à choisir.
- [ ] La proposition en amont : issue de discussion d'abord, ou plugin déjà prêt ?
- [ ] Voix locale : quels modèles tiennent sur cette machine (i5-7600K, GTX 1060 6 Go, Pascal) ; partir d'un fork existant (issue lfpoulain/Cornelius#11 : refusée dans le cœur, faite dans des forks) ou d'un nouveau fournisseur ?
- [ ] Voix locale : les conditions de l'abonnement Claude permettent-elles de servir de cerveau conversationnel automatisé ? À vérifier avant le sprint voix.

## Hypothèses
- Cornelius accepte un agent qui répond à `/v1/capabilities` sans être le vrai Hermes (seules les fonctions annoncées comptent, d'après son code).
- Le hook `Stop` se déclenche à chaque fin de tour en mode interactif.
- Un seul utilisateur devant le miroir quand il délègue (règle de Cornelius).
- Claude Code reste installé et connecté à l'abonnement sur la machine du miroir.
