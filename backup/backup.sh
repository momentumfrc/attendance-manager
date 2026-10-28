#!/bin/bash
set -euo pipefail

# How many dumps to keep in attendance_backups; older ones are deleted after each successful dump
KEEP_BACKUPS=${KEEP_BACKUPS:-30}

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
cd "${SCRIPT_DIR}"

ENV_FILE=../attendance-api/.env

# Reads KEY from the api's .env without executing it. Handles unquoted and single-quoted values,
# which is what deploy.sh writes.
env_value() {
    local value
    value=$(grep -m1 "^$1=" "${ENV_FILE}" | cut -d= -f2-) || true
    if [[ ${value} =~ ^\'(.*)\'$ || ${value} =~ ^\"(.*)\"$ ]]; then
        value=${BASH_REMATCH[1]}
    fi
    printf '%s' "${value}"
}

DB_HOST=$(env_value DB_HOST)
DB_PORT=$(env_value DB_PORT)
DB_DATABASE=$(env_value DB_DATABASE)
DB_USERNAME=$(env_value DB_USERNAME)
DB_PASSWORD=$(env_value DB_PASSWORD)

mkdir -p attendance_backups

# Pass the credentials in an option file so the password doesn't show up in the process list
CREDENTIALS_FILE=$(mktemp)
DUMP_FILE=attendance_backups/$(date -u "+%Y%m%d_%H%M").sql
trap 'rm -f "${CREDENTIALS_FILE}" "${DUMP_FILE}.partial"' EXIT

escape_option() {
    local value=${1//\\/\\\\}
    printf '%s' "${value//\"/\\\"}"
}

cat > "${CREDENTIALS_FILE}" << EOF
[client]
host="$(escape_option "${DB_HOST:-localhost}")"
port="$(escape_option "${DB_PORT:-3306}")"
user="$(escape_option "${DB_USERNAME}")"
password="$(escape_option "${DB_PASSWORD}")"
EOF

mysqldump --defaults-extra-file="${CREDENTIALS_FILE}" \
    --single-transaction \
    --databases "${DB_DATABASE}" > "${DUMP_FILE}.partial"

# mysqldump writes this footer only when the dump ran to completion
if ! tail -n 1 "${DUMP_FILE}.partial" | grep -q '^-- Dump completed'; then
    echo "Backup is incomplete: ${DUMP_FILE}.partial has no completion footer" >&2
    exit 1
fi

mv "${DUMP_FILE}.partial" "${DUMP_FILE}"
echo "Wrote ${DUMP_FILE}"

ls -1 attendance_backups/*.sql | sort -r | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm --

date
