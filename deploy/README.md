# Déploiement en production

L'agenda tourne dans trois conteneurs Docker sur le serveur : **PostgreSQL**, le **backend** (Java 25) et un **nginx** (front fr/nl + relais de `/v1`). Ce nginx n'est publié que sur `127.0.0.1:8090`. Le **nginx de l'hôte** (celui des autres sites) termine HTTPS pour `famille.gilmotech.be`, ajoute les en-têtes de sécurité, limite le débit et écrit le journal lu par **fail2ban**.

```
internet ──443──> nginx de l'hôte (TLS, en-têtes, limit_req, famille.access.log ← fail2ban)
                     └──> 127.0.0.1:8090  nginx du conteneur ──> backend:8080 ──> db:5432   (réseau Docker interne)
```

> 💾 **Sauvegarde automatique chaque nuit à 3 h, sur le serveur seulement** (30 gardées). Aucune copie hors du VPS : une perte du disque ou du serveur emporterait aussi les sauvegardes. Voir *Sauvegardes*.

Vos données (`famille.json`, mots de passe, `deploy/.env`) ne passent jamais par git : `deploy.sh` les copie directement sur le serveur, et retire `famille.json` et `ADMIN_PASSWORD` du serveur après le premier déploiement.

## Prérequis

### Poste de développement

- **JDK 25** (comme `java.version` du pom) : `deploy.sh` vérifie `./mvnw -v` et s'arrête sinon, en affichant la commande d'installation de Temurin 25.
- Node (build du front), `ssh` (alias `vps-claude` dans `~/.ssh/config`), `rsync`.

### DNS

Un enregistrement **A** `famille.gilmotech.be` → `45.88.223.242` (zone OVH de `gilmotech.be`). Vérifier :

```bash
dig +short famille.gilmotech.be A          # doit afficher 45.88.223.242
```

### Docker sur le serveur

```bash
# Dépôt officiel Docker (Ubuntu), puis Docker Engine + plugin compose
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
# deploy.sh lance docker sans sudo : l'utilisateur rejoint le groupe docker (équivalent root, comme sudo)
sudo usermod -aG docker "$USER"      # puis se reconnecter
```

**Docker contourne UFW** : un port publié sur `0.0.0.0` serait joignable depuis internet malgré le pare-feu. Le `docker-compose.yml` ne publie que `127.0.0.1:${HTTP_PORT}` ; la base et le backend ne publient rien.

## Première installation

### 1. Configuration

```bash
cp deploy/.env.example deploy/.env        # ignoré par git : ne jamais l'afficher ni le committer
openssl rand -base64 24                   # → DB_PASSWORD
openssl rand -base64 32                   # → AGENDA_REMEMBER_ME_KEY (clé fixe : changer la clé déconnecte tout le monde)
```

À remplir : `DB_PASSWORD`, `ADMIN_USERNAME` / `ADMIN_PASSWORD` (premier compte parent, 10 caractères minimum), `AGENDA_REMEMBER_ME_KEY`, la météo de votre domicile. `HTTP_PORT=8090` doit être libre sur le serveur (`deploy.sh` le vérifie).

### 2. nginx de l'hôte et certificat (une fois)

Deux modèles dans `deploy/host/`, rendus avec `envsubst` (seules les variables listées sont remplacées) :

```bash
# a. Port 80 seulement (défi ACME), le temps d'obtenir le certificat
DOMAIN=famille.gilmotech.be envsubst '${DOMAIN}' < deploy/host/nginx-famille-bootstrap.conf > /tmp/famille.conf
scp /tmp/famille.conf vps-claude:/tmp/famille.conf
ssh -t vps-claude 'sudo cp /tmp/famille.conf /etc/nginx/sites-available/zz-famille.gilmotech.be \
  && sudo ln -s /etc/nginx/sites-available/zz-famille.gilmotech.be /etc/nginx/sites-enabled/ \
  && sudo nginx -t && sudo systemctl reload nginx'

# b. Certificat (webroot : Certbot ne modifie pas la configuration nginx ; recharge nginx à chaque renouvellement)
ssh -t vps-claude 'sudo certbot certonly --webroot -w /var/www/html -d famille.gilmotech.be \
  --deploy-hook "systemctl reload nginx"'

# c. Configuration complète (HTTPS, en-têtes, limit_req, journal dédié)
DOMAIN=famille.gilmotech.be HTTP_PORT=8090 envsubst '${DOMAIN} ${HTTP_PORT}' < deploy/host/nginx-famille.conf > /tmp/famille.conf
scp /tmp/famille.conf vps-claude:/tmp/famille.conf
ssh -t vps-claude 'sudo cp /tmp/famille.conf /etc/nginx/sites-available/zz-famille.gilmotech.be \
  && sudo nginx -t && sudo systemctl reload nginx'
```

