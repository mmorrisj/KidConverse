# Docker Deployment Guide for StudyBuddy AI

This guide will help you deploy StudyBuddy AI on your Raspberry Pi using Docker.

## Prerequisites

1. **Raspberry Pi Setup**
   - Raspberry Pi 3B+ or newer (recommended: Pi 4 with 4GB+ RAM)
   - Raspberry Pi OS (64-bit recommended)
   - Docker installed on your Pi

2. **Install Docker on Raspberry Pi**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # Add user to docker group
   sudo usermod -aG docker $USER
   
   # Install Docker Compose
   sudo pip3 install docker-compose
   
   # Reboot to apply changes
   sudo reboot
   ```

## Quick Start

1. **Clone or Transfer Files**
   ```bash
   # If you have git access
   git clone <your-repo-url>
   cd studybuddy-ai
   
   # Or transfer files manually to your Pi
   ```

2. **Configure Environment**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit the environment file
   nano .env
   ```
   
   Add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   NODE_ENV=production
   PORT=5000
   ```

3. **Build and Run with Docker Compose**
   ```bash
   # Build and start the application
   docker-compose up -d
   
   # Check if it's running
   docker-compose ps
   
   # View logs
   docker-compose logs -f studybuddy
   ```

4. **Access the Application**
   - Open your browser and go to `http://your-pi-ip:5000`
   - For example: `http://192.168.1.100:5000`

## Manual Docker Commands

If you prefer to use Docker directly:

```bash
# Build the image
docker build -t studybuddy-ai .

# Run the container
docker run -d \
  --name studybuddy \
  -p 5000:5000 \
  --env-file .env \
  --restart unless-stopped \
  studybuddy-ai

# View logs
docker logs -f studybuddy

# Stop the container
docker stop studybuddy

# Remove the container
docker rm studybuddy
```

## Performance Optimization for Raspberry Pi

### Memory Limits
The Docker Compose file includes memory limits suitable for Raspberry Pi:
- Memory limit: 512MB
- Memory reservation: 256MB

### For Pi 3 or limited memory systems:
```yaml
# In docker-compose.yml, adjust limits:
deploy:
  resources:
    limits:
      memory: 256M
    reservations:
      memory: 128M
```

### Performance Tips
1. **Use a fast SD card** (Class 10 or better, preferably SSD via USB)
2. **Enable swap** if you have limited RAM:
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile
   # Set CONF_SWAPSIZE=1024
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

## Troubleshooting

### Check Application Health
```bash
# Check if the health endpoint responds
curl http://localhost:5000/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Common Issues

1. **Out of Memory**
   ```bash
   # Check system resources
   free -h
   docker stats
   
   # Reduce memory limits or enable swap
   ```

2. **Port Already in Use**
   ```bash
   # Check what's using port 5000
   sudo netstat -tulpn | grep :5000
   
   # Change port in docker-compose.yml if needed
   ```

3. **Build Fails**
   ```bash
   # Clean build cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

4. **Slow Performance**
   - Ensure you're using ARM-optimized base images (already configured)
   - Consider using a USB SSD instead of SD card
   - Reduce memory limits if running out of RAM

## Updating the Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Security Considerations

1. **Firewall**: Configure your Pi's firewall to only allow necessary ports
2. **SSL/TLS**: For production, consider setting up a reverse proxy with SSL
3. **API Key**: Keep your OpenAI API key secure and never commit it to version control
4. **Updates**: Regularly update your Pi's OS and Docker images

## Monitoring

```bash
# View real-time logs
docker-compose logs -f

# Check container status
docker-compose ps

# Monitor system resources
htop
docker stats
```

## Advanced Configuration

### Using with Reverse Proxy (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Environment Variables Reference
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `NODE_ENV`: Set to 'production' for deployment
- `PORT`: Application port (default: 5000)
- `PUBLIC_OBJECT_SEARCH_PATHS`: For image upload features (optional)
- `PRIVATE_OBJECT_DIR`: For image upload features (optional)

For support or issues, check the application logs first, then refer to the main documentation.