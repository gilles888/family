#!/usr/bin/env bash
# Sauvegarde de la base (à lancer sur le serveur, dans le dossier d'installation ; deploy.sh l'y copie).
#
#   ./backup.sh            backups/family-AAAA-MM-JJ_HHMM.sql.gz, garde les GARDER (30) plus récentes
#
# Chaque nuit à 3 h (crontab -e sur le serveur) :
#   0 3 * * * cd ~/family && ./backup.sh >> backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
GARDER="${GARDER:-30}"

mkdir -p backups
chmod 700 backups
FILE="backups/family-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose exec -T db pg_dump -U family --clean --if-exists family_agenda | gzip > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
chmod 600 "$FILE"
echo "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"

# Rotation : seules les GARDER plus récentes restent
ls -1t backups/family-*.sql.gz | tail -n +"$((GARDER + 1))" | xargs -r rm --
