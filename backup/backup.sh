#!/bin/bash
set -e

SCRIPT_DIR=$(dirname $(readlink -f $0))
cd ${SCRIPT_DIR}

if [ ! -d rclone ]; then
    mkdir rclone
    pushd rclone
    curl -o rclone.zip https://downloads.rclone.org/rclone-current-linux-amd64.zip
    unzip rclone.zip
    ln -s rclone-*-amd64/rclone rclone
    popd
fi

if [ ! -f rclone/rclone.conf ]; then
    echo "Rclone: No remotes configured"
    if [ ! -t 1]; then
        echo "Not a tty. Exiting."
        exit 1
    else
        echo "Running RClone configuration"
        echo "Use the interactive config to set up a new Google Drive remote with the following parameters:"
        echo "    1. remote name: 'drive'"
        echo "    2. remote type: 'drive'"
        echo "    3. drive scope: 'drive.file'"
        echo "    4. root_folder_id: '13z8jmwMoscQvJuc423qZ-Gny1NXgY8c9'"
        ./rclone/rclone --config ./rclone/rclone.conf config
    fi
fi

[ -d attendance_backups ] || mkdir attendance_backups
[ -f .env ] || cp ../attendance-api/.env .

source .env

NOW_STR=$(date -u "+%Y%m%d_%H%M")

mysqldump --user=${DB_USERNAME} --password=${DB_PASSWORD} --databases ${DB_DATABASE} > attendance_backups/${NOW_STR}.sql

# remove old backups
cd attendance_backups
# See https://superuser.com/questions/268344/how-do-i-delete-all-but-10-newest-files-in-linux
ls -1trp | grep -v / | head -n -50 | xargs -d '\n' rm -f --
cd ..

./rclone/rclone --config ./rclone/rclone.conf sync --transfers 4 --log-level INFO --drive-use-trash=false ./attendance_backups drive:
echo
