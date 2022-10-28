#!/bin/bash

set -ex

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

cp ../staging/www/attendance/.htaccess attendance

git ls-files ../attendance-api | cpio -pdm ./attendance/attendance-api

source deploy.env

pushd attendance/attendance-api
mv .env.example .env
sed -i "s/APP_URL=.*/APP_URL=${APP_URL//\//\\\/}/g" .env
sed -i "s/APP_DEBUG=.*/APP_DEBUG=${APP_DEBUG//\//\\\/}/g" .env
sed -i "s/APP_SUBDIR=.*/APP_SUBDIR=${APP_SUBDIR//\//\\\/}/g" .env
sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST//\//\\\/}/g" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME//\//\\\/}/g" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD//\//\\\/}/g" .env
sed -i "s/DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_ID=.*/SLACK_CLIENT_ID=${SLACK_CLIENT_ID//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_SECRET=.*/SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET//\//\\\/}/g" .env
sed -i "s/SLACK_TEAM=.*/SLACK_TEAM=${SLACK_TEAM//\//\\\/}/g" .env
popd

pushd ../attendance-web
rm -rf dist/attendance-web

docker run --rm \
    --entrypoint "sh" \
    -u 1000:1000 \
    -v ${PWD}/:/mnt \
    node:alpine \
    -c "cd /mnt && npm ci && npm run-script ng -- build -c production --base-href ${APP_SUBDIR}/"
popd

cp -r ../attendance-web/dist/attendance-web attendance/

cat > attendance/install.sh << 'EOF'
#!/bin/bash
set -ex

SCRIPT_DIR=$(dirname $(readlink -f $0))
cd ${SCRIPT_DIR}

cd attendance-api

composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan config:cache
php artisan migrate
#php artisan seed --class=RolesSeeder

echo INSTALL FINISHED
sleep 2
rm $0
EOF

chmod +x attendance/install.sh

# -r   recursive
# -l   copy symlinks as symlinks
# -p   preserve permissions
# -t   preserve modification times
# -v   verbose
# -z   compress files during transfer
rsync -rlptvz --progress --delete \
    -e 'ssh -i ~/.ssh/id_rsa_win' \
    ./attendance/ momentu2@momentum4999.com:~/public_html/attendance

ssh -i ~/.ssh/id_rsa_win momentu2@momentum4999.com 'bash -l -c "~/public_html/attendance/install.sh"'

popd
