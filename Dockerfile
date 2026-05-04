# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies
COPY code/package*.json ./
RUN npm ci --legacy-peer-deps

# Build application
COPY code .
RUN DATABASE_URL=postgresql://naberza:postgres@localhost:5432/naberza_dev npx prisma generate
RUN npm run build

# Production stage
FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full node_modules (includes prisma client with all binary targets)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/vertex-key.json ./vertex-key.json

# Expose port
EXPOSE 3000

# Sync schema and start
CMD sh -c "npx prisma db push --accept-data-loss --skip-generate && npm start"
