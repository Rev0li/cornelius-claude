# 01 — Décisions techniques

Format ADR-lite : une entrée par décision structurante. On ne re-débat pas une
décision écrite ici sans ajouter une nouvelle entrée qui la remplace.

## Stack (résumé)
| Couche | Choix | Version |
|---|---|---|
| Langage(s) | TypeScript, exécuté par tsx | Node.js 24 (≥ 24.2, comme Cornelius) |
| Framework(s) | Fastify | 5.x (même que Cornelius) |
| Base de données | Aucune en v1 : état des tâches en mémoire + journal fichier | — |
| Infra / déploiement | Service utilisateur systemd sur le PC du miroir, dans la session graphique (Hyprland) | — |
| Pilotage terminal | tmux + Kitty | versions Fedora 44 |
| Agent | Claude Code (CLI, abonnement) | ≥ 2.1 |
| CI / tests | `node --test` via tsx, TypeScript strict, Prettier ; GitHub Actions | — |

## Contraintes
- Fedora 44 + Hyprland : la fenêtre Kitty doit s'ouvrir dans la session Wayland de l'utilisateur.
- Node 24 n'est pas le Node par défaut (22) : binaire `node-24` du paquet Fedora `nodejs24`.
- Écoute sur `127.0.0.1` uniquement (Cornelius et le pont sur la même machine).
- Repo public : aucun secret, chemin perso ni jeton dans le code ou les issues.
- Contrat imposé par Cornelius (`server/hermes-client.ts`, `server/agents.ts`) : délai 5 s par requête, réponses JSON ≤ 256 Kio, jeton Bearer.

---

## ADR-001 — Imiter l'API Hermes plutôt que modifier Cornelius
- **Contexte :** Cornelius n'agit que par modules (lecture seule), commandes HTTP (adresse fixe, sans la phrase) ou agents Hermes. Un outil « qui agit » demande une évolution du cœur.
- **Décision :** le pont expose le sous-ensemble de l'API Hermes que Cornelius utilise ; Cornelius le voit comme un agent Hermes.
- **Pourquoi :** aucune ligne du cœur à changer, la phrase arrive intacte, les garde-fous de Cornelius (personne seule et reconnue) restent actifs.
- **Alternatives écartées :** Hermes réel + compétence `claude-code` (3 IA, lent, coûteux) ; outil « Claude » dans le cœur (fork qui diverge de l'officiel).
- **Conséquences :** on dépend d'un contrat qui peut bouger avec Cornelius → tests de contrat calqués sur son code.

## ADR-002 — Node 24 + TypeScript + Fastify
- **Contexte :** le pont doit pouvoir devenir un plugin proposé à Cornelius.
- **Décision :** même stack que Cornelius.
- **Pourquoi :** reprise facile en amont, mêmes conventions, même outillage de test.
- **Alternatives écartées :** Python (pilotage tmux un peu plus simple, mais stack étrangère au projet).
- **Conséquences :** lancer avec `node-24` sur cette machine.

## ADR-003 — Claude Code interactif dans tmux, affiché par Kitty
- **Contexte :** l'utilisateur veut voir Claude travailler, sans surcouche dans le miroir.
- **Décision :** une session tmux dédiée fait tourner `claude` en mode interactif dans le bac à sable ; le pont y tape les demandes (`tmux send-keys`) et ouvre une fenêtre Kitty attachée si aucune n'est ouverte.
- **Pourquoi :** vrai terminal, l'utilisateur peut reprendre la main au clavier ; Kitty est son seul terminal.
- **Alternatives écartées :** `claude -p` (rien à voir, pas de validation au clavier) ; affichage du flux dans le miroir (surcouche refusée).
- **Conséquences :** il faut gérer l'injection de texte dans tmux (mode littéral, multi-lignes) et les dialogues de premier lancement.

## ADR-004 — Fin de tâche détectée par un hook `Stop` de Claude Code
- **Contexte :** en mode interactif, rien n'indique proprement que Claude a fini ; lire l'écran est fragile.
- **Décision :** un hook `Stop` (réglages du bac à sable) prévient le pont, qui lit le dernier message de l'assistant dans le transcript.
- **Pourquoi :** signal officiel et fiable, texte exact plutôt que capture d'écran.
- **Alternatives écartées :** `tmux capture-pane` + heuristiques (fragile) ; sondage du transcript seul (pas de signal de fin).
- **Conséquences :** le format du transcript peut évoluer avec Claude Code → isoler sa lecture dans un seul module testé.

## ADR-005 — Validations dans le terminal, pas dans Cornelius
- **Contexte :** Cornelius ne valide pas à la voix (« utilisez les boutons dans Administration → Agents »).
- **Décision :** Claude garde ses propres demandes d'accord ; on valide au clavier dans Kitty. Le pont annonce `run_approval: false`.
- **Pourquoi :** simple et sûr, on valide en regardant ce qui va être fait.
- **Alternatives écartées :** relayer chaque accord dans l'admin Cornelius (complexe) ; tout autoriser (risqué).
- **Conséquences :** pendant une attente d'accord, Cornelius voit « En cours ».

## ADR-006 — Bac à sable dédié
- **Contexte :** une phrase mal comprise à la voix ne doit pas toucher les vrais projets.
- **Décision :** Claude travaille seulement dans un dossier dédié, configurable (par défaut `~/dev/cornelius-workspace`), avec ses propres réglages Claude Code.
- **Pourquoi :** limiter les dégâts tant que la confiance n'est pas établie.
- **Alternatives écartées :** tout `~/dev` ; liste de projets autorisés (à revoir plus tard).
- **Conséquences :** élargir le périmètre = nouvelle ADR.

## ADR-007 — Réponse lue = résumé court écrit par Claude
- **Contexte :** Cornelius lit le champ `output` du run ; le détail reste visible dans le terminal.
- **Décision :** le pont ajoute à chaque demande la consigne de finir par un résumé de 2-3 phrases en français (fait / reste) ; ce dernier message devient `output`.
- **Pourquoi :** pas de second modèle pour résumer, zéro coût en plus.
- **Alternatives écartées :** dernier message brut (trop long à l'oral) ; résumé par un autre modèle (coût, délai).
- **Conséquences :** si Claude ignore la consigne, le pont tronque proprement.

## ADR-008 — Écoute locale, jeton obligatoire, port 8643
- **Contexte :** le pont pilote un agent qui écrit des fichiers et lance des commandes.
- **Décision :** écoute sur `127.0.0.1:8643` (Hermes garde 8642), jeton Bearer obligatoire comparé en temps constant, refus sans jeton.
- **Pourquoi :** rien n'est joignable depuis le réseau ; même modèle que Hermes.
- **Alternatives écartées :** écoute réseau pour un miroir distant (pas de besoin en v1).
- **Conséquences :** Cornelius et le pont doivent tourner sur la même machine.
