FROM node:18-alpine

WORKDIR /app

# Install build tools for native dependencies and OpenSSL
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy prisma files
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY backend/ ./

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 6173

# Start the application with ts-node-dev (skip migration for now)
CMD ["npx", "ts-node-dev", "--transpile-only", "--respawn", "--ignore-watch", "node_modules", "src/index.ts"]