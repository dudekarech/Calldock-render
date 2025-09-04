@echo off
REM CallDocker Render Setup Script for Windows
REM This script prepares your CallDocker application for Render deployment

echo 🚀 Starting CallDocker Render Setup...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Dependencies check completed.

REM Create Render-optimized Dockerfile
echo 🔧 Creating Render-optimized Dockerfile...
(
echo FROM node:18-alpine
echo.
echo # Set working directory
echo WORKDIR /app
echo.
echo # Install system dependencies
echo RUN apk add --no-cache curl
echo.
echo # Copy package files
echo COPY package*.json ./
echo.
echo # Install dependencies
echo RUN npm ci --only=production ^&^& npm cache clean --force
echo.
echo # Copy source code
echo COPY . .
echo.
echo # Create uploads directory
echo RUN mkdir -p uploads/ivr-content
echo.
echo # Create non-root user
echo RUN addgroup -g 1001 -S nodejs ^&^& \
echo     adduser -S nodejs -u 1001
echo.
echo # Change ownership
echo RUN chown -R nodejs:nodejs /app
echo USER nodejs
echo.
echo # Expose port ^(Render uses PORT environment variable^)
echo EXPOSE 10000
echo.
echo # Health check
echo HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
echo   CMD curl -f http://localhost:10000/health ^|^| exit 1
echo.
echo # Start application
echo CMD ["npm", "start"]
) > Dockerfile

echo ✅ Render Dockerfile created.

REM Create render.yaml configuration
echo 🔧 Creating render.yaml configuration...
(
echo services:
echo   - type: web
echo     name: calldocker-demo
echo     env: docker
echo     dockerfilePath: ./Dockerfile
echo     dockerContext: .
echo     plan: free
echo     envVars:
echo       - key: NODE_ENV
echo         value: production
echo       - key: PORT
echo         value: 10000
echo       - key: DB_HOST
echo         fromDatabase:
echo           name: calldocker-db
echo           property: host
echo       - key: DB_PORT
echo         fromDatabase:
echo           name: calldocker-db
echo           property: port
echo       - key: DB_NAME
echo         fromDatabase:
echo           name: calldocker-db
echo           property: database
echo       - key: DB_USER
echo         fromDatabase:
echo           name: calldocker-db
echo           property: user
echo       - key: DB_PASSWORD
echo         fromDatabase:
echo           name: calldocker-db
echo           property: password
echo       - key: JWT_SECRET
echo         generateValue: true
echo       - key: SESSION_SECRET
echo         generateValue: true
echo.
echo databases:
echo   - name: calldocker-db
echo     plan: free
echo     databaseName: calldocker
echo     user: calldocker_user
) > render.yaml

echo ✅ render.yaml configuration created.

REM Create scripts directory
if not exist "scripts" mkdir scripts

REM Create demo data seeding script
echo 🔧 Creating demo data seeding script...
(
echo const { Pool } = require^('pg'^);
echo const bcrypt = require^('bcrypt'^);
echo.
echo // Database configuration
echo const dbConfig = {
echo     host: process.env.DB_HOST,
echo     port: process.env.DB_PORT,
echo     database: process.env.DB_NAME,
echo     user: process.env.DB_USER,
echo     password: process.env.DB_PASSWORD,
echo     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
echo };
echo.
echo const pool = new Pool^(dbConfig^);
echo.
echo async function seedDemoData^(^) {
echo     console.log^('🌱 Seeding demo data for Render...'^);
echo     
echo     try {
echo         // Create demo admin user
echo         const adminEmail = 'demo@calldocker.com';
echo         const adminPassword = 'demo123';
echo         const hashedPassword = await bcrypt.hash^(adminPassword, 10^);
echo         
echo         const adminUser = await pool.query^(`
echo             INSERT INTO users ^(id, email, password_hash, role, status, created_at, updated_at^)
echo             VALUES ^($1, $2, $3, $4, $5, NOW^(^), NOW^(^)^)
echo             ON CONFLICT ^(email^) DO NOTHING
echo             RETURNING *
echo         `, [
echo             '00000000-0000-0000-0000-000000000000',
echo             adminEmail,
echo             hashedPassword,
echo             'superadmin',
echo             'active'
echo         ]^);
echo         
echo         if ^(adminUser.rows.length ^> 0^) {
echo             console.log^('✅ Demo admin user created successfully!'^);
echo             console.log^(`📧 Email: ${adminEmail}`^);
echo             console.log^(`🔑 Password: ${adminPassword}`^);
echo         } else {
echo             console.log^('ℹ️  Demo admin user already exists.'^);
echo         }
echo         
echo         // Create demo company
echo         const demoCompany = await pool.query^(`
echo             INSERT INTO companies ^(id, name, domain, status, created_at, updated_at^)
echo             VALUES ^($1, $2, $3, $4, NOW^(^), NOW^(^)^)
echo             ON CONFLICT ^(id^) DO NOTHING
echo             RETURNING *
echo         `, [
echo             '00000000-0000-0000-0000-000000000000',
echo             'CallDocker Demo',
echo             'calldocker-demo.onrender.com',
echo             'active'
echo         ]^);
echo         
echo         if ^(demoCompany.rows.length ^> 0^) {
echo             console.log^('✅ Demo company created successfully!'^);
echo         } else {
echo             console.log^('ℹ️  Demo company already exists.'^);
echo         }
echo         
echo         console.log^('✅ Demo data seeding completed successfully!'^);
echo         console.log^('🎉 Your CallDocker demo is ready!'^);
echo         
echo     } catch ^(error^) {
echo         console.error^('❌ Demo data seeding failed:', error^);
echo         process.exit^(1^);
echo     } finally {
echo         await pool.end^(^);
echo     }
echo }
echo.
echo // Run seeding if this script is executed directly
echo if ^(require.main === module^) {
echo     seedDemoData^(^);
echo }
echo.
echo module.exports = { seedDemoData };
) > scripts\seed-demo.js

