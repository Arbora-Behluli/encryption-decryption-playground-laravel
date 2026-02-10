# Use PHP 8.2 with Apache (production-ready)
FROM php:8.2-apache

# Set working directory
WORKDIR /var/www/html

# Install system dependencies required by Laravel
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    zip \
    curl \
    libzip-dev \
    && docker-php-ext-install zip

# Enable Apache rewrite module for Laravel routes
RUN a2enmod rewrite

# Copy all project files into container
COPY . .

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin \
    --filename=composer

# Install Laravel dependencies
RUN composer install --no-dev --optimize-autoloader

# Fix permissions for Laravel storage and cache
RUN chown -R www-data:www-data storage bootstrap/cache

# Set Apache document root to public folder
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri 's!/var/www/html!/var/www/html/public!g' \
    /etc/apache2/sites-available/*.conf

# Expose port 80 (Render uses this)
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]
