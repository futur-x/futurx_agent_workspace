FROM node:18-alpine

WORKDIR /app

# Install build tools for native dependencies and OpenSSL
RUN apk add --no-cache python3 make g++ openssl openssl-dev

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy all backend files
COPY backend/ ./

# Make entrypoint script executable
RUN chmod +x docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p uploads data

# Expose port
EXPOSE 6173

# Use the entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]