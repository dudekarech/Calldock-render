# CallDocker IVR System - Production Deployment Plan

## Overview
This document outlines the comprehensive deployment strategy for the CallDocker IVR system, including infrastructure setup, security hardening, monitoring, and scaling considerations.

## 🏗️ Infrastructure Architecture

### Production Environment Stack
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Servers   │    │   Database      │
│   (Nginx)       │───▶│   (Node.js)     │───▶│   (PostgreSQL)  │
│   SSL/TLS       │    │   PM2 Cluster   │    │   Primary/Replica│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN           │    │   Redis Cache   │    │   File Storage  │
│   (CloudFront)  │    │   (Cluster)     │    │   (S3/Cloud)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Server Specifications
- **Web Servers**: 2x t3.medium (2 vCPU, 4GB RAM)
- **Database**: db.t3.medium (2 vCPU, 4GB RAM)
- **Redis**: cache.t3.micro (2 vCPU, 0.5GB RAM)
- **Load Balancer**: Application Load Balancer (ALB)

## 🚀 Deployment Steps

### Phase 1: Environment Setup

#### 1.1 Production Environment Variables
```bash
# Create production environment file
cp env.development env.production

# Update with production values
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (Production)
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=calldocker_prod
DB_USER=calldocker_prod_user
DB_PASSWORD=strong_production_password

# Redis (Production)
REDIS_HOST=your-production-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=strong_redis_password

# JWT & Security
JWT_SECRET=very_long_random_production_secret_key
SESSION_SECRET=very_long_random_session_secret_key

# SSL & Domain
DOMAIN=yourdomain.com
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# CDN & Storage
CDN_URL=https://cdn.yourdomain.com
STORAGE_BUCKET=calldocker-ivr-content
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
NEW_RELIC_LICENSE_KEY=your_new_relic_key
```

#### 1.2 Database Migration
```bash
# Run database migrations
npm run migrate:prod

# Seed production data
npm run seed:prod

# Verify database health
npm run db:health
```

#### 1.3 SSL Certificate Setup
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Phase 2: Server Deployment

#### 2.1 Nginx Configuration
```nginx
# /etc/nginx/sites-available/calldocker
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Login route with stricter rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://localhost:3000;
        # ... other proxy settings
    }

    # Static files
    location /frontend/ {
        alias /var/www/calldocker/frontend/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploads
    location /uploads/ {
        alias /var/www/calldocker/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

#### 2.2 PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'calldocker-ivr',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
```

#### 2.3 Systemd Service
```ini
# /etc/systemd/system/calldocker-ivr.service
[Unit]
Description=CallDocker IVR System
After=network.target

[Service]
Type=forking
User=calldocker
WorkingDirectory=/var/www/calldocker
Environment=NODE_ENV=production
ExecStart=/usr/bin/pm2 start ecosystem.config.js --env production
ExecReload=/usr/bin/pm2 reload ecosystem.config.js --env production
ExecStop=/usr/bin/pm2 stop ecosystem.config.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Phase 3: Security Hardening

#### 3.1 Firewall Configuration
```bash
# UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Check status
sudo ufw status verbose
```

#### 3.2 Database Security
```sql
-- Create production user with limited privileges
CREATE USER calldocker_prod_user WITH PASSWORD 'strong_production_password';
GRANT CONNECT ON DATABASE calldocker_prod TO calldocker_prod_user;
GRANT USAGE ON SCHEMA public TO calldocker_prod_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO calldocker_prod_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO calldocker_prod_user;

-- Restrict connections
ALTER SYSTEM SET listen_addresses = 'localhost';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
```

#### 3.3 Application Security
```javascript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      mediaSrc: ["'self'", "blob:", "https:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
```

### Phase 4: Monitoring & Logging

#### 4.1 Application Monitoring
```javascript
// New Relic integration
require('newrelic');

// Sentry error tracking
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Winston logging
const winston = require('winston');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'calldocker-ivr' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ],
});
```

#### 4.2 System Monitoring
```bash
# Install monitoring tools
sudo apt-get install htop iotop nethogs

# Setup log rotation
sudo nano /etc/logrotate.d/calldocker-ivr

