#!/bin/bash

set -e

echo "Updating Beta Site"
echo "===================="

BETA_DIR="/var/www/beta.airtraffic.online"

cd "$BETA_DIR"

echo "Pulling latest changes from GitHub..."
sudo git pull origin main

echo "Setting permissions..."
sudo chown -R www-data:www-data .
sudo chmod -R 755 .

echo "Reloading nginx..."
sudo systemctl reload nginx

echo "Beta site updated successfully!"
echo "Visit https://beta.airtraffic.online to view"