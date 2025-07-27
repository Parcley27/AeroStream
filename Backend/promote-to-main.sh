#!/bin/bash

set -e  # Exit on any error

echo "Promoting beta site to main"
echo "==========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
BETA_DIR="/var/www/beta.airtraffic.online"
MAIN_DIR="/var/www/airtraffic.online"
BACKUP_DIR="/var/www/backups"

# Check if running as sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo promote-to-main.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Checking beta site status...${NC}"

# Verify beta directory exists and has content
if [ ! -d "$BETA_DIR" ] || [ -z "$(ls -A $BETA_DIR)" ]; then
    echo -e "${RED}Beta directory is empty or doesn't exist!${NC}"
    exit 1
fi

echo -e "${GREEN}Beta site found${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup of current main site
echo -e "${YELLOW}Creating backup of current main site...${NC}"
BACKUP_NAME="main-backup-$(date +%Y%m%d-%H%M%S)"
if [ -d "$MAIN_DIR" ] && [ "$(ls -A $MAIN_DIR)" ]; then
    cp -r "$MAIN_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    echo -e "${GREEN}Backup created: $BACKUP_DIR/$BACKUP_NAME${NC}"
else
    echo -e "${YELLOW}No existing main site to backup${NC}"
fi

# Sync beta to main
echo -e "${YELLOW}Promoting beta to main site...${NC}"
rsync -av --delete "$BETA_DIR/" "$MAIN_DIR/"

# Set proper permissions
echo -e "${YELLOW}Setting proper permissions...${NC}"
chown -R www-data:www-data "$MAIN_DIR"
chmod -R 755 "$MAIN_DIR"

# Test nginx configuration
echo -e "${YELLOW}Testing nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}Reloading nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded${NC}"
else
    echo -e "${RED}Nginx configuration error! Rolling back...${NC}"
    if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
        rm -rf "$MAIN_DIR"
        cp -r "$BACKUP_DIR/$BACKUP_NAME" "$MAIN_DIR"
        chown -R www-data:www-data "$MAIN_DIR"
        echo -e "${YELLOW}Rollback completed${NC}"
    fi
    exit 1
fi

# Cleanup old backups (keep last 10)
echo -e "${YELLOW}Cleaning up old backups...${NC}"
cd "$BACKUP_DIR"
ls -t | tail -n +11 | xargs -r rm -rf 2>/dev/null || true
echo -e "${GREEN}Cleanup completed${NC}"

echo ""
echo -e "${GREEN}PROMOTION SUCCESSFUL!${NC}"
echo -e "${GREEN}Beta site promoted to https://airtraffic.online${NC}"
if [ -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
    echo -e "${GREEN}Backup saved as: $BACKUP_NAME${NC}"
fi
echo ""
echo "Main site is available at https://airtraffic.online"