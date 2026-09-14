# Th-oBA — Drive de cours perso (anzee.xyz)

Architecture :

- **Nextcloud** (`cloud.anzee.xyz`) : stockage réel des fichiers. Accessible aussi directement
  depuis l'app mobile Nextcloud (photo → auto-upload).
- **Site custom** (`anzee.xyz`, dossier `site/`) : interface perso en Next.js. Aujourd'hui, une
  page "Cours & Drive" avec drag-and-drop de fichiers/dossiers, qui parle à Nextcloud via WebDAV
  côté serveur (le mot de passe Nextcloud n'est jamais exposé au navigateur). D'autres pages
  (Todo, Calendrier, Sport...) s'ajouteront plus tard sans toucher à cette base : chaque page est
  une route indépendante enregistrée dans `site/src/lib/nav.ts`.
- **Caddy** : reverse proxy avec HTTPS automatique (Let's Encrypt) pour les deux domaines.
- **Meilisearch** : index de recherche plein texte (noms de fichiers + contenu des PDF/notes
  texte), alimenté automatiquement à chaque upload/suppression/renommage via `site/src/lib/indexer.ts`.
- **Page Santé** (`/sante`) : pas, sommeil, Body Battery et activités récentes, lus directement
  depuis Garmin Connect (`site/src/lib/garmin.ts`, librairie non-officielle `garmin-connect`).
  Nécessite un compte Garmin **sans double authentification (2FA)**. Le jeton de session est mis
  en cache dans un volume Docker pour éviter de se reconnecter à chaque redémarrage, et les
  données sont rafraîchies au maximum toutes les 15 minutes pour ne pas solliciter l'API Garmin
  trop souvent.

Le tout tourne dans Docker Compose sur ton VPS (`docker/docker-compose.yml`).

## 1. DNS (Cloudflare)

Dans Cloudflare, pour la zone `anzee.xyz`, ajoute deux enregistrements A pointant vers l'IP de ton
VPS :

- `anzee.xyz` → IP du VPS
- `cloud.anzee.xyz` → IP du VPS

Pour que Caddy puisse générer les certificats HTTPS via le challenge HTTP-01, passe ces deux
enregistrements en **DNS only** (nuage gris, pas orange) le temps du premier déploiement. Tu
pourras réactiver le proxy Cloudflare (nuage orange) ensuite en mode SSL "Full (strict)".

## 2. Premier déploiement sur le VPS

```bash
git clone <url-du-repo> th-oba
cd th-oba/docker
cp .env.example .env
# éditer .env : mots de passe DB + admin Nextcloud

cd ../site
cp .env.example .env
# éditer .env : SITE_PASSWORD, SESSION_SECRET (openssl rand -base64 32)
# laisser NEXTCLOUD_APP_PASSWORD vide pour l'instant, on le remplit à l'étape 4
# MEILISEARCH_KEY doit être identique à MEILI_MASTER_KEY dans docker/.env

cd ../docker
docker compose up -d
```

Premier démarrage : Nextcloud peut prendre 1-2 minutes à s'initialiser.

## 3. Configurer Nextcloud

1. Va sur `https://cloud.anzee.xyz`, connecte-toi avec `NEXTCLOUD_ADMIN_USER` /
   `NEXTCLOUD_ADMIN_PASSWORD` (définis dans `docker/.env`).
2. Paramètres → Sécurité → **Créer un nouveau mot de passe d'application**, nomme-le par exemple
   `site-anzee`. Copie le mot de passe généré (un token, pas ton mot de passe de compte).
3. Installe l'app mobile Nextcloud, connecte-la à `cloud.anzee.xyz`, active l'auto-upload de photos
   vers un dossier (ex: `Cours/_Photos`) si tu veux ce flux en plus du drag-and-drop web.

## 4. Configurer le site

Dans `site/.env` :

```
NEXTCLOUD_URL=https://cloud.anzee.xyz
NEXTCLOUD_USERNAME=admin
NEXTCLOUD_APP_PASSWORD=<le token généré à l'étape 3>
```

Puis relance le service :

```bash
cd docker
docker compose up -d --build site
```

Va sur `https://anzee.xyz`, entre ton `SITE_PASSWORD`, tu arrives sur la page Cours. Crée un
premier cours, glisse un fichier ou un dossier dessus : il apparaît dans Nextcloud sous
`Cours/<nom-du-cours>/`.

## 5. Recherche

La page `/recherche` cherche dans les noms de fichiers et le contenu (PDF, `.txt`, `.md`, `.csv`)
de tous les cours. L'index se met à jour automatiquement à chaque upload/suppression/renommage
fait depuis le site. Pour les fichiers ajoutés autrement (app mobile Nextcloud, WebDAV direct),
clique sur **Réindexer tout** dans la page Recherche pour les intégrer à l'index.

## 6. Santé (Garmin)

Dans `site/.env`, renseigne `GARMIN_EMAIL` / `GARMIN_PASSWORD` (compte sans 2FA), puis
`docker compose up -d --build site`. La page `/sante` affiche pas (7 derniers jours), Body
Battery du jour, sommeil de la nuit et les dernières activités. Si le compte a de la 2FA activée,
la connexion échouera : soit la désactiver, soit récupérer un jeton de session manuellement et le
déposer dans le volume `garmin_tokens` (`oauth1_token.json` / `oauth2_token.json`).

## 7. Synthèse IA (Claude)

Dans `site/.env`, renseigne `ANTHROPIC_API_KEY` (clé créée sur console.anthropic.com > API Keys),
puis `docker compose up -d --build site`. Laisser la variable vide désactive la fonctionnalité
(le bouton n'apparaît pas).

Pour un cours qui contient un sous-dossier **`notes de cours`**, un bouton **"Générer ma synthèse
de la semaine"** apparaît sur la page du cours. Il :

- prend les fichiers de `notes de cours` modifiés pendant la semaine calendaire en cours
  (lundi-dimanche) ;
- extrait leur texte (PDF, Word `.docx`, Markdown/texte) ;
- envoie le tout à Claude (`claude-opus-4-8`) pour générer une courte synthèse (chapitres couverts
  + points à réviser en priorité) ;
- enregistre le résultat dans un cours dédié **"Synthèse de semaine"** (créé automatiquement),
  sous le nom `{Cours} S{numéro de semaine ISO}.md` — et l'affiche directement sur la page.

Formats de notes non supportés (images scannées, PowerPoint, etc.) sont ignorés silencieusement ;
seuls les fichiers texte/PDF/Word sont pris en compte pour l'instant.

## 8. Todo

Page `/todo` : liste de tâches avec catégorie (texte libre, autocomplétée depuis les catégories
déjà utilisées) et date d'échéance optionnelles. Stockée dans la base `health` (table `todos`),
aucune configuration nécessaire au-delà de `HEALTH_DB_*`.

## 9. Analyse (corrélations)

Page `/analyse` : compare tes prises de compléments/café/repas avec tes données de santé
(sommeil, Body Battery, FC repos) sur les 30 derniers jours — comparateur "jours avec / jours
sans" un facteur donné, plus une vue chronologique jour par jour. Comparaison naïve (même jour
calendaire, pas de test statistique) : utile pour repérer une tendance une fois assez de données
accumulées, pas une preuve scientifique.

## 10. Export CSV

Page `/export` : télécharge l'intégralité des données santé/compléments/alimentation/activités
au format CSV, pour analyse externe (Excel, Python, etc.).

## 11. Notifications push

Dans `site/.env`, renseigne `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (générer
une paire avec `node -e "console.log(require('web-push').generateVAPIDKeys())"` depuis
`site/`), puis `docker compose up -d --build site`. Laisser vide désactive la fonctionnalité.

Le site est une PWA installable (`public/manifest.json`, `public/sw.js`, icônes dans
`public/icons/`). Depuis la sidebar, le bouton **"Activer les notifications"** demande la
permission navigateur et enregistre l'abonnement en base (table `push_subscriptions`). Chaque
soir à **22h heure locale** (`TZ=Europe/Brussels`, voir `docker/docker-compose.yml`), le site
vérifie 3 conditions et notifie celles non remplies :

- Garmin pas synchronisé depuis plus de 3h ;
- aucun complément noté aujourd'hui ;
- aucun repas noté aujourd'hui.

Sur iPhone/Safari, les notifications push nécessitent d'avoir installé le site sur l'écran
d'accueil (Safari > Partager > Sur l'écran d'accueil) — Safari ne les supporte pas dans un onglet
normal.

## 12. Horaire (page `/horaire`)

Lit en direct le(s) flux ICS de tes universités (heures + salle), avec un cache mémoire d'1h
côté serveur pour éviter de spammer le serveur de l'université à chaque visite.

1. Récupère le lien ICS personnel de ton horaire (ex. ICHEC : `Horaires > Exporter/S'abonner au
   calendrier`, un lien qui finit en `.ics?...`). Ce lien contient un token secret — ne le mets
   jamais dans un commit.
2. Ajoute-le dans `site/.env` :
   ```
   ICHEC_ICS_URL=https://horaires.ichec.be/Telechargements/ical/...
   ```
3. Relance le service : `docker compose up -d --build site`.
4. Pour une deuxième université, ajoute `UNIV2_ICS_URL=...` dans `site/.env` — aucun changement
   de code nécessaire, la page détecte automatiquement les sources configurées
   (`site/src/lib/schedule.ts` → `SCHEDULE_SOURCES`). Pour en ajouter une troisième plus tard,
   ajoute une entrée dans ce tableau.

## 13. Net Worth (page `/networth`)

Patrimoine à 3 niveaux : 3 **catégories fixes** — **Crypto**, **Trade Fi** (actions/ETF),
**Cash** — dans lesquelles tu crées librement des **sous-catégories** ("contenants", ex.
"Ledger", "Binance", "Trade Republic", "BNP"), et dans chaque contenant tu ajoutes les
**possessions** que tu y détiens (ex. "Solana" et "Bitcoin" dans "Ledger", "Coca-Cola" dans
"Trade Republic"). Chaque possession a un historique de mouvements (achat/vente, dépôt/retrait)
— la quantité détenue est la somme de tous les mouvements. Aucune configuration nécessaire
au-delà de `HEALTH_DB_*`.

Prix en direct **si un identifiant est renseigné** sur la possession :

- **Crypto** : identifiant CoinGecko (ex. `solana`, `bitcoin` — visible dans l'URL de la page de
  la crypto sur coingecko.com), prix récupéré directement en EUR. Pas de clé API requise.
- **Trade Fi** : ticker Yahoo Finance (ex. `KO`, `AAPL`, ou `MC.PA` pour une valeur cotée à
  Paris), converti en EUR via le taux de change du jour. Pas de clé API requise.
- **Cash** : la quantité est directement le montant dans la devise choisie à la création
  (EUR/USD/GBP/CHF), convertie en EUR.

Une possession sans identifiant configuré (ou dont la récupération échoue) reste affichée avec
sa quantité mais sans valorisation — elle n'est pas comptée dans le total, plutôt que d'afficher
un chiffre inventé. Les prix sont mis en cache 10 minutes (1h pour les taux de change) pour ne
pas solliciter les APIs à chaque visite.

## Scalabilité / évolutions prévues

- **Ajouter une page** : créer un dossier sous `site/src/app/(app)/<page>/`, ajouter l'entrée
  dans `site/src/lib/nav.ts`. Le layout, l'auth et le style sont déjà partagés.
- **Calendrier de cours** : reste à connecter (CalDAV/Nextcloud Calendar), suivant le même
  principe que `lib/nextcloud.ts` — un client dédié, appelé depuis des Route Handlers.
- Le site est stateless (toutes les données vivent dans Nextcloud/MariaDB) : il peut être
  redéployé, mis à l'échelle horizontalement, ou déplacé sur un autre VPS sans perte de données.
