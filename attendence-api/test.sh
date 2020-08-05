set -e

cd /workspace/attendence-api
composer install -n --no-ansi
php artisan passport:keys
vendor/bin/phpunit
