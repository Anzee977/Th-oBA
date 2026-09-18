# Th-oBA — Drive de cours perso (anzee.xyz)

Contexte du projet, pour toute session Claude Code qui reprend ce repo (VPS ou ailleurs).

## Ce que c'est

Site perso pour Reza (ICHEC + une 2e université à venir) : un "drive" de cours hébergé sur son
propre VPS, plus d'autres modules perso (horaire, futur todo/calendrier/sport). Deux briques :

- **Nextcloud** (`docker/`) — stockage réel des fichiers (dossiers de cours), accessible aussi
  depuis l'app mobile Nextcloud pour scanner/uploader des notes directement dans le bon dossier.
- **Site custom Next.js** (`site/`) — interface perso sur `anzee.xyz`, single-user (un seul mot
  de passe, pas de multi-comptes), qui pilote Nextcloud via WebDAV côté serveur.

Domaine : `anzee.xyz` (site) / `cloud.anzee.xyz` (Nextcloud), DNS chez Cloudflare.

## Décisions d'architecture (ne pas remettre en question sans bonne raison)

- **Auth** : mot de passe unique (`SITE_PASSWORD`) + session iron-session, pas de vrai système de
  comptes — usage strictement personnel.
- **Nextcloud** : accès via un "app password" dédié (jamais le mot de passe du compte), stocké
  dans `site/.env` (`NEXTCLOUD_APP_PASSWORD`). Client WebDAV dans `site/src/lib/nextcloud.ts`.
- **Navigation extensible** : chaque page du site est déclarée dans `site/src/lib/nav.ts`. Ajouter
  une page = un dossier sous `site/src/app/(app)/<page>/` + une entrée dans `nav.ts`. Ne pas
  casser ce pattern.
- **Pas de todo/calendrier/sport encore** — prévus mais pas commencés, voir `nav.ts` pour les
  entrées commentées à réactiver le moment venu.
