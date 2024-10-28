FROM litespeedtech/litespeed:6.3.1-lsphp81

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN echo "admin:$(/usr/local/lsws/admin/fcgi-bin/admin_php5 -q /usr/local/lsws/admin/misc/htpasswd.php password)" > /usr/local/lsws/admin/conf/htpasswd \
    && chmod 666 /usr/local/lsws/admin/conf/htpasswd

COPY --from=composer/composer:latest-bin /composer /usr/bin/composer
