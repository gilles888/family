#!/usr/bin/env bash
# Restaure une sauvegarde de backup.sh (à lancer sur le serveur, dans le dossier d'installation).
#
#   ./restore.sh backups/family-2026-10-24_0300.sql.gz
#
# Remplace TOUTES les données actuelles par celles de la sauvegarde.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
FILE="${1:-}"
[[ -f "$FILE" ]] || { echo "Usage : ./restore.sh backups/family-….sql.gz" >&2; ls -1t backups/*.sql.gz 2>/dev/null | head -5; exit 1; }

read -r -p "Remplacer toutes les données actuelles par $FILE ? Tapez « oui » : " answer
[[ "$answer" == oui ]] || { echo "Annulé."; exit 1; }

# Filet de sécurité : l'état actuel est sauvegardé avant d'être écrasé
./backup.sh
docker compose stop backend
gunzip -c "$FILE" | docker compose exec -T db psql -q -v ON_ERROR_STOP=1 -U family -d family_agenda
docker compose start backend
echo "Restauré depuis $FILE."
