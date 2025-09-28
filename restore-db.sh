#!/bin/bash

# Database restore script for StudyBuddy AI on Raspberry Pi

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-db.sh <backup-file>"
    echo "Example: ./restore-db.sh /home/pi/studybuddy/backups/studybuddy_backup_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will replace all current data in the database!"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring from $BACKUP_FILE..."

# Stop the application to prevent conflicts
echo "Stopping application..."
docker-compose stop studybuddy

# Restore the database
if [[ "$BACKUP_FILE" == *.gz ]]; then
    gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U studybuddy -d studybuddy
else
    docker-compose exec -T postgres psql -U studybuddy -d studybuddy < "$BACKUP_FILE"
fi

# Restart the application
echo "Restarting application..."
docker-compose start studybuddy

echo "Restore complete!"