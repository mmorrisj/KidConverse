#!/bin/bash

# Database backup script for StudyBuddy AI on Raspberry Pi

set -e

BACKUP_DIR="/home/pi/studybuddy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/studybuddy_backup_$TIMESTAMP.sql"

echo "Creating backup at $BACKUP_FILE..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Perform backup
docker-compose exec -T postgres pg_dump -U user studybuddy > "$BACKUP_FILE"

# Compress the backup
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"

# Keep only the last 7 backups
echo "Cleaning up old backups..."
ls -t "$BACKUP_DIR"/*.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup process complete!"