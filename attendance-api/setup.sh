cp .env.example .env

pushd $(dirname $(readlink -f $0))

docker run -it --rm -v ${PWD}/:/opt -w /opt laravelsail/php74-composer:latest bash -c "composer install && php artisan key:generate"

./vendor/bin/sail up -d
sleep 5

./vendor/bin/sail stop

popd
