# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Reusable multi-stage image for the Nx *Node* apps (api + worker).
#
# One pattern, parameterised by the `PROJECT` build-arg so `apps/api` and
# `apps/worker` share this exact file (see docker-compose.yml `build.args`).
#
#   docker build -f docker/node.Dockerfile --build-arg PROJECT=api    -t betvision-api    .
#   docker build -f docker/node.Dockerfile --build-arg PROJECT=worker -t betvision-worker .
#
# The Nx webpack build (`generatePackageJson: true`) emits a self-contained
# bundle + a pruned package.json into dist/apps/<project>; `nx prune` adds the
# matching lockfile so the runtime stage installs prod deps deterministically.
# ─────────────────────────────────────────────────────────────────────────────

# ---- Stage 1: build with the full Nx toolchain ------------------------------
FROM node:20-alpine AS builder

# Toolchain for any native addons future phases may pull in (argon2, bcrypt…).
RUN apk add --no-cache python3 make g++ libc6-compat

WORKDIR /app

# Nx must not spawn its background daemon inside the build container.
ENV NX_DAEMON=false \
    CI=true

# Install deps first for better layer caching (only re-runs when lockfile changes).
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the monorepo (see .dockerignore for what stays out).
COPY . .

# Build the requested project, then prune to a deployable dist folder
# (bundle + pruned package.json + package-lock.json + workspace_modules).
ARG PROJECT
RUN test -n "$PROJECT" || (echo "PROJECT build-arg is required (api|worker)" && exit 1)
RUN npx nx build "$PROJECT" \
 && npx nx prune "$PROJECT"

# ---- Stage 2: slim runtime --------------------------------------------------
FROM node:20-alpine AS runner

# libc6-compat keeps musl-linked prebuilt native binaries happy at runtime.
RUN apk add --no-cache libc6-compat

ARG PROJECT
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Run as an unprivileged user (never root in the runtime image).
RUN addgroup -S app && adduser -S app -G app

# Copy only the pruned, self-contained dist for this project.
COPY --from=builder --chown=app:app /app/dist/apps/${PROJECT}/ ./

# Install production dependencies from the pruned lockfile only.
RUN npm ci --omit=dev && npm cache clean --force

USER app
EXPOSE 3000

# The webpack bundle entrypoint is dist/apps/<project>/main.js.
CMD ["node", "main.js"]
