# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ ./

# Remove ES module postcss config and use CommonJS version (if needed)
RUN if [ -f postcss.config.cjs ]; then rm -f postcss.config.js && mv postcss.config.cjs postcss.config.js; fi

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing and backend proxy with optimized timeouts
RUN echo 'server { \
    listen 5173; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    # Global timeout settings \
    proxy_connect_timeout 600s; \
    proxy_send_timeout 600s; \
    proxy_read_timeout 600s; \
    send_timeout 600s; \
    keepalive_timeout 600s; \
    client_body_timeout 600s; \
    client_header_timeout 600s; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api { \
        proxy_pass http://backend:6173; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
        \
        # Disable buffering for SSE \
        proxy_buffering off; \
        proxy_cache off; \
        \
        # Extended timeouts for long-running operations and SSE \
        proxy_read_timeout 86400s; \
        proxy_send_timeout 86400s; \
        proxy_connect_timeout 86400s; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]