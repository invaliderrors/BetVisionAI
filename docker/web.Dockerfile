# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage image for the Next.js app (apps/web) in the Nx monorepo.
#
#   docker build -f docker/web.Dockerfile -t betvision-web .
#
# NOTE (for the FE app phase): adding `output: 'standalone'` to
# apps/web/next.config.js would let us ship a much slimmer runtime image
# (only .next/standalone + .next/static). Until then we run `next start`
# against the built app using production dependencies only.
# ─────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build ---------------------------------------------------------
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NX_DAEMON=false \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Produces the Next build output at apps/web/.next
RUN npx nx build web

# ---- Stage 2: slim runtime --------------------------------------------------
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app

# Production dependencies only (next / react / react-dom live in dependencies).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built app + the assets `next start` needs.
COPY --from=builder --chown=app:app /app/apps/web/.next        ./apps/web/.next
COPY --from=builder --chown=app:app /app/apps/web/public       ./apps/web/public
COPY --from=builder --chown=app:app /app/apps/web/next.config.js ./apps/web/next.config.js

USER app
EXPOSE 3000

# `next start <dir>` reads apps/web/.next and apps/web/next.config.js.
CMD ["sh", "-c", "node_modules/.bin/next start apps/web -H 0.0.0.0 -p ${PORT}"]