echo ✅ Demo data seeding script created.

REM Create .dockerignore file
echo 🔧 Creating .dockerignore file...
(
echo node_modules
echo npm-debug.log
echo .git
echo .gitignore
echo README.md
echo .env
echo .env.local
echo .env.development
echo .env.test
echo .env.production
echo .nyc_output
echo coverage
echo .DS_Store
echo *.log
echo logs
echo *.pid
echo *.seed
echo *.pid.lock
echo .npm
echo .eslintcache
echo .node_repl_history
echo *.tgz
echo .yarn-integrity
echo .env.test.local
echo .env.production.local
echo deployment-scripts
echo *.md
echo !README.md
) > .dockerignore

echo ✅ .dockerignore file created.

REM Create Render deployment guide
echo 🔧 Creating Render deployment guide...
(
echo # 🚀 CallDocker Render Deployment Steps
echo.
echo ## Quick Deployment Guide
echo.
echo ### 1. Create Render Account
echo - Go to [render.com](https://render.com)
echo - Sign up with GitHub
echo - Connect your repository
echo.
echo ### 2. Create Database
echo - Click "New +" → "PostgreSQL"
echo - Choose "Free" plan
echo - Name: `calldocker-db`
echo - Save connection details
echo.
echo ### 3. Create Web Service
echo - Click "New +" → "Web Service"
echo - Connect GitHub repository
echo - Choose "Docker" environment
echo - Configure environment variables ^(see below^)
echo.
echo ### 4. Environment Variables
echo ```
echo NODE_ENV=production
echo PORT=10000
echo DB_HOST=your-postgres-host
echo DB_PORT=5432
echo DB_NAME=calldocker
echo DB_USER=calldocker_user
echo DB_PASSWORD=your-postgres-password
echo JWT_SECRET=your-jwt-secret
echo SESSION_SECRET=your-session-secret
echo ```
echo.
echo ### 5. Deploy
echo - Click "Create Web Service"
echo - Wait for deployment ^(5-10 minutes^)
echo - Your app will be at: `https://calldocker-demo.onrender.com`
echo.
echo ### 6. Seed Demo Data
echo - After deployment, run: `npm run seed:demo`
echo - Or visit: `https://calldocker-demo.onrender.com/api/seed-demo`
echo.
echo ### 7. Test Demo
echo - Admin Login: `demo@calldocker.com` / `demo123`
echo - Health Check: `https://calldocker-demo.onrender.com/health`
echo.
echo ## Demo Features Available
echo - ✅ Admin Dashboard
echo - ✅ IVR Flow Builder
echo - ✅ Call Widget
echo - ✅ User Management
echo - ✅ Company Management
echo - ✅ Analytics Dashboard
echo.
echo ## Keep Service Awake
echo Use UptimeRobot to ping your app every 14 minutes:
echo - URL: `https://calldocker-demo.onrender.com/health`
echo - Interval: 14 minutes
echo.
echo ## Troubleshooting
echo - Check Render logs for errors
echo - Verify environment variables
echo - Ensure database is connected
echo - Check health endpoint
echo.
echo ## Support
echo - Render Documentation: https://render.com/docs
echo - CallDocker Issues: Create GitHub issue
) > RENDER-DEPLOYMENT-STEPS.md

echo ✅ Render deployment guide created.

echo.
echo 🎉 Render setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Push your code to GitHub
echo 2. Create Render account at render.com
echo 3. Create PostgreSQL database in Render
echo 4. Create Web Service in Render
echo 5. Configure environment variables
echo 6. Deploy and test!
echo.
echo 📚 For detailed instructions, see RENDER-DEPLOYMENT-STEPS.md
echo 🔗 Your demo will be available at: https://calldocker-demo.onrender.com
echo.
pause
