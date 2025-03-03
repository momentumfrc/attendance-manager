#!/bin/bash

set -e


POSITIONAL_ARGS=()

RESEED=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --reseed)
      RESEED=true
      shift
      ;;
    -h|--help)
      echo $0 [--reseed]
      exit 0
      ;;
    -*|--*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters

set -x

SCRIPT_DIR=$(dirname $(readlink -f $0))
pushd ${SCRIPT_DIR}

pushd ..
for patch in deploy/patches/*.patch ; do
    patch -p1 -R < ${patch}
done
popd
function finish {
    cd ${SCRIPT_DIR}/..
    for patch in deploy/patches/*.patch ; do
        patch -p1 < ${patch}
    done
}
trap finish EXIT

rm -rf attendance
mkdir attendance

cp ../staging/vhost-localhost/html/attendance/.htaccess attendance

pushd ..

git ls-files attendance-api | cpio -pdm deploy/attendance
git ls-files attendance-web | cpio -pdm deploy/attendance

popd

mv attendance/attendance-web attendance/attendance-web-src

source deploy.env

GIT_HASH=$(git rev-parse --short HEAD)

pushd attendance/attendance-api
mv .env.example .env

# The "//\//\\\/" wizardry just tells bash to substitute '/' with '\/'
# This escapes the '/' so they're not interpreted as separators by sed
sed -i "s/APP_URL=.*/APP_URL=${APP_URL//\//\\\/}/g" .env
sed -i "s/APP_DEBUG=.*/APP_DEBUG=${APP_DEBUG//\//\\\/}/g" .env
sed -i "s/APP_ENV=.*/APP_ENV=${APP_ENV//\//\\\/}/g" .env
sed -i "s/APP_SUBDIR=.*/APP_SUBDIR=${APP_SUBDIR//\//\\\/}/g" .env
sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST//\//\\\/}/g" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME//\//\\\/}/g" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD//\//\\\/}/g" .env
sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_ID=.*/SLACK_CLIENT_ID=${SLACK_CLIENT_ID//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_SECRET=.*/SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET//\//\\\/}/g" .env
sed -i "s/SLACK_TEAM=.*/SLACK_TEAM=${SLACK_TEAM//\//\\\/}/g" .env
sed -i "s/GIT_HASH=.*/GIT_HASH=${GIT_HASH}/g" .env
popd

pushd attendance/attendance-web-src

sed -i "s/gitHash:.*/gitHash: \"${GIT_HASH}\"/g" src/environments/environment.prod.ts

rm -rf dist/attendance-web

docker run --rm \
    --entrypoint "sh" \
    -u 1000:1000 \
    -v ${PWD}/:/mnt \
    node:18-alpine \
    -c "cd /mnt && npm ci && npm run-script ng -- build -c production --base-href ${APP_SUBDIR}/"
popd

mv attendance/attendance-web-src/dist/attendance-web/browser attendance/attendance-web

rm -rf attendance/attendance-web-src

cat > attendance/install.sh << 'EOF'
#!/bin/bash
set -ex

EOF

cat >> attendance/install.sh << EOF
RESEED=${RESEED}

EOF

cat >> attendance/install.sh << 'EOF'
SCRIPT_DIR=$(dirname $(readlink -f $0))
cd ${SCRIPT_DIR}

pushd backup
./backup.sh
popd

cd attendance-api

composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan config:cache
php artisan storage:link
php artisan migrate --force

if [ ${RESEED} = true ]; then
    php artisan db:seed --class=RolesSeeder --force
fi

echo INSTALL FINISHED
sleep 2
rm $0
EOF

chmod +x attendance/install.sh

mkdir -p attendance/backup/attendance_backups
cp ../backup/backup.sh attendance/backup/backup.sh
chmod +x attendance/backup/backup.sh

mkdir -p attendance/scripts/logs
cp ./scripts/*.sh attendance/scripts
chmod +x attendance/scripts/*.sh

# -r   recursive
# -l   copy symlinks as symlinks
# -p   preserve permissions
# -t   preserve modification times
# -v   verbose
# -z   compress files during transfer
rsync -rlptvz --progress --delete \
    -e 'ssh -i ~/.ssh/id_rsa_win' \
    ./attendance/ momentu2@momentum4999.com:~/public_html/attendance \
    --exclude backup/attendance_backups/ \
    --exclude scripts/logs \
    --exclude attendance-api/storage/app/

ssh -i ~/.ssh/id_rsa_win momentu2@momentum4999.com 'bash -l -c "~/public_html/attendance/install.sh"'

popd
