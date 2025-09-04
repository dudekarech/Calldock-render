@echo off
REM CallDocker Production Setup Script for Windows
REM This script sets up the production environment for CallDocker MVP

echo 🚀 Starting CallDocker Production Setup...

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

echo ✅ All dependencies are installed.

REM Create production environment file
echo 🔧 Setting up production environment...
(
echo # Application
echo NODE_ENV=production
echo PORT=8080
echo.
echo # Database ^(will be updated after database creation^)
echo DB_HOST=your-postgres-host
echo DB_PORT=25060
echo DB_NAME=calldocker_prod
echo DB_USER=calldocker_user
echo DB_PASSWORD=secure_password_here
echo.
echo # Redis ^(will be updated after redis creation^)
echo REDIS_HOST=your-redis-host
echo REDIS_PORT=25061
echo REDIS_PASSWORD=secure_redis_password
echo.
echo # Security
echo JWT_SECRET=your-jwt-secret-here
echo SESSION_SECRET=your-session-secret-here
echo.
echo # File Storage ^(will be updated after spaces creation^)
echo SPACES_KEY=your-spaces-key
echo SPACES_SECRET=your-spaces-secret
echo SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
echo SPACES_BUCKET=calldocker-files
echo.
echo # Email
echo SENDGRID_API_KEY=your-sendgrid-key
echo FROM_EMAIL=noreply@calldocker.com
echo.
echo # Payment
echo STRIPE_SECRET_KEY=your-stripe-secret
echo STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
) > .env.production

echo ✅ Production environment file created.

REM Create .do directory
if not exist ".do" mkdir .do

REM Create DigitalOcean App Platform spec
echo 🔧 Creating DigitalOcean App Platform specification...
(
echo name: calldocker-mvp
echo services:
echo - name: web
echo   source_dir: /
echo   github:
echo     repo: your-username/calldocker
echo     branch: main
echo   run_command: npm start
echo   environment_slug: node-js
echo   instance_count: 1
echo   instance_size_slug: basic-xxs
echo   http_port: 8080
echo   routes:
echo   - path: /
echo   envs:
echo   - key: NODE_ENV
echo     value: production
echo   - key: PORT
echo     value: "8080"
echo   - key: DB_HOST
echo     value: ${db.CONNECTIONSTRING}
echo   - key: REDIS_HOST
echo     value: ${redis.CONNECTIONSTRING}
echo   - key: JWT_SECRET
echo     value: ${JWT_SECRET}
echo   - key: SESSION_SECRET
echo     value: ${SESSION_SECRET}
echo databases:
echo - name: db
echo   engine: PG
echo   version: "13"
echo   size: db-s-1vcpu-1gb
echo   num_nodes: 1
echo - name: redis
echo   engine: REDIS
echo   version: "6"
echo   size: db-s-1vcpu-1gb
echo   num_nodes: 1
) > .do\app.yaml

echo ✅ App Platform specification created.

REM Create production Dockerfile
echo 🔧 Creating production Dockerfile...
(
echo FROM node:18-alpine
echo.
echo # Set working directory
echo WORKDIR /app
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
echo # Create non-root user
echo RUN addgroup -g 1001 -S nodejs
echo RUN adduser -S nodejs -u 1001
echo.
echo # Change ownership
echo RUN chown -R nodejs:nodejs /app
echo USER nodejs
echo.
echo # Expose port
echo EXPOSE 8080
echo.
echo # Health check
echo HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
echo   CMD curl -f http://localhost:8080/health ^|^| exit 1
echo.
echo # Start application
echo CMD ["npm", "start"]
) > Dockerfile

echo ✅ Production Dockerfile created.

REM Create scripts directory
if not exist "scripts" mkdir scripts

