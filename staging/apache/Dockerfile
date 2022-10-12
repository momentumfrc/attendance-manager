FROM php:apache
RUN docker-php-ext-install pdo pdo_mysql \
    && usermod -u 1000 www-data && groupmod -g 1000 www-data
RUN a2enmod rewrite
