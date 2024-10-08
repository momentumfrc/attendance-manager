#!/bin/bash

set -ex

SCRIPT_DIR=$(dirname $(readlink -f $0))
pushd ${SCRIPT_DIR}

docker compose down -v
rm -rf www/attendance/attendance-api www/attendance/attendance-web

git ls-files ../attendance-api | cpio -pdm ./www/attendance/attendance-api

source staging.env

pushd www/attendance/attendance-api
cp .env.example .env
sed -i "s/APP_URL=.*/APP_URL=${APP_URL//\//\\\/}/g" .env
sed -i "s/APP_DEBUG=.*/APP_DEBUG=${APP_DEBUG//\//\\\/}/g" .env
sed -i "s/APP_SUBDIR=.*/APP_SUBDIR=${APP_SUBDIR//\//\\\/}/g" .env
sed -i "s/DB_HOST=.*/DB_HOST=${DB_HOST//\//\\\/}/g" .env
sed -i "s/DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME//\//\\\/}/g" .env
sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_ID=.*/SLACK_CLIENT_ID=${SLACK_CLIENT_ID//\//\\\/}/g" .env
sed -i "s/SLACK_CLIENT_SECRET=.*/SLACK_CLIENT_SECRET=${SLACK_CLIENT_SECRET//\//\\\/}/g" .env
sed -i "s/SLACK_TEAM=.*/SLACK_TEAM=${SLACK_TEAM//\//\\\/}/g" .env

docker run -it --rm \
    -v ${PWD}/:/opt \
    -w /opt \
    -u 1000:1000 \
    laravelsail/php81-composer:latest \
    bash -c "composer install --optimize-autoloader --no-dev && php artisan key:generate"
popd

pushd ../attendance-web
rm -rf dist/attendance-web

docker run --rm \
    --entrypoint "sh" \
    -u 1000:1000 \
    -v ${PWD}/:/mnt \
    node:18-alpine \
    -c "cd /mnt && npm ci && npm run-script ng -- build -c production --base-href ${APP_SUBDIR}/"
popd

cp -r ../attendance-web/dist/attendance-web/browser www/attendance/attendance-web

mkdir -p data/sites-available
cp 000-default.conf data/sites-available/
sed -r -i "s/\t#?ServerName.*/\tServerName ${APP_SERVER_NAME//\//\\\/}/g" data/sites-available/000-default.conf

pushd ../dev-proxy
docker compose down -v
popd

docker compose up --build -d
sleep 10
for i in 1..10; do
    docker compose exec -w /var/www/html/attendance/attendance-api -u 1000:1000 apache php artisan migrate --seed --seeder RolesSeeder && break
done

docker compose logs -f
popd
