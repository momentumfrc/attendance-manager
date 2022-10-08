cp .env.example .env

docker run -it --rm -v /home/jordan/git/attendence-manager/attendence-api:/opt -w /opt laravelsail/php81-composer:latest bash -c "composer install && php artisan key:generate"

./vendor/bin/sail up -d
sleep 5

./vendor/bin/sail stop
