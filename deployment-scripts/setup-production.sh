#!/bin/bash

# CallDocker Production Setup Script
# This script sets up the production environment for CallDocker MVP

set -e  # Exit on any error

echo "🚀 Starting CallDocker Production Setup..."

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
    
    if ! command -v doctl &> /dev/null; then
        print_warning "doctl CLI is not installed. Installing..."
        # Install doctl
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install doctl
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            wget https://github.com/digitalocean/doctl/releases/download/v1.94.0/doctl-1.94.0-linux-amd64.tar.gz
            tar xf doctl-1.94.0-linux-amd64.tar.gz
            sudo mv doctl /usr/local/bin
        else
            print_error "Unsupported OS. Please install doctl manually."
            exit 1
        fi
    fi
    
    print_success "All dependencies are installed."
}

# Setup environment variables
setup_environment() {
    print_status "Setting up production environment..."
    
    # Create production environment file
    cat > .env.production << EOF
# Application
NODE_ENV=production
PORT=8080

# Database (will be updated after database creation)
DB_HOST=your-postgres-host
DB_PORT=25060
DB_NAME=calldocker_prod
DB_USER=calldocker_user
DB_PASSWORD=secure_password_here

# Redis (will be updated after redis creation)
REDIS_HOST=your-redis-host
REDIS_PORT=25061
REDIS_PASSWORD=secure_redis_password

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# File Storage (will be updated after spaces creation)
SPACES_KEY=your-spaces-key
SPACES_SECRET=your-spaces-secret
SPACES_ENDPOINT=nyc3.digitaloceanspaces.com
SPACES_BUCKET=calldocker-files

# Email
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@calldocker.com

# Payment
STRIPE_SECRET_KEY=your-stripe-secret
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
EOF
    
    print_success "Production environment file created."
}

# Create DigitalOcean App Platform spec
create_app_spec() {
    print_status "Creating DigitalOcean App Platform specification..."
    
    mkdir -p .do
    
    cat > .do/app.yaml << EOF
name: calldocker-mvp
services:
- name: web
  source_dir: /
  github:
    repo: your-username/calldocker
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 8080
  routes:
  - path: /
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "8080"
  - key: DB_HOST
    value: \${db.CONNECTIONSTRING}
  - key: REDIS_HOST
    value: \${redis.CONNECTIONSTRING}
  - key: JWT_SECRET
    value: \${JWT_SECRET}
  - key: SESSION_SECRET
    value: \${SESSION_SECRET}
databases:
- name: db
  engine: PG
  version: "13"
  size: db-s-1vcpu-1gb
  num_nodes: 1
- name: redis
  engine: REDIS
  version: "6"
  size: db-s-1vcpu-1gb
  num_nodes: 1
EOF
    
    print_success "App Platform specification created."
}

# Create production Dockerfile
create_dockerfile() {
    print_status "Creating production Dockerfile..."
    
    cat > Dockerfile << EOF
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["npm", "start"]
EOF
    
    print_success "Production Dockerfile created."
}

# Create production package.json scripts
update_package_json() {
    print_status "Updating package.json for production..."
    
    # Add production scripts if they don't exist
    if ! grep -q '"start:prod"' package.json; then
        # Use jq to add production scripts
        if command -v jq &> /dev/null; then
            jq '.scripts += {
                "start:prod": "NODE_ENV=production node server.js",
                "migrate:prod": "NODE_ENV=production node scripts/migrate.js",
                "seed:prod": "NODE_ENV=production node scripts/seed.js"
            }' package.json > package.json.tmp && mv package.json.tmp package.json
        else
            print_warning "jq not installed. Please manually add production scripts to package.json:"
            echo '  "start:prod": "NODE_ENV=production node server.js",'
            echo '  "migrate:prod": "NODE_ENV=production node scripts/migrate.js",'
            echo '  "seed:prod": "NODE_ENV=production node scripts/seed.js"'
        fi
    fi
    
    print_success "Package.json updated for production."
}

