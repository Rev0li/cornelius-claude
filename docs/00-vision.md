# 00 — Vision

## Le problème
Cornelius (miroir conversationnel de lfpoulain) parle bien mais n'agit pas sur l'ordinateur : pas de terminal, pas de code. Le passage prévu pour agir, les agents Hermes, empile trois IA (Cornelius → Hermes → outil) : lent, coûteux, et Hermes reformule la demande. Côté Claude Code, la lecture vocale actuelle (plugin TTS) reste moyenne pour discuter à l'oral.

## La vision
On parle à Cornelius, Claude Code exécute. À côté du miroir, une fenêtre Kitty montre Claude au travail en direct ; quand il a fini, Cornelius lit un résumé court. Aucune surcouche dans l'interface du miroir, aucune modification du cœur de Cornelius.

À terme :
1. le pont devient un plugin Claude Code proposé au projet Cornelius (issue en amont) ;
2. la voix passe en local (reconnaissance et synthèse vocales sur la machine), le « cerveau » étant Claude Code, déjà payé par l'abonnement : plus de frais d'API OpenAI.

## Pour qui
- **rev0li**, devant son PC (Fedora + Hyprland), seul et reconnu par le miroir : lancer et suivre des tâches de code à la voix.
- **Plus tard** : les utilisateurs de Cornelius qui ont Claude Code, via la proposition en amont.

## Valeur
- Une IA de moins dans la chaîne que la voie Hermes : moins de délai, moins de frais, demande transmise telle quelle.
- On voit ce que fait Claude (terminal réel) au lieu d'un compte rendu.
- Cornelius reste aligné sur la version officielle : mises à jour sans conflit.

## Principes directeurs
- **Zéro modification du cœur de Cornelius** : le pont parle le contrat Hermes, rien d'autre.
- **Le terminal est la vérité** : Claude tourne dans une vraie session tmux visible dans Kitty, pas dans une interface maison.
- **Garde-fous d'abord** : bac à sable dédié, validations de Claude dans le terminal, écoute locale seulement, jeton obligatoire.
- **Local d'abord, à terme** : chaque frais d'API évitable est une dette à rembourser (voix locale).
- **Simple > complet** : une tâche à la fois, un seul utilisateur.
