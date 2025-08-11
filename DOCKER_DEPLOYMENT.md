# Docker Deployment Guide for StudyBuddy AI

This guide explains how to deploy StudyBuddy AI using Docker, optimized for ARM architecture (Raspberry Pi) deployment.

## Prerequisites

- Docker and Docker Compose installed
- OpenAI API key
- SendGrid API key (optional, for email functionality)
- Database setup (PostgreSQL)

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://studybuddy:studybuddy123@postgres:5432/studybuddy
POSTGRES_PASSWORD=studybuddy123

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Email Configuration (Optional)
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Application Configuration
NODE_ENV=production
PORT=5000
```

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd studybuddy-ai
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Build and start the application:**
   ```bash
   docker-compose up -d
   ```

4. **Initialize the database:**
   ```bash
   docker-compose exec studybuddy npm run db:push
   ```

5. **Access the application:**
   - Open your browser to `http://localhost:5000`
   - For Raspberry Pi deployment, use the Pi's IP address

## Architecture

### Multi-Stage Build
The Dockerfile uses a multi-stage build process optimized for ARM architecture:
- **deps**: Installs production dependencies
- **builder**: Builds the application
- **runner**: Creates the final production image

### Services
- **studybuddy**: Main application container
- **postgres**: PostgreSQL database container

### Security Features
- Non-root user execution
- Health checks for both services
- Restart policies for reliability

## Raspberry Pi Deployment

### Hardware Requirements
- Raspberry Pi 4 (recommended) or Pi 3B+
- Minimum 4GB RAM recommended
- 32GB+ SD card
- Stable internet connection

### Performance Optimizations
- ARM-optimized base images
- Production-only dependencies
- Health monitoring and auto-restart
- Efficient Node.js runtime

### Setup Commands
```bash
# On Raspberry Pi, ensure Docker is installed
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo pip3 install docker-compose

# Deploy the application
docker-compose up -d
```

## Monitoring and Maintenance

### Health Checks
Both services include health checks:
- Application: HTTP check on `/health` endpoint
- Database: PostgreSQL connection check

### Logs
View application logs:
```bash
docker-compose logs studybuddy
docker-compose logs postgres
```

### Updates
To update the application:
```bash
git pull
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
docker-compose exec postgres pg_dump -U studybuddy studybuddy > backup.sql
```

### Restore Database
```bash
docker-compose exec -T postgres psql -U studybuddy studybuddy < backup.sql
```

## Troubleshooting

### Common Issues

1. **Build fails on ARM64:**
   - Ensure you're using the ARM64 version of Node.js base image
   - Check that all dependencies support ARM architecture

2. **Database connection errors:**
   - Verify DATABASE_URL format
   - Ensure PostgreSQL service is healthy
   - Check network connectivity between containers

3. **Application won't start:**
   - Check environment variables
   - Verify OpenAI API key is valid
   - Review application logs

### Performance Tuning

For Raspberry Pi deployment:
```bash
# Increase Docker memory limit
echo '{"default-ulimits":{"memlock":{"Name":"memlock","Hard":-1,"Soft":-1}}}' | sudo tee /etc/docker/daemon.json

# Restart Docker
sudo systemctl restart docker
```

## Production Considerations

### Security
- Change default database passwords
- Use secrets management for API keys
- Enable SSL/TLS with reverse proxy (nginx)
- Regular security updates

### Scaling
- Consider read replicas for database
- Use load balancer for multiple instances
- Monitor resource usage and scale accordingly

### Backup Strategy
- Regular database backups
- Application data backup
- Configuration backup
- Disaster recovery plan

## Support

For deployment issues or questions:
1. Check the application logs
2. Verify environment configuration
3. Review this documentation
4. Check system resources (CPU, memory, disk)