#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

FROM php:7-cli

# This Dockerfile adds a non-root user with sudo access. Use the "remoteUser"
# property in devcontainer.json to use it. On Linux, the container user's GID/UIDs
# will be updated to match your local UID/GID (when using the dockerFile property).
# See https://aka.ms/vscode-remote/containers/non-root-user for details.
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Configure apt and install packages
RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends apt-utils dialog 2>&1 \
    #
    # [Optional] Install MariaDB client to manage database directly from dev container's shell
    && apt-get install -y mariadb-client \
    #
    # install git iproute2, procps, lsb-release (useful for CLI installs)
    && apt-get -y install git openssh-client less vim iproute2 procps iproute2 lsb-release \
    #
    # Install xdebug
    && yes | pecl install xdebug \
    && echo "zend_extension=$(find /usr/local/lib/php/extensions/ -name xdebug.so)" > /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.remote_enable=on" >> /usr/local/etc/php/conf.d/xdebug.ini \
    && echo "xdebug.remote_autostart=on" >> /usr/local/etc/php/conf.d/xdebug.ini \
    #
    # Create a non-root user to use if preferred - see https://aka.ms/vscode-remote/containers/non-root-user.
    && groupadd --gid $USER_GID $USERNAME \
    && useradd -s /bin/bash --uid $USER_UID --gid $USER_GID -m $USERNAME \
    # [Optional] Add sudo support for the non-root user
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME\
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    #
    # [Optional] Install NPM to assist with frontend development (Dramatically increases build time on slower connections)
    && apt-get install -y npm \
    && npm install npm@latest -g \
    #
    # Clean up
    && apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

RUN apt-get update \
    && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install zlib1g-dev libzip-dev zip unzip \
    && docker-php-ext-install -j "$(nproc)" zip \
    && docker-php-ext-install -j "$(nproc)" mysqli pdo pdo_mysql \
    && apt-get -y install sqlite3 libsqlite3-dev \
    && docker-php-ext-install -j "$(nproc)" pdo_sqlite

RUN EXPECTED_CHECKSUM="$(curl -q -L https://composer.github.io/installer.sig)" ; \
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" ; \
    ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")" ; \
    #
    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ] ; then \
        >&2 echo 'ERROR: Invalid installer checksum' ; \
        rm composer-setup.php ; \
        exit 1 ; \
    fi ; \
    #
    php composer-setup.php --install-dir=/usr/bin --filename=composer ; \
    RESULT=$? ; \
    rm composer-setup.php ; \
    echo "\nexport PATH=\$PATH:\$HOME/.composer/vendor/bin" >> ~/.bashrc ; \
    exit $RESULT

RUN composer global require laravel/installer ; \
    npm install -g @angular/cli