**Toujours `sudo nginx -t` avant `reload`** : une erreur dans ce fichier empêcherait aussi le rechargement des autres sites. Ce que fait `nginx-famille.conf` :

- port 80 : défi ACME et redirection 301 vers HTTPS, rien d'autre ;
- port 443 : TLS 1.2 et 1.3 (`options-ssl-nginx.conf` de Certbot, comme les autres sites) ; **sans http2** : avec nginx 1.24, il s'activerait pour tous les sites de `0.0.0.0:443` ;
- fichier préfixé `zz-` : chargé après les sites existants, il ne devient pas le site par défaut des ports 80 / 443 ;
- en-têtes : HSTS 1 an (sans preload), `nosniff`, `X-Frame-Options DENY`, `Referrer-Policy same-origin`, `Permissions-Policy` (géolocalisation, caméra, micro), CSP (`script-src 'self'` ; styles en ligne et polices Google nécessaires au build Angular) ; `server_tokens off` ;
- `limit_req` : 10 requêtes/s par IP (rafale 40) ; `POST /v1/auth/login` : 5/min (rafale 5), puis 429 ; corps limité à 1 Mo ;
- **`X-Forwarded-For` écrasé** par l'IP du client vue par nginx (jamais `$proxy_add_x_forwarded_for`) ;
- journaux `/var/log/nginx/famille.access.log` et `famille.error.log`.

### 3. Premier déploiement

```bash
./deploy/deploy.sh
```

Le script vérifie le serveur (Docker, port libre), le JDK 25, builde le backend (avec les tests) et le front, envoie le tout dans `~/family`, démarre les conteneurs. Au **premier déploiement** (marqueur `~/family/.famille-chargee` absent), il exige `ADMIN_USERNAME` / `ADMIN_PASSWORD` et `famille.json`, puis, une fois `Famille chargée …` dans les journaux :

1. supprime `config/famille.json` du serveur (il contient les mots de passe initiaux) ;
2. retire `ADMIN_PASSWORD` du `.env` du serveur et recrée le backend sans lui ;
3. pose le marqueur : les déploiements suivants ne rechargent plus la famille.

Il affiche enfin `java -version` du conteneur backend et l'adresse `https://famille.gilmotech.be/fr/`. Chaque membre de la famille se connecte avec le mot de passe initial de `famille.json` et doit le changer tout de suite.

### 4. fail2ban (une fois)

```bash
ssh -t vps-claude 'sudo apt-get install -y fail2ban'
scp deploy/host/fail2ban/famille-login.conf deploy/host/fail2ban/famille.local deploy/host/fail2ban/famille-login.exemples.txt vps-claude:/tmp/
ssh -t vps-claude 'sudo cp /tmp/famille-login.conf /etc/fail2ban/filter.d/ \
  && sudo cp /tmp/famille.local /etc/fail2ban/jail.d/ \
  && fail2ban-regex /tmp/famille-login.exemples.txt /etc/fail2ban/filter.d/famille-login.conf \
  && sudo systemctl restart fail2ban && sudo fail2ban-client status famille-login'
```

- `famille-login` : 10 `POST /v1/auth/login` en 401 ou 429 en 10 minutes → IP bannie 1 heure ;
- `recidive` : 5 bannissements en 1 jour → 24 heures ;
- jamais bannies : `127.0.0.1`, `::1`, Tailscale (`100.64.0.0/10`).

`fail2ban-regex` sur `famille-login.exemples.txt` doit trouver 3 correspondances (deux 401 et un 429) et ignorer les 4 autres lignes.

## Mises à jour

```bash
git pull && ./deploy/deploy.sh             # ou --skip-tests ; --no-build renvoie les derniers builds
```

La base est conservée, Flyway applique les nouvelles migrations au démarrage, seuls le backend et le nginx du conteneur sont recréés. `famille.json` n'est plus lu ni envoyé : la famille et les comptes se gèrent dans l'application.

### Mettre à jour Java

L'image du backend est fixée à une version exacte (`eclipse-temurin:25.0.4.1_1-jre-noble`). Pour un correctif de sécurité :

1. choisir le dernier tag `25.x.y_z-jre-noble` sur https://hub.docker.com/_/eclipse-temurin/tags?name=25 ;
2. le reporter dans `docker-compose.yml` (garder la même version majeure que `java.version` du pom) ;
3. `./deploy/deploy.sh` : le script affiche `java -version` du conteneur à la fin.

Changer de version majeure demande aussi de changer `java.version` dans `backend/pom.xml` et le JDK du poste de développement.

## Déploiement par GitHub Actions

