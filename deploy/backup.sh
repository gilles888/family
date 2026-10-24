#!/usr/bin/env bash
# Sauvegarde de la base (sur le serveur, dans le dossier d'installation ; deploy.sh l'y copie).
#
#   ./backup.sh            backups/family-AAAA-MM-JJ_HHMM.sql.gz, garde les GARDER (30) plus récentes
#
# Lancé chaque nuit par cron (tâche installée par deploy.sh, BACKUP_CRON dans .env) ; journal : backups/backup.log.
# Les sauvegardes restent sur le serveur : elles protègent d'une erreur de manipulation, pas d'une perte du disque.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
GARDER="${GARDER:-30}"
log() { echo "$(date '+%F %T') $*"; }

mkdir -p backups
chmod 700 backups
FILE="backups/family-$(date +%Y-%m-%d_%H%M).sql.gz"
# Pas de fichier partiel en cas d'échec
trap 'rm -f "$FILE.tmp"' EXIT
# </dev/null : exec ne doit pas lire l'entrée standard (cron, ssh)
docker compose exec -T db pg_dump -U family --clean --if-exists family_agenda </dev/null | gzip > "$FILE.tmp"
# Archive lisible et dump complet (pg_dump termine par « PostgreSQL database dump complete »)
gzip -t "$FILE.tmp"
gunzip -c "$FILE.tmp" | tail -n 5 | grep -q "database dump complete" || { log "ÉCHEC : dump incomplet"; exit 1; }
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"
log "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"

# Rotation : seules les GARDER plus récentes restent
ls -1t backups/family-*.sql.gz | tail -n +"$((GARDER + 1))" | xargs -r rm --
log "$(ls -1 backups/family-*.sql.gz | wc -l) sauvegarde(s) conservée(s)"
