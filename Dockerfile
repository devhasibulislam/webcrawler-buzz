# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# --- deps ---
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# --- builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN npm run build   # tailwind + tsc → dist/ and public/styles.css

# --- runner ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5005
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache wget \
 && addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 app

# Install production deps only
COPY --chown=app:nodejs package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy build output + static assets
COPY --from=builder --chown=app:nodejs /app/dist    ./dist
COPY --from=builder --chown=app:nodejs /app/public  ./public

# Runtime writable dirs (BullMQ export worker writes CSVs here)
RUN mkdir -p /app/tmp/exports && chown -R app:nodejs /app/tmp

USER app
EXPOSE 5005
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5005/api/health >/dev/null 2>&1 || exit 1

# Run migrations then start the server
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
