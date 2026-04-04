# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib ./lib
COPY artifacts/api-server ./artifacts/api-server

# Install dependencies for the entire workspace
RUN pnpm install --frozen-lockfile

# Build api-server
WORKDIR /app/artifacts/api-server
RUN pnpm run build

# Runtime stage
FROM node:24-alpine

WORKDIR /app

# Install pnpm for runtime (needed for potential runtime dependencies)
RUN npm install -g pnpm

# Copy only necessary files from builder
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/artifacts/api-server/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies only
RUN pnpm install --prod --no-frozen-lockfile

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000), (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
