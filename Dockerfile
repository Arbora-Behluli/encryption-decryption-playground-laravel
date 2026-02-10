# Use official PHP image with Apache
FROM php:8.2-apache

# Set working directory
WORKDIR /var/www/html

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install zip

# Enable mod_rewrite for Laravel routing
RUN a2enmod rewrite

# Copy everything to container
COPY . /var/www/html

# Install Composer
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && php -r "unlink('composer-setup.php');"

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Clear and cache Laravel configs
RUN php artisan config:cache
RUN php artisan route:cache

# Expose port 10000
EXPOSE 10000

# Start Apache
CMD ["apache2-foreground"]
