# Multi-stage Dockerfile for Life Tracker Application
# Stage 1: Build the frontend
FROM node:24-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY eslint.config.js ./

# Install dependencies
RUN npm ci

# Copy source code
COPY index.html ./
COPY src ./src
COPY public ./public

# Build the frontend
RUN npm run build

# Stage 2: Production server
FROM node:24-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --production

# Copy server code
WORKDIR /app
COPY server/ ./server/

# Copy built frontend from builder stage
WORKDIR /app
COPY --from=frontend-builder /app/dist ./dist

# Expose port (Digital Ocean will override this)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start server
WORKDIR /app/server
CMD ["node", "index.js"]