/var/www/calldocker/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 calldocker calldocker
    postrotate
        systemctl reload calldocker-ivr
    endscript
}
```

#### 4.3 Health Checks
```javascript
// Enhanced health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await databaseManager.healthCheck(),
      redis: await redisClient.ping(),
      ivr: await ivrService.healthCheck()
    };

    const isHealthy = health.database && health.redis === 'PONG';
    res.status(isHealthy ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### Phase 5: Scaling & Performance

#### 5.1 CDN Configuration
```javascript
// CloudFront distribution setup
const CDN_URL = process.env.CDN_URL;

// Serve static assets through CDN
app.use('/static', express.static('frontend', {
  maxAge: '1y',
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
}));

// Upload content to S3 and serve via CDN
const uploadToS3 = async (file, companyId) => {
  const s3 = new AWS.S3();
  const key = `ivr-content/${companyId}/${Date.now()}-${file.originalname}`;
  
  await s3.upload({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  }).promise();
  
  return `${CDN_URL}/${key}`;
};
```

#### 5.2 Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY idx_ivr_sessions_company_status ON ivr_sessions(company_id, status);
CREATE INDEX CONCURRENTLY idx_ivr_sessions_created_at ON ivr_sessions(created_at);
CREATE INDEX CONCURRENTLY idx_ivr_interactions_session_timestamp ON ivr_interactions(session_id, timestamp);

-- Partition large tables by date
CREATE TABLE ivr_sessions_y2024 PARTITION OF ivr_sessions
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Vacuum and analyze regularly
VACUUM ANALYZE ivr_sessions;
VACUUM ANALYZE ivr_interactions;
```

#### 5.3 Caching Strategy
```javascript
// Redis caching for IVR flows
const cacheIVRFlow = async (companyId, flowType) => {
  const cacheKey = `ivr_flow:${companyId}:${flowType}`;
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const flow = await ivrService.getCompanyFlow(companyId, flowType);
  if (flow) {
    await redisClient.setex(cacheKey, 3600, JSON.stringify(flow)); // 1 hour cache
  }
  
  return flow;
};

// In-memory caching for active sessions
const sessionCache = new Map();
const getCachedSession = (sessionId) => {
  return sessionCache.get(sessionId);
};
```

## 🔄 Deployment Process

### Automated Deployment Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.4
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /var/www/calldocker
            git pull origin main
            npm ci --production
            pm2 reload ecosystem.config.js --env production
            sudo systemctl reload nginx
```

### Manual Deployment Steps
```bash
# 1. Pull latest code
cd /var/www/calldocker
git pull origin main

# 2. Install dependencies
npm ci --production

# 3. Run database migrations
npm run migrate:prod

# 4. Restart application
pm2 reload ecosystem.config.js --env production

# 5. Reload Nginx
sudo systemctl reload nginx

# 6. Verify deployment
curl -f https://yourdomain.com/health
```

## 📊 Monitoring & Alerts

### Key Metrics to Monitor
- **Application Performance**: Response time, error rate, throughput
- **System Resources**: CPU, memory, disk I/O, network
- **Database**: Connection count, query performance, replication lag
- **Business Metrics**: Active IVR sessions, completion rates, user satisfaction

### Alerting Rules
```javascript
// Example alerting configuration
const alerts = {
  highErrorRate: {
    threshold: 5, // 5% error rate
    window: '5m',
    action: 'notify_team'
  },
  highResponseTime: {
    threshold: 2000, // 2 seconds
    window: '1m',
    action: 'scale_up'
  },
  databaseConnections: {
    threshold: 80, // 80% of max connections
    window: '1m',
    action: 'investigate'
  }
};
```

## 🚨 Disaster Recovery

### Backup Strategy
```bash
# Database backup
pg_dump -h localhost -U calldocker_prod_user calldocker_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# File backup
aws s3 sync /var/www/calldocker/uploads s3://calldocker-backups/uploads/$(date +%Y%m%d)

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/calldocker /etc/systemd/system/calldocker-ivr.service
```

### Recovery Procedures
1. **Database Recovery**: Restore from latest backup
2. **Application Recovery**: Redeploy from Git repository
3. **Configuration Recovery**: Restore configuration files
4. **Data Recovery**: Restore uploaded content from S3

## 📈 Performance Optimization

### Load Testing
```bash
# Install Artillery for load testing
npm install -g artillery

# Run load test
artillery run load-test.yml
```

### Performance Tuning
- **Node.js**: Increase max old space size, optimize garbage collection
- **Database**: Query optimization, connection pooling, read replicas
- **Network**: HTTP/2, compression, caching headers
- **Storage**: SSD drives, RAID configuration

## 🔒 Security Checklist

- [ ] SSL/TLS certificates installed and auto-renewing
- [ ] Firewall configured and enabled
- [ ] Database access restricted and encrypted
- [ ] API rate limiting implemented
- [ ] Security headers configured
- [ ] Regular security updates scheduled
- [ ] Access logs monitored
- [ ] Backup encryption enabled
- [ ] Penetration testing completed
- [ ] Incident response plan documented

## 📋 Post-Deployment Checklist

- [ ] Health checks passing
- [ ] SSL certificate valid
- [ ] Database connections stable
- [ ] File uploads working
- [ ] IVR flows functional
- [ ] Monitoring alerts configured
- [ ] Backup jobs scheduled
- [ ] Documentation updated
- [ ] Team notified of deployment
- [ ] Performance baseline established

## 🆘 Support & Maintenance

### Maintenance Windows
- **Scheduled**: Every Sunday 2-4 AM UTC
- **Emergency**: As needed with 1-hour notice

### Contact Information
- **DevOps Team**: devops@yourdomain.com
- **Emergency**: +1-555-0123 (24/7)
- **Documentation**: https://docs.yourdomain.com/ivr

### Escalation Procedures
1. **Level 1**: On-call engineer (15 min response)
2. **Level 2**: Senior engineer (30 min response)
3. **Level 3**: Engineering manager (1 hour response)

---

**Last Updated**: September 2025
**Version**: 1.0
**Next Review**: December 2025









