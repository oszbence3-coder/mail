# Magyar Osu Mapek Email - Production Deployment Check (Windows)
# Run with: powershell -ExecutionPolicy Bypass -File deploy-check.ps1

Write-Host "🚀 Magyar Osu Mapek Email - Production Deployment Check" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path .env)) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "📝 Creating .env from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✅ .env file created. Please edit it with your production values!" -ForegroundColor Green
    Write-Host ""
    Write-Host "REQUIRED STEPS:" -ForegroundColor Yellow
    Write-Host "1. Generate SESSION_SECRET:" -ForegroundColor Yellow
    Write-Host "   node -e `"console.log(require('crypto').randomBytes(64).toString('hex'))`"" -ForegroundColor White
    Write-Host "2. Edit .env and add the generated SECRET" -ForegroundColor Yellow
    Write-Host "3. Set NODE_ENV=production" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green

# Check if SESSION_SECRET is set to default
$envContent = Get-Content .env -Raw
if ($envContent -match "your-random-secret-here") {
    Write-Host "⚠️  WARNING: SESSION_SECRET still contains default value!" -ForegroundColor Yellow
    Write-Host "Generate a strong secret with:" -ForegroundColor Yellow
    Write-Host "node -e `"console.log(require('crypto').randomBytes(64).toString('hex'))`"" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ SESSION_SECRET appears to be customized" -ForegroundColor Green

# Check if NODE_ENV is production
if ($envContent -match "NODE_ENV=production") {
    Write-Host "✅ NODE_ENV set to production" -ForegroundColor Green
} else {
    Write-Host "⚠️  WARNING: NODE_ENV not set to production" -ForegroundColor Yellow
}

# Check if node_modules exists
if (-Not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green

# Run npm audit
Write-Host ""
Write-Host "🔍 Running security audit..." -ForegroundColor Cyan
npm audit

Write-Host ""
Write-Host "📊 Audit complete" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Pre-deployment checks complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 DEPLOYMENT CHECKLIST:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "[ ] HTTPS/SSL configured (REQUIRED!)"
Write-Host "[ ] SESSION_SECRET changed from default"
Write-Host "[ ] NODE_ENV=production in .env"
Write-Host "[ ] Gmail App Passwords generated (not regular passwords)"
Write-Host "[ ] DOMAIN_MAPPING updated in server.js"
Write-Host "[ ] Tested login functionality"
Write-Host "[ ] Tested email send/receive"
Write-Host "[ ] Tested mobile view"
Write-Host ""
Write-Host "🚀 Ready to deploy!" -ForegroundColor Green
Write-Host ""
Write-Host "Recommended platforms:" -ForegroundColor Yellow
Write-Host "- Render.com (easiest, free SSL)"
Write-Host "- Railway.app (simple, free tier)"
Write-Host "- VPS with Nginx (full control)"
Write-Host ""
Write-Host "Start server with: npm start" -ForegroundColor White
Write-Host "Or with PM2: pm2 start server.js --name magyar-email" -ForegroundColor White
Write-Host ""
