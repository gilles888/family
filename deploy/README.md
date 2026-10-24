# Déploiement en production

Trois conteneurs Docker : **PostgreSQL**, le **backend** (le jar) et **nginx** (front fr/nl + relais de `/v1` vers le backend). Le serveur (VPS, Raspberry Pi, NAS…) n'a besoin que de **Docker avec docker compose**, et d'un accès **ssh + rsync** s'il est distant.

Vos données (`famille.json`, mots de passe) restent hors du dépôt : `deploy.sh` les copie directement sur le serveur.

## Première installation

1. Sur le serveur : installer Docker ([docs.docker.com/engine/install](https://docs.docker.com/engine/install/)) et autoriser votre utilisateur (`sudo usermod -aG docker $USER`, puis se reconnecter).
2. Sur votre machine : accès ssh sans mot de passe (`ssh-copy-id utilisateur@serveur`).
3. Configurer :
   ```bash
   cp deploy/.env.example deploy/.env      # ignoré par git
   openssl rand -base64 24                 # → DB_PASSWORD
   ```
   Dans `deploy/.env` : `DEPLOY_HOST`, `DB_PASSWORD`, `APP_PASSWORD` (mot de passe du site), la météo de votre domicile.
4. Déployer :
   ```bash
   ./deploy/deploy.sh
   ```
   Le script builde le backend (avec les tests) et le front, envoie le tout dans `~/family` sur le serveur, puis démarre les conteneurs. Au **premier déploiement** (base vide), la famille est chargée depuis `famille.json` ; le script affiche `Famille chargée depuis /config/famille.json : 4 membre(s)…`.
5. Ouvrir `http://serveur/fr/` (ou `/nl/`).

## Mises à jour

```bash
git pull && ./deploy/deploy.sh             # ou --skip-tests pour aller plus vite
```

La base est conservée : seuls le backend et nginx sont recréés. Flyway applique les nouvelles migrations au démarrage. `famille.json` n'est **plus lu** (la base a déjà des membres) : la famille se gère dans l'application (« Gérer les routines », page des membres…).

| Option | Effet |
|---|---|
| `--skip-tests` | build du backend sans les tests |
| `--no-build` | renvoie les derniers builds (`backend/target`, `front/dist`) |

`DEPLOY_HOST=local` installe sur la machine où le script est lancé (dossier `DEPLOY_DIR`).

## Sur le serveur

Dans le dossier d'installation (`~/family`) :

```bash
docker compose ps                          # état des conteneurs
docker compose logs -f backend             # journaux du backend
docker compose restart backend
./backup.sh                                # sauvegarde → backups/family-AAAA-MM-JJ_HHMM.sql.gz (30 gardées)
./restore.sh backups/family-….sql.gz       # restauration (demande confirmation, sauvegarde l'état actuel avant)
```

Sauvegarde automatique chaque nuit (`crontab -e`) :

```
0 3 * * * cd ~/family && ./backup.sh >> backups/backup.log 2>&1
```

Pensez à copier de temps en temps les sauvegardes ailleurs que sur le serveur : `scp 'serveur:family/backups/*.sql.gz' ~/sauvegardes-family/`.

## Sécurité

- **L'application n'a pas de comptes** : toute personne qui atteint le site voit et modifie les données. Mettez un `APP_PASSWORD` (mot de passe demandé par le navigateur, une fois) et gardez le site sur le réseau de la maison ou derrière un VPN (Tailscale, WireGuard).
- Exposé sur internet, il faut **HTTPS** : un reverse proxy devant nginx (Caddy le fait automatiquement), ou `tailscale serve`. Sans HTTPS, le mot de passe circule en clair.
- La documentation de l'API (Swagger) est désactivée, et PostgreSQL et le backend ne sont pas accessibles de l'extérieur (seul nginx publie un port).

## Contenu

| Fichier | Rôle |
|---|---|
| `deploy.sh` | build, envoi, démarrage (machine de développement) |
| `docker-compose.yml` | les trois conteneurs ; la base est dans le volume Docker `family_pgdata` |
| `nginx.conf.template` | langues `/fr/` `/nl/`, cache des fichiers à empreinte, relais `/v1`, mot de passe |
| `.env.example` | modèle de `deploy/.env` (ignoré par git) |
| `backup.sh` / `restore.sh` | sauvegarde et restauration de la base (sur le serveur) |

Sur le serveur, `~/family` contient aussi `.env` (sans le mot de passe du site), `config/famille.json`, `auth/htpasswd` (empreinte du mot de passe), `app/app.jar`, `www/` et `backups/`.
