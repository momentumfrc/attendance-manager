FROM litespeedtech/openlitespeed:1.8.2-lsphp81

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY admin-htpasswd /usr/local/lsws/admin/conf/htpasswd

COPY --from=composer/composer:latest-bin /composer /usr/bin/composer
