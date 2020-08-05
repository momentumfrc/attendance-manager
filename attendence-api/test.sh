set -e

cd /workspace/attendence-api
composer install -n --no-ansi
cp .env.example .env
php artisan key:generate
php artisan passport:keys
vendor/bin/phpunit
rm .env
