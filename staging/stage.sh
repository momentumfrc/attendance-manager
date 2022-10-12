#!/bin/bash

set -ex

SCRIPT_DIR=$(dirname $(readlink -f $0))
pushd ${SCRIPT_DIR}

docker compose down -v
sudo rm -rf www/attendance/attendance-api www/attendance/attendance-web

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
    laravelsail/php74-composer:latest \
    bash -c "composer install --optimize-autoloader --no-dev && php artisan key:generate"
popd

pushd ../attendance-web
docker compose run angular.test ng build -c "production" --base-href ${APP_SUBDIR}/
popd

cp -r ../attendance-web/dist/attendance-web www/attendance/

mkdir -p data/sites-available
cp 000-default.conf data/sites-available/
sed -r -i "s/\t#?ServerName.*/\tServerName ${APP_SERVER_NAME//\//\\\/}/g" data/sites-available/000-default.conf

docker compose up --build -d
sleep 5
docker compose exec -w /var/www/html/attendance/attendance-api apache php artisan migrate --seed --seeder RolesSeeder

docker compose logs -f
popd
