# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
# Using --legacy-peer-deps to avoid potential npm issues
RUN npm install --legacy-peer-deps || npm install --force

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript using locally installed tsc
RUN ./node_modules/.bin/tsc || npx --yes typescript@5.3.3 -p .

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps || npm install --omit=dev --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Set environment
ENV NODE_ENV=production

# Start the bot
CMD ["node", "dist/index.js"]
