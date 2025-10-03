# ---------- base ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- deps: install ALL deps for build (incl. dev like vite/esbuild) ----------
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# ---------- builder: create production build ----------
FROM base AS builder
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Optional debug (uncomment if needed):
# RUN echo '--- tree after build ---' && ls -R

# ---------- runner: slim runtime with prod-only deps ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=5000

# non-root user
RUN addgroup --system --gid 1001 studybuddy \
 && adduser  --system --uid 1001 studybuddy

# install prod deps as root (avoids EACCES)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

# ---- bring in build output ----
# Client (Vite) output lives in client/dist when Vite root is "client"
COPY --from=builder /app/client/dist ./dist
# Server bundle from esbuild lives in dist/server
COPY --from=builder /app/dist/server ./dist/server

# drop privileges
RUN chown -R studybuddy:studybuddy /app
USER studybuddy

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => process.exit(r.statusCode===200?0:1))"

# Run the server bundle produced by esbuild
CMD ["node", "dist/server/index.js"]

