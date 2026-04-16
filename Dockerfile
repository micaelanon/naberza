# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY code/package*.json ./
RUN npm ci --legacy-peer-deps

# Build application
COPY code . 
RUN npm run build

# Production stage  
FROM node:22-alpine

WORKDIR /app

# Copy package files first
COPY code/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
