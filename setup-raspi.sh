#!/bin/bash

# Setup script for StudyBuddy AI on Raspberry Pi 5

set -e

echo "Setting up StudyBuddy AI on Raspberry Pi 5..."

# Create the named Docker volume for PostgreSQL data persistence
echo "Creating Docker volume for PostgreSQL data..."
docker volume create kidconverse_pgdata

# Create backup directory
BACKUP_DIR="/home/pi/studybuddy/backups"
echo "Creating backup directory at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env <<EOF
# Database Configuration (matches docker-compose.yml)
PGHOST=postgres
PGPORT=5432
PGUSER=user
PGPASSWORD=password
PGDATABASE=studybuddy

# OpenAI API Key (replace with your actual key)
OPENAI_API_KEY=sk-your-openai-api-key-here

# SendGrid API Key (optional, for email features)
SENDGRID_API_KEY=SG.your-sendgrid-key-here
EOF
    echo ".env file created. Please update it with your actual API keys."
fi

# Pull and build Docker images
echo "Building Docker images..."
docker-compose build --no-cache

# Start services
echo "Starting services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Initialize database
echo "Initializing database..."
docker-compose exec studybuddy npm run db:push

echo "Setup complete! StudyBuddy AI is now running on http://localhost:5000"
echo ""
echo "Useful commands:"
echo "  View logs:           docker-compose logs -f"
echo "  Stop services:       docker-compose down"
echo "  Backup database:     ./backup-db.sh"
echo "  Restore database:    ./restore-db.sh [backup-file]"