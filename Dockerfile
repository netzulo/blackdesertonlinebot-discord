# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
# Using --legacy-peer-deps to handle potential peer dependency issues
RUN npm install --legacy-peer-deps

# Verify TypeScript is installed
RUN test -f ./node_modules/.bin/tsc || (echo "ERROR: TypeScript not installed" && exit 1)

# Copy source code and TypeScript configs
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src

# Build TypeScript using tsconfig.build.json
RUN ./node_modules/.bin/tsc -p tsconfig.build.json

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Set environment
ENV NODE_ENV=production

# Health check: verify the bot process is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD ps aux | grep "node dist/index.js" | grep -q -v grep || exit 1

# Start the bot
CMD ["node", "dist/index.js"]