- **Palette** : anthracite froid + accent indigo (`--accent: #6366f1` sombre / `#4f46e5` clair),
  **pas** ambre/or — changé le 2026-09-14 sur demande explicite de Reza ("les couleurs...
  palette ambre/or" citée comme LE problème de l'UI). Ne pas revenir à une teinte ambre/dorée
  pour l'accent de marque sans qu'il le redemande. Les couleurs sémantiques (success/warning/
  danger/info) n'ont pas été touchées par ce changement (pas identifiées comme un problème).
- **Thème clair/sombre** : tout `globals.css` est piloté par des custom properties CSS sur
  `:root` (anthracite froid = défaut) redéfinies sous `:root[data-theme="light"]`
  (`ThemeToggle.tsx` pose l'attribut sur `<html>`, persisté en `localStorage`). En ajoutant du
  CSS, toujours utiliser `var(--...)` plutôt qu'une couleur en dur, sinon ça casse le mode
  clair silencieusement.

## État actuel (modules livrés)

### Page Aujourd'hui (`/aujourdhui`) — page d'accueil
- Ajoutée le 2026-09-18 à la demande de Reza ("qu'ajouter pour être plus productif ?").
  **Page d'accueil du site** : `/` et le login redirigent ici (plus vers `/cours`).
- Dashboard résumé en **lecture seule** (pas de gestion, juste des liens "Voir tout" vers les
  pages complètes) : cours du jour (réutilise `getCombinedWeekSchedule` de `lib/schedule.ts`
  filtré sur aujourd'hui), tâches en retard + dues aujourd'hui (réutilise `listTodos`), mails
  non lus si Gmail est connecté (réutilise `listInboxMessages` de `lib/gmail.ts`).
- Conçue pour ne rien casser si Mail n'est pas connecté/en erreur (cas courant vu les soucis de
  vérification Google en cours) : affiche un message discret plutôt qu'une erreur qui bloque la
  page. Aucune nouvelle donnée stockée, juste l'agrégation de ce qui existait déjà.

### Page Cours / Drive (`/cours`)
- Liste des cours (dossiers Nextcloud sous `Cours/`), création de nouveau cours.
- `/cours/[cours]` : upload par glisser-déposer (fichiers ou dossiers entiers, récursif via
  `webkitGetAsEntry`), liste des fichiers, ouverture/téléchargement, suppression (avec
  confirmation — ajouté sur le VPS, voir historique git).
- Toute la logique Nextcloud passe par `site/src/lib/nextcloud.ts`.

### Page Horaire (`/horaire`)
- Lit en direct le(s) flux ICS des universités (heures + salle des cours), gère les cours
  récurrents (RRULE, séances déplacées/annulées) via la lib `node-ical`.
- Cache mémoire côté serveur, 1h de TTL (`site/src/lib/schedule.ts`), pour ne pas spammer le
  serveur de l'université à chaque visite.
- Sources déclarées dans `SCHEDULE_SOURCES` (`site/src/lib/schedule.ts`) : `ICHEC_ICS_URL` et
  `UNIV2_ICS_URL` (label "ECAM") actifs et configurés (`site/.env` sur le VPS). **Ajouter une
  université = juste une variable d'env, aucun code à toucher.**
- **ECAM configuré le 2026-09-14**, testé en conditions réelles (les deux sources apparaissent
  fusionnées sur `/horaire`). Format différent d'ICHEC mais géré sans changement de code :
  `LOCATION` présent sur la plupart des `VEVENT` (ex. `LOCATION:2D15`), fuseau horaire nommé
  `TZID=Europe/Paris` (contre UTC direct chez ICHEC — `node-ical` gère les deux), et **utilise
  bien `RRULE`** (`FREQ=WEEKLY;COUNT=N;BYDAY=...`) contrairement à ICHEC — la branche
  `event.rrule` de `getWeekSchedule`, dormante jusque-là, est activement empruntée pour ECAM.
  Premier lien ECAM fourni (avec token `?t=...`) renvoyait une **erreur 500 côté serveur ECAM**
  (confirmée aussi dans le navigateur de Reza, pas un souci réseau/format de notre côté) — Reza
  a fourni un lien alternatif public (`/ics/serie_4MBA11A`, sans token, par groupe/série de
  cours) qui fonctionne. Si Reza redemande un jour d'utiliser un lien personnel `?t=...` ECAM à
  la place, commencer par vérifier qu'il ne renvoie plus 500 avant de le configurer.
- **Testé en conditions réelles le 2026-09-13** contre le vrai flux ICHEC (HYPERPLANNING 2023 -
  0.11.0), directement sur le VPS via `curl` + connexion authentifiée à `/horaire`. Mapping de
  champs confirmé correct, aucun changement de code nécessaire :
  - La salle est bien dans `LOCATION` de chaque `VEVENT` (ex. `LOCATION;LANGUAGE=fr:B104 - Salle
    de cours`) — le code (`textValue(event.location)` / `textValue(instance.event.location)`)
    n'a pas besoin d'aller la chercher ailleurs (`DESCRIPTION` la répète aussi, en plus, mais
    n'est pas utilisée).
  - Environ 20% des `VEVENT` n'ont pas de `LOCATION` du tout (cours à distance / salle pas encore
    assignée par HyperPlanning) — comportement normal, la salle s'affiche juste vide, pas un bug.
  - Le flux ICHEC n'utilise **aucun `RRULE`** : HyperPlanning expose déjà chaque séance comme un
    `VEVENT` indépendant avec son propre `DTSTART`/`DTEND`. La branche `event.rrule` de
    `getWeekSchedule` (gestion des séries récurrentes) reste dans le code pour d'autres systèmes
    ICS qui en émettraient, mais n'est jamais empruntée pour ICHEC.
  - `node-ical@0.27.1` exige Node ≥22 (`engines`) — `site/Dockerfile` est passé à
    `node:22-alpine` (était `node:20-alpine`) pour cette raison.

### Net Worth (groupe de nav "Net Worth" : `/networth`, `/networth/crypto`, `/networth/tradfi`,
  `/networth/cash`)
- **4 pages, pas 1** : `/networth` est un **dashboard résumé en lecture seule** (total, camembert
  de répartition par catégorie, courbe d'évolution du total dans le temps, fil des derniers
  mouvements toutes catégories confondues) — c'est `/networth/crypto`, `/networth/tradfi` et
  `/networth/cash` qui portent la gestion effective (création de contenants/possessions,
  mouvements). Restructuré ainsi le 2026-09-14 sur demande de Reza : "les catégories crypto/
  tradfi/cash sous la catégorie Net Worth" + "Net Worth sert à tout résumer avec des
  graphiques" — la toute première version mettait tout sur une seule page `/networth`.
- **3 niveaux** : catégorie fixe en dur dans le code (`crypto`/`tradfi`/`cash`, voir
  `NetworthCategory` dans `site/src/lib/healthDb.ts` — pas question de les rendre configurables,
  choix délibéré de Reza) → **contenant** libre (`networth_containers`, ex. "Ledger", "Trade
  Republic", "BNP" — juste un nom, pas de symbole/devise ici) → **possession** détenue dedans
  (`networth_holdings`, ex. "Solana" dans "Ledger" — nom + `symbol` optionnel pour le prix en
  direct + `currency`) → historique de mouvements signés (`networth_transactions`, positif =
  achat/dépôt, négatif = vente/retrait ; la quantité détenue = `SUM(quantity)`). Cascade DELETE
  à chaque niveau (supprimer un contenant supprime ses possessions et tout leur historique).
- **`networth_snapshots`** (une ligne par jour, `date` PK) alimente la courbe d'évolution du
  dashboard : upsertée par `runNetworthSnapshot()` (`site/src/lib/networth.ts`), programmée dans
  `instrumentation.ts` au démarrage + toutes les heures (upsert = la ligne du jour s'affine au
  fil de la journée, ne se duplique pas). Elle ne s'écrit que s'il existe au moins une
  possession (`holdingsCount > 0`), pour ne pas polluer l'historique avec des lignes à 0 avant
  que Reza n'ait commencé à utiliser la fonctionnalité.
- **Aucun coût de base (`unit_price`) stocké** : demande explicite était juste "ajouter/retirer
  des possessions" + "prix en direct dans le meilleur des cas", pas de suivi de P&L/plus-value —
  ne pas ajouter cette fonctionnalité sans qu'elle soit redemandée.
- Prix en direct, tous sans clé API : CoinGecko (`simple/price?vs_currencies=eur`) pour crypto,
  Yahoo Finance (endpoint public non officiel `query1.finance.yahoo.com/v8/finance/chart/<ticker>`)
  pour tradfi, Frankfurter (BCE) pour la conversion de devises. Logique + cache mémoire (10 min
  prix, 1h FX) dans `site/src/lib/networth.ts`. Une possession sans `symbol` configuré (ou dont
  le fetch échoue) reste sans valorisation plutôt que d'inventer un chiffre — pas comptée dans
  le total (ni dans le sous-total de son contenant/catégorie/dashboard).
- **Piège évité** : `NETWORTH_CATEGORY_LABELS`/`_COLORS`/`_STAT_CLASS` vivent dans
  `site/src/lib/networthCategoryMeta.ts` (données pures, pas de JSX) plutôt que dans un
  composant `"use client"`, exprès pour rester importables sans ambiguïté depuis les pages
  serveur (le dashboard) ET les composants client (formulaires de gestion). Les icônes (JSX)
  restent définies localement dans chaque composant client qui en a besoin.
- **Testé en conditions réelles le 2026-09-14** directement sur le VPS à chaque étape (création
  de contenants/possessions de test via `curl` authentifié, mouvements, rendu des 4 pages,
  calcul des totaux à tous les niveaux, camembert, courbe d'évolution, fil de mouvements, export
  CSV, cascades DELETE) puis données de test nettoyées. **Reza a créé ses vraies premières
  données pendant la session** (contenant "Ledger" en crypto, possession "Solana", achat de 5) —
  ne jamais les supprimer par erreur en confondant avec des données de test futures.

  Les 3 APIs (CoinGecko, Yahoo Finance, Frankfurter) répondent correctement depuis ce VPS.

### Mail (`/mail`)
- Lit/traite la boîte Gmail d'un **compte Gmail dédié** (`mailecamtheo@gmail.com`, créé exprès
  par Reza pour ça — jamais son compte perso). Raison : Reza a un compte étudiant `@ichec.be`
  qu'il voulait traiter, mais le tenant Microsoft/Entra ICHEC **bloque le consentement
  utilisateur** pour les permissions Mail (testé et confirmé le 2026-09-14 — écran "Approbation
  administrateur requise" avec une appli Azure de test). Solution retenue : transférer par règle
  Outlook les mails voulus vers ce Gmail dédié, que le site lit via l'API Gmail (OAuth Google,
  pas de restriction équivalente sur un compte perso).
- OAuth2 Google (`site/src/lib/gmail.ts`) : scope `gmail.modify` (lecture + marquer lu/archiver/
  corbeille, mais pas suppression définitive ni changement des paramètres du compte). Un seul
  `refresh_token` stocké en base (`mail_oauth_tokens`, une ligne, `id=1` — usage strictement
  personnel). `access_token` mis en cache avec expiration, rafraîchi automatiquement.
- **`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`** dans `site/.env`, projet Google Cloud
  "Anzee Mail". **Piège vécu le 2026-09-18** : Reza a créé le client OAuth dans un premier
  projet Google Cloud, puis configuré l'écran de consentement (utilisateurs test, etc.) dans un
  **second** projet différent par erreur — l'app rejetait tout le monde (`access_denied`) malgré
  un utilisateur test correctement ajouté, jusqu'à ce qu'un nouveau client OAuth soit recréé
  dans le bon projet (celui qui a la config Test/Externe). Si ça se reproduit : vérifier sur
  `console.cloud.google.com` → **APIs et services → Présentation** que le projet actuellement
  sélectionné a bien un client OAuth configuré (message explicite si ce n'est pas le cas), et
  que l'API Gmail y est activée (`APIs et services → Bibliothèque` — erreur 403 explicite sinon,
  vécue aussi le 2026-09-18 après avoir changé de projet).
- **`SITE_BASE_URL`** (`site/src/lib/gmail.ts`) est une constante **en dur**
  (`https://anzee.xyz`), pas dérivée de `request.url` — piège vécu : dans un Route Handler
  (Node runtime, pas Edge comme le middleware), `request.url` reflétait le hostname interne du
  conteneur Docker (`https://<container-id>:3000/...`) plutôt que le domaine public derrière
  Caddy, cassant toutes les redirections OAuth. Ne jamais utiliser `request.url` pour construire
  une URL de redirection absolue dans un Route Handler de ce projet — toujours une base en dur.
- **Format de date MariaDB** : `Date.prototype.toISOString()` (`"...THH:MM:SS.sssZ"`) est
  **rejeté** par une colonne `DATETIME` MariaDB (`ER_TRUNCATED_WRONG_VALUE`). Utiliser
  `toMysqlDatetime()` (`site/src/lib/gmail.ts`) qui convertit au format `"YYYY-MM-DD HH:MM:SS"`
  attendu. Vécu et corrigé le 2026-09-18 sur `mail_oauth_tokens.access_token_expires_at`.

## Accès GitHub

- Remote `origin` en **SSH** (`git@github.com:Anzee977/Th-oBA.git`), pas HTTPS — pas de
  credential HTTPS/token sur ce VPS. Clé dédiée `~/.ssh/id_ed25519_thoba` (config dans
  `~/.ssh/config`, `Host github.com`), ajoutée comme **Deploy Key avec write access** sur le
  repo GitHub le 2026-09-18. Si le push échoue avec un souci d'auth, vérifier que cette clé est
  toujours listée dans Settings → Deploy keys du repo côté GitHub.

## Sécurité — à ne jamais committer

- `docker/.env` et `site/.env` (mots de passe DB/admin, app password Nextcloud, `SESSION_SECRET`,
  liens ICS qui contiennent un token secret dans l'URL, `GOOGLE_CLIENT_SECRET`). Déjà dans
  `.gitignore`.

## Déploiement

Voir `README.md` à la racine — toutes les étapes (DNS, docker compose, config Nextcloud,
variables d'env, ajout d'un flux ICS) y sont détaillées.

## Pour la prochaine session qui reprend ce fichier

Mets à jour cette section (et le reste du fichier si l'architecture change) au fur et à mesure —
c'est la mémoire partagée entre les sessions qui travaillent sur ce repo, dans le sandbox cloud
comme sur le VPS.
