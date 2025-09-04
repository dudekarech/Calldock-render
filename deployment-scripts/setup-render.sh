#!/bin/bash

# CallDocker Render Setup Script
# This script prepares your CallDocker application for Render deployment

set -e  # Exit on any error

echo "🚀 Starting CallDocker Render Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Render will build from source."
    fi
    
    print_success "Dependencies check completed."
}

# Create Render-optimized Dockerfile
create_render_dockerfile() {
    print_status "Creating Render-optimized Dockerfile..."
    
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/ivr-content

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (Render uses PORT environment variable)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:10000/health || exit 1

# Start application
CMD ["npm", "start"]
EOF
    
    print_success "Render Dockerfile created."
}

# Create render.yaml configuration
create_render_yaml() {
    print_status "Creating render.yaml configuration..."
    
    cat > render.yaml << 'EOF'
services:
  - type: web
    name: calldocker-demo
    env: docker
    dockerfilePath: ./Dockerfile
    dockerContext: .
    plan: free
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DB_HOST
        fromDatabase:
          name: calldocker-db
          property: host
      - key: DB_PORT
        fromDatabase:
          name: calldocker-db
          property: port
      - key: DB_NAME
        fromDatabase:
          name: calldocker-db
          property: database
      - key: DB_USER
        fromDatabase:
          name: calldocker-db
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: calldocker-db
          property: password
      - key: JWT_SECRET
        generateValue: true
      - key: SESSION_SECRET
        generateValue: true

databases:
  - name: calldocker-db
    plan: free
    databaseName: calldocker
    user: calldocker_user
EOF
    
    print_success "render.yaml configuration created."
}

