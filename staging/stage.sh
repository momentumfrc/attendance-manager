#!/bin/bash

set -ex

SCRIPT_DIR=$(dirname $(readlink -f $0))
pushd ${SCRIPT_DIR}

docker compose down -v
rm -rf vhost-localhost/html/attendance/attendance-api vhost-localhost/html/attendance/attendance-web

git ls-files ../attendance-api | cpio -pdm ./vhost-localhost/html/attendance/attendance-api

source staging.env

pushd vhost-localhost/html/attendance/attendance-api
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

cp -r ../attendance-web/dist/attendance-web/browser vhost-localhost/html/attendance/attendance-web

pushd ../dev-proxy
docker compose down -v
popd

docker compose up --build -d

docker compose exec \
    -w /var/www/vhosts/localhost/html/attendance/attendance-api \
    litespeed su ubuntu -c "composer install --optimize-autoloader --no-dev && php artisan key:generate && php artisan storage:link"

sleep 10
for i in 1..10; do
    docker compose exec -w /var/www/vhosts/localhost/html/attendance/attendance-api -u 1000:1000 litespeed php artisan migrate --seed --seeder RolesSeeder && break
done

tail -f vhost-localhost/logs/error.log
popd