- `.github/workflows/ci.yml` (**Tests**) : backend (`mvn verify`) et front (tests + build fr/nl) à chaque push (sauf `main`) et pull request.
- `.github/workflows/deploy.yml` (**Déploiement**) : à chaque push sur **`main`** (ou bouton *Run workflow* dans l'onglet Actions), relance les tests, puis le runner rejoint le tailnet (nœud éphémère `tag:ci`), se connecte au VPS par Tailscale et lance `deploy.sh --skip-tests`. Un seul déploiement à la fois ; vérification finale de `/actuator/health`.

Flux de travail : on développe sur `dev` ; **fusionner `dev` dans `main` met en production**.

Le dépôt est public, **ses journaux d'Actions aussi** : tout ce qui identifie le serveur est en secret (masqué `***` dans les journaux). Le premier déploiement (famille.json, `ADMIN_*`) se fait depuis le poste de développement, jamais par GitHub.

### Mise en place (une fois)

1. **Clé SSH de déploiement**, propre à GitHub, utilisable seulement depuis le tailnet :
   ```bash
   ssh-keygen -t ed25519 -N "" -C family-deploy-github -f ~/.ssh/family_deploy_github
   ssh vps-claude "echo 'from=\"100.64.0.0/10\",no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-pty $(cat ~/.ssh/family_deploy_github.pub)' >> ~/.ssh/authorized_keys"
   ```
2. **Tailscale** (console d'administration) :
   - *Access controls* : déclarer le tag et ne lui ouvrir que le SSH du VPS, par exemple
     ```jsonc
     "tagOwners": { "tag:ci": ["autogroup:admin"] },
     // dans "acls" (ou l'équivalent dans "grants") :
     { "action": "accept", "src": ["tag:ci"], "dst": ["<IP Tailscale du VPS>:22"] }
     ```
     Avec la politique par défaut (« tout le monde voit tout »), le nœud `tag:ci` verrait aussi les autres machines du tailnet le temps du job : restreindre la règle `*` si besoin.
   - *Settings → OAuth clients* : un client avec le droit d'écriture **Auth Keys**, limité au tag `tag:ci`.
3. **Secrets GitHub** (*Settings → Secrets and variables → Actions → New repository secret*) :

   | Secret | Valeur |
   |---|---|
   | `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` | client OAuth Tailscale |
   | `DEPLOY_SSH_KEY` | contenu de `~/.ssh/family_deploy_github` (clé **privée**) |
   | `DEPLOY_SSH_HOST` | IP Tailscale du VPS |
   | `DEPLOY_SSH_USER` | utilisateur SSH du VPS |
   | `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan -t ed25519 <IP Tailscale du VPS>` (vérifier l'empreinte avec `ssh-keygen -lf`) |
   | `DEPLOY_ENV` | contenu de `deploy/.env` (sans `ADMIN_PASSWORD`, inutile après le premier déploiement) |

4. Créer la branche `main` (`git push origin dev:main`) : premier déploiement par GitHub.

Révoquer l'accès : supprimer la ligne `family-deploy-github` de `~/.ssh/authorized_keys` sur le VPS et le client OAuth Tailscale.

## Sur le serveur

Dans `~/family` :

```bash
docker compose ps                          # état des conteneurs
docker compose logs -f backend             # journaux (AUTH_OK / AUTH_FAIL / AUTH_LOCKED user=… ip=…)
docker compose restart backend
```

### Mot de passe administrateur oublié

Un autre parent peut définir un nouveau mot de passe depuis la page *Comptes*. Si aucun parent ne peut se connecter :

```bash
# Empreinte BCrypt d'un mot de passe provisoire (10 caractères minimum), sans l'écrire dans l'historique du shell
read -rs -p "Mot de passe provisoire : " P; echo
HASH="{bcrypt}$(docker run --rm httpd:2.4-alpine htpasswd -nbBC 12 x "$P" | cut -d: -f2)"; unset P
docker compose exec -T db psql -U family -d family_agenda -v hash="$HASH" -v id="identifiant" <<'SQL'
update user_account set password_hash = :'hash', actif = true, doit_changer_mot_de_passe = true,
       echecs_connexion = 0, bloque_jusqua = null, version_securite = version_securite + 1
 where identifiant = :'id';
SQL
```

Remplacer `identifiant` par celui du compte. Le mot de passe provisoire devra être changé à la connexion ; les sessions et « rester connecté » existants sont refusés (`version_securite`).

## Sécurité

- **Comptes** : connexion obligatoire, rôles PARENT / ENFANT, blocage après 5 échecs, mot de passe initial à changer (voir `backend/README.md`, *Comptes, connexion et rôles*).
- **IP des journaux** : le nginx de l'hôte écrase `X-Forwarded-For` avec l'IP qu'il voit ; le nginx du conteneur ne fait confiance qu'au réseau Docker (`set_real_ip_from`) et relaie cette seule IP ; le backend n'est joignable que par lui. Un `X-Forwarded-For` envoyé par un client n'apparaît donc pas dans `AUTH_FAIL`. Vérification :
  ```bash
  J=$(mktemp); U=https://famille.gilmotech.be
  curl -s -c "$J" -o /dev/null "$U/v1/auth/me"                          # cookie XSRF-TOKEN
  curl -s -b "$J" -H "X-XSRF-TOKEN: $(awk '/XSRF-TOKEN/ {print $7}' "$J")" -H 'X-Forwarded-For: 6.6.6.6' \
    -H 'Content-Type: application/json' -d '{"identifiant":"test-xff","motDePasse":"xxxxxxxxxx"}' "$U/v1/auth/login"
  ssh vps-claude 'cd family && docker compose logs backend | grep "AUTH_.*test-xff" | tail -1'   # votre IP, pas 6.6.6.6
  ```
- **Ports** : seul `127.0.0.1:8090` est publié ; `curl -m 5 http://45.88.223.242:8090` depuis l'extérieur doit échouer.
- **Secrets sur le serveur** : `~/family/.env` (mode 600) contient `DB_PASSWORD` et `AGENDA_REMEMBER_ME_KEY` ; plus de `ADMIN_PASSWORD` ni de `famille.json` après le premier déploiement.
- **Swagger** désactivé en production ; `/actuator/health` ne renvoie que le statut.
- Les polices (Roboto, Material Icons) viennent de Google Fonts : le navigateur des utilisateurs contacte `fonts.gstatic.com`.

## Sauvegardes

**Chaque nuit à 3 h** (heure du serveur), une tâche cron de l'utilisateur lance `~/family/backup.sh` : dump PostgreSQL compressé dans `~/family/backups/family-AAAA-MM-JJ_HHMM.sql.gz` (mode 600, dossier 700), **les 30 dernières sont gardées**. Le script vérifie l'archive (gzip lisible, dump complet) avant de la garder et note chaque passage dans `backups/backup.log`.

- La tâche est installée par `deploy.sh` à chaque déploiement (une seule ligne, repérée par `# family-backup`) ; son horaire vient de `BACKUP_CRON` dans `deploy/.env` (format cron ; vide = aucune sauvegarde automatique).
- **Les sauvegardes restent sur le VPS** : elles protègent d'une erreur de manipulation ou d'une mise à jour ratée, **pas d'une perte du disque ou du serveur**. Pour une copie ailleurs, à la main : `scp 'vps-claude:family/backups/*.sql.gz' ~/sauvegardes-family/` (elles contiennent les données de la famille et les empreintes des mots de passe : à garder en lieu sûr).

```bash
ssh vps-claude 'crontab -l; tail -n 4 family/backups/backup.log; ls -lt family/backups | head'   # état
ssh vps-claude 'cd family && ./backup.sh'                                                       # sauvegarde immédiate
```

**Restaurer** (sur le serveur, remplace TOUTES les données ; l'état actuel est d'abord sauvegardé) :

```bash
cd ~/family && ./restore.sh backups/family-AAAA-MM-JJ_HHMM.sql.gz
```

**Vérifier qu'une sauvegarde se restaure**, sans toucher à la base réelle (base temporaire) :

```bash
cd ~/family && F=$(ls -1t backups/family-*.sql.gz | head -1)
docker compose exec -T db createdb -U family test_restauration </dev/null
gunzip -c "$F" | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U family -d test_restauration >/dev/null
Q="select (select count(*) from family_member), (select count(*) from user_account), (select count(*) from agenda_entry)"
docker compose exec -T db psql -U family -d test_restauration -tAc "$Q" </dev/null    # à comparer avec family_agenda
docker compose exec -T db dropdb -U family test_restauration </dev/null
```

## Contenu

| Fichier | Rôle |
|---|---|
| `deploy.sh` | vérifications, build, envoi, démarrage, nettoyage du premier déploiement (poste de développement ou GitHub Actions) |
| `../.github/workflows/` | tests (`ci.yml`) et déploiement sur push `main` (`deploy.yml`) |
| `docker-compose.yml` | les trois conteneurs ; base dans le volume `family_pgdata` |
| `nginx.conf.template` | nginx du conteneur : langues `/fr/` `/nl/`, cache, relais `/v1` avec l'IP de l'hôte |
| `.env.example` | modèle de `deploy/.env` (ignoré par git) |
| `host/nginx-famille-bootstrap.conf` | nginx de l'hôte, avant le certificat (port 80, ACME) |
| `host/nginx-famille.conf` | nginx de l'hôte : HTTPS, en-têtes, limit_req, journal |
| `host/fail2ban/` | filtre `famille-login`, jails, lignes de test pour `fail2ban-regex` |
| `backup.sh` / `restore.sh` | sauvegarde (chaque nuit par cron, ou à la main) et restauration de la base |
