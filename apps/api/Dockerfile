# Multi-stage build for FieldView.live API
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./

# ===== Dependencies stage =====
FROM base AS deps

# Copy package files
COPY packages/data-model/package.json ./packages/data-model/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ===== Build stage =====
FROM base AS builder

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/data-model/node_modules ./packages/data-model/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY packages/data-model ./packages/data-model
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd packages/data-model && pnpm db:generate

# Build data-model package
RUN cd packages/data-model && pnpm build

# Build API
RUN cd apps/api && pnpm build

# ===== Production stage =====
FROM node:20-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/data-model/node_modules ./packages/data-model/node_modules
COPY --from=builder /app/packages/data-model/dist ./packages/data-model/dist
COPY --from=builder /app/packages/data-model/package.json ./packages/data-model/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Copy Prisma schema for migrations
COPY --from=builder /app/packages/data-model/prisma ./packages/data-model/prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

WORKDIR /app/apps/api

# Start the server
CMD ["node", "dist/server.js"]