REM Create migration script
echo 🔧 Creating database migration script...
(
echo const { Pool } = require^('pg'^);
echo const fs = require^('fs'^);
echo const path = require^('path'^);
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
echo async function runMigrations^(^) {
echo     console.log^('🔄 Running database migrations...'^);
echo     
echo     try {
echo         // Read and execute migration files
echo         const migrationsDir = path.join^(__dirname, '../migrations'^);
echo         const migrationFiles = fs.readdirSync^(migrationsDir^)
echo             .filter^(file =^> file.endsWith^('.sql'^)^)
echo             .sort^(^);
echo         
echo         for ^(const file of migrationFiles^) {
echo             console.log^(`📄 Running migration: ${file}`^);
echo             const sql = fs.readFileSync^(path.join^(migrationsDir, file^), 'utf8'^);
echo             await pool.query^(sql^);
echo         }
echo         
echo         console.log^('✅ All migrations completed successfully!'^);
echo     } catch ^(error^) {
echo         console.error^('❌ Migration failed:', error^);
echo         process.exit^(1^);
echo     } finally {
echo         await pool.end^(^);
echo     }
echo }
echo.
echo runMigrations^(^);
) > scripts\migrate.js

echo ✅ Migration script created.

REM Create seed script
echo 🔧 Creating database seed script...
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
echo async function seedDatabase^(^) {
echo     console.log^('🌱 Seeding database...'^);
echo     
echo     try {
echo         // Create admin user
echo         const adminEmail = 'admin@calldocker.com';
echo         const adminPassword = 'admin123';
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
echo             console.log^('✅ Admin user created successfully!'^);
echo             console.log^(`📧 Email: ${adminEmail}`^);
echo             console.log^(`🔑 Password: ${adminPassword}`^);
echo         } else {
echo             console.log^('ℹ️  Admin user already exists.'^);
echo         }
echo         
echo         // Create default company
echo         const defaultCompany = await pool.query^(`
echo             INSERT INTO companies ^(id, name, domain, status, created_at, updated_at^)
echo             VALUES ^($1, $2, $3, $4, NOW^(^), NOW^(^)^)
echo             ON CONFLICT ^(id^) DO NOTHING
echo             RETURNING *
echo         `, [
echo             '00000000-0000-0000-0000-000000000000',
echo             'CallDocker Global',
echo             'calldocker.com',
echo             'active'
echo         ]^);
echo         
echo         if ^(defaultCompany.rows.length ^> 0^) {
echo             console.log^('✅ Default company created successfully!'^);
echo         } else {
echo             console.log^('ℹ️  Default company already exists.'^);
echo         }
echo         
echo         console.log^('✅ Database seeding completed successfully!'^);
echo     } catch ^(error^) {
echo         console.error^('❌ Seeding failed:', error^);
echo         process.exit^(1^);
echo     } finally {
echo         await pool.end^(^);
echo     }
echo }
echo.
echo seedDatabase^(^);
) > scripts\seed.js

echo ✅ Seed script created.

REM Create deployment script
echo 🔧 Creating deployment script...
(
echo @echo off
echo REM CallDocker Deployment Script for Windows
echo set /p continue="Continue with deployment? ^(y/n^): "
echo if /i "%continue%" neq "y" exit /b 0
echo.
echo echo 🚀 Deploying CallDocker to DigitalOcean...
echo.
echo REM Check if doctl is authenticated
echo doctl account get ^>nul 2^>^&1
echo if %%errorlevel%% neq 0 ^(
echo     echo ❌ Please authenticate with DigitalOcean first:
echo     echo    doctl auth init
echo     pause
echo     exit /b 1
echo ^)
echo.
echo REM Deploy the application
echo echo 📦 Deploying application...
echo doctl apps create --spec .do\app.yaml
echo.
echo echo ✅ Deployment initiated! Check the DigitalOcean dashboard for progress.
echo echo 🔗 Your app will be available at: https://your-app-name.ondigitalocean.app
echo pause
) > deploy.bat

echo ✅ Deployment script created.

echo.
echo 🎉 Production setup completed successfully!
echo.
echo 📋 Next steps:
echo 1. Update .env.production with your actual values
echo 2. Update .do\app.yaml with your GitHub repository
echo 3. Install doctl CLI: https://docs.digitalocean.com/reference/doctl/how-to/install/
echo 4. Authenticate with DigitalOcean: doctl auth init
echo 5. Deploy: deploy.bat
echo.
echo 📚 For detailed instructions, see DEPLOYMENT-STRATEGY.md
echo.
pause
