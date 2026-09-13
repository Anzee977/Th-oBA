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

## État actuel (modules livrés)

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
- Sources déclarées dans `SCHEDULE_SOURCES` (`site/src/lib/schedule.ts`) : `ICHEC_ICS_URL` actif,
  `UNIV2_ICS_URL` prévu mais pas encore rempli (Reza n'a pas encore le lien de sa 2e université).
  **Ajouter une université = juste une variable d'env, aucun code à toucher.**
- **Jamais testé en conditions réelles** : le sandbox Claude qui a écrit ce module n'avait pas
  accès réseau au domaine `horaires.ichec.be` (bloqué par la politique réseau de cet
  environnement). Le code suit strictement le format ICS/RFC 5545 et l'API documentée de
  `node-ical`, mais si les salles ou les horaires s'affichent mal une fois testé en vrai, c'est
  probablement une histoire de mapping de champ (`LOCATION` vs autre chose selon le système
  utilisé par l'université) — vérifier ça en premier.

## Sécurité — à ne jamais committer

- `docker/.env` et `site/.env` (mots de passe DB/admin, app password Nextcloud, `SESSION_SECRET`,
  liens ICS qui contiennent un token secret dans l'URL). Déjà dans `.gitignore`.

## Déploiement

Voir `README.md` à la racine — toutes les étapes (DNS, docker compose, config Nextcloud,
variables d'env, ajout d'un flux ICS) y sont détaillées.

## Pour la prochaine session qui reprend ce fichier

Mets à jour cette section (et le reste du fichier si l'architecture change) au fur et à mesure —
c'est la mémoire partagée entre les sessions qui travaillent sur ce repo, dans le sandbox cloud
comme sur le VPS.
