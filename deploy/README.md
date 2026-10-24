# Déploiement en production

L'agenda tourne dans trois conteneurs Docker sur le serveur : **PostgreSQL**, le **backend** (Java 25) et un **nginx** (front fr/nl + relais de `/v1`). Ce nginx n'est publié que sur `127.0.0.1:8090`. Le **nginx de l'hôte** (celui des autres sites) termine HTTPS pour `famille.gilmotech.be`, ajoute les en-têtes de sécurité, limite le débit et écrit le journal lu par **fail2ban**.

```
internet ──443──> nginx de l'hôte (TLS, en-têtes, limit_req, famille.access.log ← fail2ban)
                     └──> 127.0.0.1:8090  nginx du conteneur ──> backend:8080 ──> db:5432   (réseau Docker interne)
```

> ⚠️ **Aucune sauvegarde automatique n'est en place.** `backup.sh` / `restore.sh` existent mais ne sont lancés par rien : voir *Sauvegardes*.

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
sudo usermod -aG docker gilmo        # puis se reconnecter
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
ssh -t vps-claude 'sudo mkdir -p /var/www/certbot \
  && sudo cp /tmp/famille.conf /etc/nginx/sites-available/famille.gilmotech.be \
  && sudo ln -sf /etc/nginx/sites-available/famille.gilmotech.be /etc/nginx/sites-enabled/ \
  && sudo nginx -t && sudo systemctl reload nginx'

# b. Certificat (webroot : Certbot ne modifie pas la configuration nginx ; recharge nginx à chaque renouvellement)
ssh -t vps-claude 'sudo certbot certonly --webroot -w /var/www/certbot -d famille.gilmotech.be \
  --deploy-hook "systemctl reload nginx"'

# c. Configuration complète (HTTPS, en-têtes, limit_req, journal dédié)
DOMAIN=famille.gilmotech.be HTTP_PORT=8090 envsubst '${DOMAIN} ${HTTP_PORT}' < deploy/host/nginx-famille.conf > /tmp/famille.conf
scp /tmp/famille.conf vps-claude:/tmp/famille.conf
ssh -t vps-claude 'sudo cp /tmp/famille.conf /etc/nginx/sites-available/famille.gilmotech.be \
  && sudo nginx -t && sudo systemctl reload nginx'
```

**Toujours `sudo nginx -t` avant `reload`** : une erreur dans ce fichier empêcherait aussi le rechargement des autres sites. Ce que fait `nginx-famille.conf` :

- port 80 : défi ACME et redirection 301 vers HTTPS, rien d'autre ;
- port 443 : http2, TLS 1.2 et 1.3 (profil Mozilla « intermediate ») ;
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

**Aucune sauvegarde automatique n'est en place.** Tant que ce n'est pas le cas, une panne du disque du VPS ou une erreur de manipulation fait perdre l'agenda. Manuellement, sur le serveur :

```bash
cd ~/family && ./backup.sh                 # backups/family-AAAA-MM-JJ_HHMM.sql.gz (30 gardées)
./restore.sh backups/family-….sql.gz       # restauration (confirmation demandée)
```

et copier les sauvegardes ailleurs : `scp 'vps-claude:family/backups/*.sql.gz' ~/sauvegardes-family/`.

## Contenu

| Fichier | Rôle |
|---|---|
| `deploy.sh` | vérifications, build, envoi, démarrage, nettoyage du premier déploiement |
| `docker-compose.yml` | les trois conteneurs ; base dans le volume `family_pgdata` |
| `nginx.conf.template` | nginx du conteneur : langues `/fr/` `/nl/`, cache, relais `/v1` avec l'IP de l'hôte |
| `.env.example` | modèle de `deploy/.env` (ignoré par git) |
| `host/nginx-famille-bootstrap.conf` | nginx de l'hôte, avant le certificat (port 80, ACME) |
| `host/nginx-famille.conf` | nginx de l'hôte : HTTPS, en-têtes, limit_req, journal |
| `host/fail2ban/` | filtre `famille-login`, jails, lignes de test pour `fail2ban-regex` |
| `backup.sh` / `restore.sh` | sauvegarde et restauration manuelles de la base |
