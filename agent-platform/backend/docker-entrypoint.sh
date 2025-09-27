#!/bin/sh
set -e

echo "Starting application initialization..."

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
npx prisma migrate deploy || {
    echo "Migrate deploy failed, using db push for initial setup..."
    npx prisma db push
}

# Always check if admin user exists and create if not
echo "Checking for admin user..."
npx prisma db seed || echo "Seed may have already been applied"

echo "Database initialization complete!"

# Start the application
echo "Starting application..."
exec npx ts-node-dev --transpile-only --respawn --ignore-watch node_modules src/index.ts