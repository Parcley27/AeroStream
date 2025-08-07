#!/bin/bash

set -e  # Exit on any error

echo "Updating Beta Site"
echo "=================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directory
BETA_DIR="/var/www/beta.airtraffic.online"

# Check if running as sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run with sudo: sudo update-beta.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Checking beta directory...${NC}"

# Verify beta directory exists
if [ ! -d "$BETA_DIR" ]; then
    echo -e "${RED}Beta directory doesn't exist: $BETA_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}Beta directory found${NC}"

# Change to beta directory
cd "$BETA_DIR"

echo -e "${YELLOW}Resetting any local changes...${NC}"
# Force reset any local changes and clean untracked files
git reset --hard HEAD
git clean -fd

echo -e "${YELLOW}Fetching latest changes from GitHub...${NC}"
git fetch origin main

echo -e "${YELLOW}Pulling latest changes from GitHub...${NC}"
git reset --hard origin/main

echo -e "${GREEN}Repository updated successfully${NC}"

echo -e "${YELLOW}Setting proper permissions...${NC}"
chown -R www-data:www-data .
chmod -R 755 .

echo -e "${GREEN}Permissions set${NC}"

echo -e "${YELLOW}Testing nginx configuration...${NC}"
nginx -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Nginx configuration is valid${NC}"
    
    # Reload nginx
    echo -e "${YELLOW}Reloading nginx...${NC}"
    systemctl reload nginx
    echo -e "${GREEN}Nginx reloaded${NC}"
else
    echo -e "${RED}Nginx configuration error!${NC}"
    echo -e "${YELLOW}Please check nginx configuration manually${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}BETA UPDATE SUCCESSFUL!${NC}"
echo -e "${GREEN}Beta site updated from GitHub${NC}"
echo ""
echo "Beta site is available at https://beta.airtraffic.online"