#!/usr/bin/env bash
# Déploie l'agenda familial en production (Docker Compose : PostgreSQL + backend + nginx).
#
#   ./deploy/deploy.sh                 build + déploiement vers DEPLOY_HOST (deploy/.env)
#   ./deploy/deploy.sh --skip-tests    sans lancer les tests backend
#   ./deploy/deploy.sh --no-build      redéploie les derniers builds (backend/target, front/dist)
#
# Le serveur n'a besoin que de Docker (avec docker compose) et, à distance, d'un accès ssh + rsync.
# famille.json et .env sont copiés directement sur le serveur : ils ne passent jamais par git.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY="$ROOT/deploy"
SKIP_TESTS=false
BUILD=true

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=true ;;
    --no-build) BUILD=false ;;
    -h | --help) sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
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
[[ -n "${DEPLOY_HOST:-}" ]] || fail "DEPLOY_HOST vide dans deploy/.env (utilisateur@serveur ou « local »)."
[[ -n "${DB_PASSWORD:-}" ]] || fail "DB_PASSWORD vide dans deploy/.env (ex. : openssl rand -base64 24)."
DEPLOY_DIR="${DEPLOY_DIR:-family}"
FAMILLE="$ROOT/${FAMILLE_JSON:-backend/famille.json}"
[[ "${FAMILLE_JSON:-}" == /* ]] && FAMILLE="$FAMILLE_JSON"

if [[ -z "${APP_PASSWORD:-}" ]]; then
  echo "Attention : APP_PASSWORD vide, le site sera accessible sans mot de passe."
fi
if [[ ! -f "$FAMILLE" ]]; then
  echo "Attention : $FAMILLE introuvable ; au premier démarrage, ce sera la famille de démonstration."
fi

# ---------- build
JAR="$ROOT/backend/target/family-agenda-0.0.1-SNAPSHOT.jar"
WWW="$ROOT/front/dist/family-agenda-front/browser"
if $BUILD; then
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
mkdir -p "$STAGE/app" "$STAGE/www" "$STAGE/config" "$STAGE/auth"
cp "$DEPLOY/docker-compose.yml" "$DEPLOY/nginx.conf.template" "$DEPLOY/backup.sh" "$DEPLOY/restore.sh" "$STAGE/"
cp "$JAR" "$STAGE/app/app.jar"
cp -r "$WWW/." "$STAGE/www/"
[[ -f "$FAMILLE" ]] && cp "$FAMILLE" "$STAGE/config/famille.json"

# .env du serveur : sans le mot de passe du site (seulement son empreinte, dans auth/htpasswd)
grep -vE '^(APP_PASSWORD|DEPLOY_HOST|DEPLOY_DIR|FAMILLE_JSON)=' "$DEPLOY/.env" > "$STAGE/.env"
if [[ -n "${APP_PASSWORD:-}" ]]; then
  printf '%s:%s\n' "${APP_USER:-famille}" "$(openssl passwd -apr1 "$APP_PASSWORD")" > "$STAGE/auth/htpasswd"
  echo 'AUTH_BASIC=Agenda familial' >> "$STAGE/.env"
else
  : > "$STAGE/auth/htpasswd"
  echo 'AUTH_BASIC=off' >> "$STAGE/.env"
fi
chmod 600 "$STAGE/.env"
# Lisible par nginx (utilisateur du conteneur) : il ne contient que l'empreinte du mot de passe
chmod 644 "$STAGE/auth/htpasswd"
[[ -f "$STAGE/config/famille.json" ]] && chmod 600 "$STAGE/config/famille.json"
chmod 755 "$STAGE/config" "$STAGE/auth"

# ---------- envoi
if [[ "$DEPLOY_HOST" == local ]]; then
  TARGET="$DEPLOY_DIR"
  [[ "$TARGET" == /* ]] || TARGET="$HOME/$TARGET"
  run() { bash -s; }
  step "Installation dans $TARGET"
  mkdir -p "$TARGET"
  DEST="$TARGET/"
else
  TARGET="$DEPLOY_DIR"
  run() { ssh "$DEPLOY_HOST" bash -s; }
  step "Envoi vers $DEPLOY_HOST:$TARGET"
  ssh "$DEPLOY_HOST" mkdir -p "$TARGET"
  DEST="$DEPLOY_HOST:$TARGET/"
fi
# --delete seulement pour le code (app, www) : les sauvegardes et la base restent intactes
rsync -a --delete "$STAGE/app" "$STAGE/www" "$DEST"
rsync -a "$STAGE/config" "$STAGE/auth" "$STAGE/.env" "$STAGE/docker-compose.yml" "$STAGE/nginx.conf.template" \
  "$STAGE/backup.sh" "$STAGE/restore.sh" "$DEST"

# ---------- démarrage (sur le serveur)
step "Démarrage des conteneurs"
run <<EOF
set -euo pipefail
cd "$TARGET"
docker compose version >/dev/null 2>&1 || { echo "Docker Compose est introuvable sur le serveur." >&2; exit 1; }
# Premier déploiement (pas encore de base) : la famille est chargée depuis config/famille.json
if docker volume inspect family_pgdata >/dev/null 2>&1; then
  export AGENDA_SEED_ENABLED=false
else
  echo "Premier déploiement : chargement de la famille."
  export AGENDA_SEED_ENABLED=true
fi
docker compose pull --quiet
docker compose up -d db
# Nouveau jar, nouveau front : backend et nginx sont recréés
docker compose up -d --force-recreate backend web

echo "Attente du backend…"
for i in \$(seq 1 90); do
  if docker compose logs backend 2>&1 | grep -q "Started FamilyAgendaApplication"; then
    docker compose logs backend 2>&1 | grep -E "Famille chargée|Pas de fichier famille|base contient déjà des membres" || true
    echo "Backend démarré."
    exit 0
  fi
  if [ "\$(docker compose ps -q backend | xargs docker inspect -f '{{.State.Running}}')" != true ]; then
    break
  fi
  sleep 2
done
echo "Le backend n'a pas démarré. Dernières lignes :" >&2
docker compose logs --tail 60 backend >&2
exit 1
EOF

step "Terminé"
HOST_NAME="${DEPLOY_HOST#*@}"
[[ "$DEPLOY_HOST" == local ]] && HOST_NAME=localhost
PORT_SUFFIX=""
[[ "${HTTP_PORT:-80}" != 80 ]] && PORT_SUFFIX=":${HTTP_PORT}"
echo "Agenda : http://${HOST_NAME}${PORT_SUFFIX}/fr/  (nl : /nl/)"
