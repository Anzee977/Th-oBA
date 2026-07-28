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

## Scalabilité / évolutions prévues

- **Ajouter une page** (Todo, Calendrier, Sport...) : créer un dossier sous
  `site/src/app/(app)/<page>/`, ajouter l'entrée dans `site/src/lib/nav.ts`. Le layout, l'auth et
  le style sont déjà partagés.
- **Calendrier/Todo** peuvent réutiliser Nextcloud (apps Tasks/Calendar/Deck, protocoles
  CalDAV/CardDAV) suivant le même principe que le module `lib/nextcloud.ts` : un client dédié par
  intégration, appelé depuis des Route Handlers.
- **IA de synthèse** : un futur Route Handler peut lire les notes d'un cours via
  `listCourseFiles`/téléchargement WebDAV, les envoyer à l'API Anthropic, et déposer la synthèse
  générée dans le même dossier — sans changer l'architecture existante.
- Le site est stateless (toutes les données vivent dans Nextcloud/MariaDB) : il peut être
  redéployé, mis à l'échelle horizontalement, ou déplacé sur un autre VPS sans perte de données.
