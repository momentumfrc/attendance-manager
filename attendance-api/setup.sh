[ -f .env ] || cp .env.example .env

pushd $(dirname $(readlink -f $0))

docker run -it --rm -v ${PWD}/:/opt -w /opt -u 1000:1000 laravelsail/php74-composer:latest bash -c "composer install"

./vendor/bin/sail up -d
sleep 5

./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan migrate:refresh --seed

./vendor/bin/sail stop

popd
