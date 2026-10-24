#!/usr/bin/env bash
# Déploie l'agenda familial en production (Docker Compose : PostgreSQL + backend + nginx sur 127.0.0.1).
# HTTPS est assuré par le nginx de l'hôte (deploy/host/, une seule fois : voir deploy/README.md).
#
#   ./deploy/deploy.sh                 build + déploiement vers DEPLOY_HOST (deploy/.env)
#   ./deploy/deploy.sh --skip-tests    sans lancer les tests backend
#   ./deploy/deploy.sh --no-build      redéploie les derniers builds (backend/target, front/dist)
#
# Premier déploiement : ADMIN_USERNAME / ADMIN_PASSWORD et famille.json sont obligatoires ; une fois la famille
# chargée, famille.json et ADMIN_PASSWORD sont retirés du serveur.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY="$ROOT/deploy"
SKIP_TESTS=false
BUILD=true
JAVA_MAJOR=25

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --no-build) BUILD=false ;;
    -h | --help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)" >&2; exit 1 ;;
  esac
done

step() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mErreur : %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- configuration
[[ -f "$DEPLOY/.env" ]] || fail "deploy/.env absent. Créez-le : cp deploy/.env.example deploy/.env, puis adaptez-le."
set -a
# shellcheck source=/dev/null
source "$DEPLOY/.env"
set +a
[[ -n "${DEPLOY_HOST:-}" ]] || fail "DEPLOY_HOST vide dans deploy/.env (alias ssh, utilisateur@serveur ou « local »)."
[[ -n "${DB_PASSWORD:-}" ]] || fail "DB_PASSWORD vide dans deploy/.env (ex. : openssl rand -base64 24)."
[[ -n "${AGENDA_REMEMBER_ME_KEY:-}" ]] || fail "AGENDA_REMEMBER_ME_KEY vide dans deploy/.env (ex. : openssl rand -base64 32)."
DEPLOY_DIR="${DEPLOY_DIR:-family}"
HTTP_PORT="${HTTP_PORT:-8090}"
PUBLIC_URL="${PUBLIC_URL:-http://localhost:$HTTP_PORT}"
FAMILLE="$ROOT/${FAMILLE_JSON:-backend/famille.json}"
[[ "${FAMILLE_JSON:-}" == /* ]] && FAMILLE="$FAMILLE_JSON"

TARGET="$DEPLOY_DIR"
if [[ "$DEPLOY_HOST" == local ]]; then
  [[ "$TARGET" == /* ]] || TARGET="$HOME/$TARGET"
  run() { bash -s; }
  DEST="$TARGET/"
else
  run() { ssh "$DEPLOY_HOST" bash -s; }
  DEST="$DEPLOY_HOST:$TARGET/"
fi

# ---------- serveur : Docker, premier déploiement ?, port libre
step "Vérification du serveur ($DEPLOY_HOST)"
STATE="$(run <<EOF
set -euo pipefail
docker compose version >/dev/null 2>&1 || { echo "DOCKER_ABSENT"; exit 0; }
docker ps >/dev/null 2>&1 || { echo "DOCKER_REFUSE"; exit 0; }
# Premier déploiement tant que la famille n'a pas été chargée avec succès (marqueur posé par ce script)
if [ -f "$TARGET/.famille-chargee" ]; then echo "PREMIER=non"; else echo "PREMIER=oui"; fi
# Port déjà utilisé par autre chose que le nginx de ce projet ?
if ss -tln | grep -qE "[:.]$HTTP_PORT\\b"; then
  OURS="\$(cd "$TARGET" 2>/dev/null && docker compose port web 80 2>/dev/null || true)"
  if [ "\$OURS" = "127.0.0.1:$HTTP_PORT" ]; then echo "PORT=projet"; else echo "PORT=occupe"; fi
else
  echo "PORT=libre"
fi
EOF
)"
case "$STATE" in
  *DOCKER_ABSENT*) fail "Docker Compose est introuvable sur le serveur (installation : deploy/README.md)." ;;
  *DOCKER_REFUSE*) fail "Docker refuse l'accès : ajoutez l'utilisateur au groupe docker (deploy/README.md) puis reconnectez-vous." ;;
esac
[[ "$STATE" == *PORT=occupe* ]] && fail "Le port $HTTP_PORT est déjà utilisé sur le serveur par une autre application : changez HTTP_PORT."
FIRST=false
[[ "$STATE" == *PREMIER=oui* ]] && FIRST=true

if $FIRST; then
  echo "Premier déploiement : la famille sera chargée depuis $(basename "$FAMILLE")."
  [[ -n "${ADMIN_USERNAME:-}" && -n "${ADMIN_PASSWORD:-}" ]] \
    || fail "Premier déploiement : ADMIN_USERNAME et ADMIN_PASSWORD sont obligatoires dans deploy/.env."
  (( ${#ADMIN_PASSWORD} >= 10 )) || fail "ADMIN_PASSWORD : 10 caractères minimum."
  [[ -f "$FAMILLE" ]] || fail "Premier déploiement : $FAMILLE introuvable (voir backend/famille.exemple.json)."
fi

# ---------- build
JAR="$ROOT/backend/target/family-agenda-0.0.1-SNAPSHOT.jar"
WWW="$ROOT/front/dist/family-agenda-front/browser"
if $BUILD; then
  step "Vérification du JDK"
  JAVA_LINE="$(cd "$ROOT/backend" && ./mvnw -v 2>/dev/null | grep -E '^Java version' || true)"
  if [[ ! "$JAVA_LINE" =~ ^Java\ version:\ $JAVA_MAJOR([.,]|$) ]]; then
    fail "le build exige un JDK $JAVA_MAJOR (./mvnw -v : ${JAVA_LINE:-aucun JDK trouvé}).
  Installer Temurin $JAVA_MAJOR (Ubuntu / Debian), puis relancer :
    sudo apt install -y wget apt-transport-https gpg
    wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/adoptium.gpg >/dev/null
    echo \"deb https://packages.adoptium.net/artifactory/deb \$(. /etc/os-release && echo \$VERSION_CODENAME) main\" | sudo tee /etc/apt/sources.list.d/adoptium.list
    sudo apt update && sudo apt install -y temurin-$JAVA_MAJOR-jdk
  (ou exporter JAVA_HOME vers un JDK $JAVA_MAJOR déjà installé)"
  fi
  echo "$JAVA_LINE"

  step "Build du backend"
  if $SKIP_TESTS; then
    (cd "$ROOT/backend" && ./mvnw -q -DskipTests package)
  else
    (cd "$ROOT/backend" && ./mvnw -q package)
  fi
  step "Build du front (fr + nl)"
  [[ -d "$ROOT/front/node_modules" ]] || (cd "$ROOT/front" && npm ci)
  (cd "$ROOT/front" && npm run build --silent)
fi
[[ -f "$JAR" ]] || fail "$JAR absent (lancez sans --no-build)."
[[ -f "$WWW/fr/index.html" && -f "$WWW/nl/index.html" ]] || fail "build du front absent dans $WWW (lancez sans --no-build)."

# ---------- paquet à installer
step "Préparation du paquet"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/app" "$STAGE/www" "$STAGE/config"
cp "$DEPLOY/docker-compose.yml" "$DEPLOY/nginx.conf.template" "$DEPLOY/backup.sh" "$DEPLOY/restore.sh" "$STAGE/"
cp "$JAR" "$STAGE/app/app.jar"
cp -r "$WWW/." "$STAGE/www/"
chmod 755 "$STAGE/config"
# famille.json : au premier déploiement seulement (il contient les mots de passe initiaux)
if $FIRST; then
  cp "$FAMILLE" "$STAGE/config/famille.json"
  # lisible par le backend (utilisateur root du conteneur) seulement
  chmod 600 "$STAGE/config/famille.json"
fi

# .env du serveur : sans les variables propres à ce script ; ADMIN_PASSWORD au premier déploiement seulement
grep -vE '^(DEPLOY_HOST|DEPLOY_DIR|FAMILLE_JSON|ADMIN_PASSWORD)=' "$DEPLOY/.env" > "$STAGE/.env"
if $FIRST; then
  printf 'ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD" >> "$STAGE/.env"
fi
chmod 600 "$STAGE/.env"

# ---------- envoi
step "Envoi vers $DEST"
if [[ "$DEPLOY_HOST" == local ]]; then mkdir -p "$TARGET"; else ssh "$DEPLOY_HOST" mkdir -p "$TARGET"; fi
# --delete seulement pour le code (app, www) : les sauvegardes et la base restent intactes
rsync -a --delete "$STAGE/app" "$STAGE/www" "$DEST"
rsync -a "$STAGE/config" "$STAGE/.env" "$STAGE/docker-compose.yml" "$STAGE/nginx.conf.template" \
  "$STAGE/backup.sh" "$STAGE/restore.sh" "$DEST"

# ---------- démarrage (sur le serveur)
step "Démarrage des conteneurs"
run <<EOF
set -euo pipefail
cd "$TARGET"
export AGENDA_SEED_ENABLED=$FIRST

wait_backend() {
  for i in \$(seq 1 90); do
    if docker compose logs backend 2>&1 | grep -q "Started FamilyAgendaApplication"; then
      return 0
    fi
    sleep 2
  done
  echo "Le backend n'a pas démarré. Dernières lignes :" >&2
  docker compose logs --tail 60 backend >&2
  exit 1
}

docker compose pull --quiet
docker compose up -d db
# Nouveau jar, nouveau front : backend et nginx sont recréés
docker compose up -d --force-recreate backend web
echo "Attente du backend…"
wait_backend
docker compose logs backend 2>&1 | grep -E "Famille chargée|Compte administrateur|Compte .* repris|Pas de fichier famille|base contient déjà des membres" \
  | sed -E 's/^.* : //' || true

if [ "$FIRST" = true ]; then
  if ! docker compose logs backend 2>&1 | grep -q "Famille chargée"; then
    echo "La famille n'a pas été chargée : famille.json et ADMIN_PASSWORD restent sur le serveur ; corrigez puis relancez deploy.sh." >&2
    exit 1
  fi
  # Les mots de passe initiaux ne restent pas sur le serveur
  rm -f config/famille.json
  echo "config/famille.json supprimé du serveur (contenu de config/ : \$(ls -A config | wc -l) fichier)."
  sed -i '/^ADMIN_PASSWORD=/d' .env
  touch .famille-chargee
  # Backend recréé sans ADMIN_PASSWORD ni seed dans son environnement
  export AGENDA_SEED_ENABLED=false
  docker compose up -d --force-recreate backend
  echo "ADMIN_PASSWORD retiré du .env du serveur ; redémarrage du backend…"
  wait_backend
fi

echo
echo "Java du conteneur backend :"
docker compose exec -T backend java -version 2>&1
EOF

step "Terminé"
echo "Agenda : ${PUBLIC_URL%/}/fr/  (nl : ${PUBLIC_URL%/}/nl/)"
