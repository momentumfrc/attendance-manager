#!/bin/bash
set -e

SCRIPT_DIR=$(dirname $(readlink -f $0))
cd ${SCRIPT_DIR}

[ -d attendance_backups ] || mkdir attendance_backups
[ -f .env ] || cp ../attendance-api/.env .

source .env

NOW_STR=$(date -u "+%Y%m%d_%H%M")

mysqldump --user=${DB_USERNAME} --password=${DB_PASSWORD} --databases ${DB_DATABASE} > attendance_backups/${NOW_STR}.sql

date
