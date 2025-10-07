#!/bin/bash

# Magyar Osu Mapek Email - Production Deployment Script
# Run this before deploying to production

echo "🚀 Magyar Osu Mapek Email - Production Deployment Check"
echo "======================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ ERROR: .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your production values!"
    echo ""
    echo "REQUIRED STEPS:"
    echo "1. Generate SESSION_SECRET: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    echo "2. Edit .env and add the generated SECRET"
    echo "3. Set NODE_ENV=production"
    echo ""
    exit 1
fi

echo "✅ .env file found"

# Check if SESSION_SECRET is set
if grep -q "your-random-secret-here" .env; then
    echo "⚠️  WARNING: SESSION_SECRET still contains default value!"
    echo "Generate a strong secret with:"
    echo "node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    echo ""
    exit 1
fi

echo "✅ SESSION_SECRET appears to be customized"

# Check if NODE_ENV is production
if grep -q "NODE_ENV=production" .env; then
    echo "✅ NODE_ENV set to production"
else
    echo "⚠️  WARNING: NODE_ENV not set to production"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies installed"

# Run npm audit
echo ""
echo "🔍 Running security audit..."
npm audit

echo ""
echo "📊 Audit complete"

# Check for critical vulnerabilities
CRITICAL=$(npm audit --json | grep -c "critical")
if [ "$CRITICAL" -gt "0" ]; then
    echo "⚠️  WARNING: Critical vulnerabilities found!"
    echo "Run: npm audit fix"
    echo ""
fi

echo ""
echo "✅ Pre-deployment checks complete!"
echo ""
echo "📝 DEPLOYMENT CHECKLIST:"
echo "========================"
echo "[ ] HTTPS/SSL configured (REQUIRED!)"
echo "[ ] SESSION_SECRET changed from default"
echo "[ ] NODE_ENV=production in .env"
echo "[ ] Gmail App Passwords generated (not regular passwords)"
echo "[ ] DOMAIN_MAPPING updated in server.js"
echo "[ ] Tested login functionality"
echo "[ ] Tested email send/receive"
echo "[ ] Tested mobile view"
echo ""
echo "🚀 Ready to deploy!"
echo ""
echo "Recommended platforms:"
echo "- Render.com (easiest, free SSL)"
echo "- Railway.app (simple, free tier)"
echo "- VPS with Nginx (full control)"
echo ""
echo "Start server with: npm start"
echo "Or with PM2: pm2 start server.js --name magyar-email"
echo ""