# Update server.js for Render compatibility
update_server_for_render() {
    print_status "Updating server.js for Render compatibility..."
    
    # Check if server.js exists
    if [ ! -f "server.js" ]; then
        print_error "server.js not found. Please run this script from the project root."
        exit 1
    fi
    
    # Add Render-specific configurations if not already present
    if ! grep -q "Render-specific" server.js; then
        cat >> server.js << 'EOF'

// Render-specific configurations
const PORT = process.env.PORT || 10000;

// Handle Render's proxy headers
app.use((req, res, next) => {
  // Redirect HTTP to HTTPS in production
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Health check endpoint for Render
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    render: true,
    version: process.env.npm_package_version || '1.0.0'
  };

  // Database check
  try {
    await databaseManager.query('SELECT 1');
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Start server with Render compatibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Render deployment ready`);
});
EOF
        print_success "Server.js updated for Render compatibility."
    else
        print_warning "Server.js already has Render configurations."
    fi
}

# Update database configuration for Render
update_database_config() {
    print_status "Updating database configuration for Render..."
    
    if [ -f "database/config.js" ]; then
        # Backup original config
        cp database/config.js database/config.js.backup
        
        # Update config for Render
        cat > database/config.js << 'EOF'
const { Pool } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'calldocker',
  user: process.env.DB_USER || 'calldocker_user',
  password: process.env.DB_PASSWORD || 'calldocker_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Render free tier limit
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class DatabaseManager {
  constructor() {
    this.pool = new Pool(config);
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      if (duration > 1000) {
        console.log(`🐌 Slow query (${duration}ms): ${text.substring(0, 50)}...`);
      }
      return res;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
  }

  async close() {
    await this.pool.end();
    console.log('🔌 Database connection closed');
  }
}

module.exports = new DatabaseManager();
EOF
        print_success "Database configuration updated for Render."
    else
        print_warning "database/config.js not found. Please ensure database configuration is correct."
    fi
}

# Create demo data seeding script
create_demo_seed_script() {
    print_status "Creating demo data seeding script..."
    
    mkdir -p scripts
    
    cat > scripts/seed-demo.js << 'EOF'
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

async function seedDemoData() {
    console.log('🌱 Seeding demo data for Render...');
    
    try {
        // Create demo admin user
        const adminEmail = 'demo@calldocker.com';
        const adminPassword = 'demo123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const adminUser = await pool.query(`
            INSERT INTO users (id, email, password_hash, role, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING *
        `, [
            '00000000-0000-0000-0000-000000000000',
            adminEmail,
            hashedPassword,
            'superadmin',
            'active'
        ]);
        
        if (adminUser.rows.length > 0) {
            console.log('✅ Demo admin user created successfully!');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
        } else {
            console.log('ℹ️  Demo admin user already exists.');
        }
        
        // Create demo company
        const demoCompany = await pool.query(`
            INSERT INTO companies (id, name, domain, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING *
        `, [
            '00000000-0000-0000-0000-000000000000',
            'CallDocker Demo',
            'calldocker-demo.onrender.com',
            'active'
        ]);
        
        if (demoCompany.rows.length > 0) {
            console.log('✅ Demo company created successfully!');
        } else {
            console.log('ℹ️  Demo company already exists.');
        }
        
        // Create sample IVR flow
        const sampleFlow = await pool.query(`
            INSERT INTO ivr_flows (id, company_id, name, description, status, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING *
        `, [
            '11111111-1111-1111-1111-111111111111',
            '00000000-0000-0000-0000-000000000000',
            'Demo IVR Flow',
            'Sample IVR flow for demonstration',
            'active',
            true
        ]);
        
        if (sampleFlow.rows.length > 0) {
            console.log('✅ Sample IVR flow created successfully!');
        } else {
            console.log('ℹ️  Sample IVR flow already exists.');
        }
        
        console.log('✅ Demo data seeding completed successfully!');
        console.log('🎉 Your CallDocker demo is ready!');
        
    } catch (error) {
        console.error('❌ Demo data seeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run seeding if this script is executed directly
if (require.main === module) {
    seedDemoData();
}

module.exports = { seedDemoData };
EOF
    
    print_success "Demo data seeding script created."
}

# Update package.json for Render
update_package_json() {
    print_status "Updating package.json for Render..."
    
    # Add Render-specific scripts if they don't exist
    if ! grep -q '"seed:demo"' package.json; then
        # Use jq to add scripts if available
        if command -v jq &> /dev/null; then
            jq '.scripts += {
                "start:render": "NODE_ENV=production node server.js",
                "seed:demo": "NODE_ENV=production node scripts/seed-demo.js"
            }' package.json > package.json.tmp && mv package.json.tmp package.json
        else
            print_warning "jq not installed. Please manually add these scripts to package.json:"
            echo '  "start:render": "NODE_ENV=production node server.js",'
            echo '  "seed:demo": "NODE_ENV=production node scripts/seed-demo.js"'
        fi
    fi
    
    print_success "Package.json updated for Render."
}

# Create .dockerignore file
create_dockerignore() {
    print_status "Creating .dockerignore file..."
    
    cat > .dockerignore << 'EOF'
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development
.env.test
.env.production
.nyc_output
coverage
.DS_Store
*.log
logs
*.pid
*.seed
*.pid.lock
.npm
.eslintcache
.node_repl_history
*.tgz
.yarn-integrity
.env.test.local
.env.production.local
deployment-scripts
*.md
!README.md
EOF
    
    print_success ".dockerignore file created."
}

# Create Render deployment guide
create_deployment_guide() {
    print_status "Creating Render deployment guide..."
    
    cat > RENDER-DEPLOYMENT-STEPS.md << 'EOF'
# 🚀 CallDocker Render Deployment Steps

## Quick Deployment Guide

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub
- Connect your repository

### 2. Create Database
- Click "New +" → "PostgreSQL"
- Choose "Free" plan
- Name: `calldocker-db`
- Save connection details

### 3. Create Web Service
- Click "New +" → "Web Service"
- Connect GitHub repository
- Choose "Docker" environment
- Configure environment variables (see below)

### 4. Environment Variables
```
NODE_ENV=production
PORT=10000
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=calldocker
DB_USER=calldocker_user
DB_PASSWORD=your-postgres-password
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
```

### 5. Deploy
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Your app will be at: `https://calldocker-demo.onrender.com`

### 6. Seed Demo Data
- After deployment, run: `npm run seed:demo`
- Or visit: `https://calldocker-demo.onrender.com/api/seed-demo`

### 7. Test Demo
- Admin Login: `demo@calldocker.com` / `demo123`
- Health Check: `https://calldocker-demo.onrender.com/health`

## Demo Features Available
- ✅ Admin Dashboard
- ✅ IVR Flow Builder
- ✅ Call Widget
- ✅ User Management
- ✅ Company Management
- ✅ Analytics Dashboard

## Keep Service Awake
Use UptimeRobot to ping your app every 14 minutes:
- URL: `https://calldocker-demo.onrender.com/health`
- Interval: 14 minutes

## Troubleshooting
- Check Render logs for errors
- Verify environment variables
- Ensure database is connected
- Check health endpoint

## Support
- Render Documentation: https://render.com/docs
- CallDocker Issues: Create GitHub issue
EOF
    
    print_success "Render deployment guide created."
}

# Main setup function
main() {
    echo "🎯 CallDocker Render Setup"
    echo "=========================="
    
    check_dependencies
    create_render_dockerfile
    create_render_yaml
    update_server_for_render
    update_database_config
    create_demo_seed_script
    update_package_json
    create_dockerignore
    create_deployment_guide
    
    echo ""
    echo "🎉 Render setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Push your code to GitHub"
    echo "2. Create Render account at render.com"
    echo "3. Create PostgreSQL database in Render"
    echo "4. Create Web Service in Render"
    echo "5. Configure environment variables"
    echo "6. Deploy and test!"
    echo ""
    echo "📚 For detailed instructions, see RENDER-DEPLOYMENT-STEPS.md"
    echo "🔗 Your demo will be available at: https://calldocker-demo.onrender.com"
}

# Run main function
main "$@"
