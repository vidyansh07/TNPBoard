#!/bin/bash

# Migrate and seed script for Unix-like systems
# For Windows, run commands directly in PowerShell

echo "🔄 Running Prisma migrations..."
npm run prisma:migrate

echo "🌱 Seeding database..."
npm run prisma:seed

echo "✅ Database setup complete!"
echo ""
echo "Test credentials:"
echo "  Admin:  admin@college.edu / password123"
echo "  Leader: rajesh@college.edu / password123"
echo "  Member: amit.patel@college.edu / password123"
