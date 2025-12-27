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
FROM node:20-bookworm-slim

WORKDIR /app

# Install Chrome and dependencies for WebdriverIO
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Create a non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Set environment variables
# ENV_NAME can be 'prod' or 'dev' (default to 'dev' for development)
ARG ENV_NAME=dev
ENV ENV_NAME=${ENV_NAME}

# Health check: verify the bot process is running
# Using Alpine-compatible ps command (BusyBox ps)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD ps | grep "node dist/index.js" | grep -q -v grep || exit 1

# Start the bot
CMD ["node", "dist/index.js"]