# Create migration script
create_migration_script() {
    print_status "Creating database migration script..."
    
    mkdir -p scripts
    
    cat > scripts/migrate.js << 'EOF'
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function runMigrations() {
    console.log('🔄 Running database migrations...');
    
    try {
        // Read and execute migration files
        const migrationsDir = path.join(__dirname, '../migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();
        
        for (const file of migrationFiles) {
            console.log(`📄 Running migration: ${file}`);
            const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
            await pool.query(sql);
        }
        
        console.log('✅ All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigrations();
EOF
    
    print_success "Migration script created."
}

# Create seed script
create_seed_script() {
    print_status "Creating database seed script..."
    
    cat > scripts/seed.js << 'EOF'
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

async function seedDatabase() {
    console.log('🌱 Seeding database...');
    
    try {
        // Create admin user
        const adminEmail = 'admin@calldocker.com';
        const adminPassword = 'admin123';
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
            console.log('✅ Admin user created successfully!');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${adminPassword}`);
        } else {
            console.log('ℹ️  Admin user already exists.');
        }
        
        // Create default company
        const defaultCompany = await pool.query(`
            INSERT INTO companies (id, name, domain, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING
            RETURNING *
        `, [
            '00000000-0000-0000-0000-000000000000',
            'CallDocker Global',
            'calldocker.com',
            'active'
        ]);
        
        if (defaultCompany.rows.length > 0) {
            console.log('✅ Default company created successfully!');
        } else {
            console.log('ℹ️  Default company already exists.');
        }
        
        console.log('✅ Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seedDatabase();
EOF
    
    print_success "Seed script created."
}

# Create health check endpoint
add_health_check() {
    print_status "Adding health check endpoint..."
    
    # Check if health check already exists
    if grep -q "app.get('/health'" server.js; then
        print_warning "Health check endpoint already exists."
        return
    fi
    
    # Add health check endpoint
    cat >> server.js << 'EOF'

// Health check endpoint
app.get('/health', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        checks: {}
    };

    // Database check
    try {
        await databaseManager.query('SELECT 1');
        health.checks.database = 'healthy';
    } catch (error) {
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
    }

    // Redis check (if available)
    try {
        if (redisClient && redisClient.ping) {
            await redisClient.ping();
            health.checks.redis = 'healthy';
        } else {
            health.checks.redis = 'not_configured';
        }
    } catch (error) {
        health.checks.redis = 'unhealthy';
        health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
});
EOF
    
    print_success "Health check endpoint added."
}

# Create deployment script
create_deployment_script() {
    print_status "Creating deployment script..."
    
    cat > deploy.sh << 'EOF'
#!/bin/bash

# CallDocker Deployment Script
set -e

echo "🚀 Deploying CallDocker to DigitalOcean..."

# Check if doctl is authenticated
if ! doctl account get &> /dev/null; then
    echo "❌ Please authenticate with DigitalOcean first:"
    echo "   doctl auth init"
    exit 1
fi

# Deploy the application
echo "📦 Deploying application..."
doctl apps create --spec .do/app.yaml

echo "✅ Deployment initiated! Check the DigitalOcean dashboard for progress."
echo "🔗 Your app will be available at: https://your-app-name.ondigitalocean.app"
EOF
    
    chmod +x deploy.sh
    print_success "Deployment script created."
}

# Main setup function
main() {
    echo "🎯 CallDocker Production Setup"
    echo "=============================="
    
    check_dependencies
    setup_environment
    create_app_spec
    create_dockerfile
    update_package_json
    create_migration_script
    create_seed_script
    add_health_check
    create_deployment_script
    
    echo ""
    echo "🎉 Production setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Update .env.production with your actual values"
    echo "2. Update .do/app.yaml with your GitHub repository"
    echo "3. Authenticate with DigitalOcean: doctl auth init"
    echo "4. Deploy: ./deploy.sh"
    echo ""
    echo "📚 For detailed instructions, see DEPLOYMENT-STRATEGY.md"
}

# Run main function
main "$@"
