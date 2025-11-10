# Migrate and Seed Script for Windows PowerShell

Write-Host "🔄 Running Prisma migrations..." -ForegroundColor Cyan
npm run prisma:migrate

Write-Host "🌱 Seeding database..." -ForegroundColor Cyan
npm run prisma:seed

Write-Host "✅ Database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Test credentials:" -ForegroundColor Yellow
Write-Host "  Admin:  admin@college.edu / password123"
Write-Host "  Leader: rajesh@college.edu / password123"
Write-Host "  Member: amit.patel@college.edu / password123"
