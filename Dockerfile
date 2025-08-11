# Multi-stage Docker build for StudyBuddy AI
# Optimized for Raspberry Pi (ARM architecture)

# Build stage for frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY client/ ./client/
COPY shared/ ./shared/

# Build frontend
RUN npm run build:client

# Build stage for backend
FROM node:18-alpine AS backend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies for build
RUN npm ci

# Copy backend source
COPY server/ ./server/
COPY shared/ ./shared/

# Build backend
RUN npm run build:server

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for ARM/Raspberry Pi
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    tini

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S studybuddy -u 1001

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/server-dist ./server-dist
COPY --from=backend-builder /app/shared ./shared

# Set ownership
RUN chown -R studybuddy:nodejs /app
USER studybuddy

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use tini as PID 1 to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server-dist/index.js"]