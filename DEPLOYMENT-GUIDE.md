# 🚀 CallDocker Production Deployment Guide

## 📋 **Overview**

This guide outlines the best practices for deploying CallDocker to production while maintaining all existing functionality. We'll use a **phased deployment approach** to ensure zero downtime and maintain what's already working.

---

## 🎯 **Deployment Strategy: "Maintain & Enhance"**

### **Principle: Don't Break What Works**
- ✅ **Keep existing functionality intact**
- ✅ **Gradual rollout with rollback capability**
- ✅ **Database-first approach**
- ✅ **Environment parity**

---

## 🏗️ **Infrastructure Architecture**

### **Production Stack**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │   Database      │
│   (Nginx/ALB)   │───▶│   (Node.js)     │───▶│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/Static    │    │   Redis Cache   │    │   Backup Storage│
│   (CloudFront)  │    │   (Session)     │    │   (S3/Backup)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🚀 **Phase 1: Database Migration (Week 1)**

### **1.1 Database Setup**
```bash
# Start database services
docker-compose -f docker-compose.db.yml up -d

# Verify connection
docker exec -it calldocker-postgres psql -U calldocker_user -d calldocker -c "SELECT version();"
```

### **1.2 Schema Migration**
```bash
# Run initial schema
psql -h localhost -U calldocker_user -d calldocker -f database/schema.sql

# Run company registration migration
psql -h localhost -U calldocker_user -d calldocker -f migrations/002_company_registration_system.sql
```

### **1.3 Data Migration Strategy**
- **Export existing data** from current system
- **Transform data** to match new schema
- **Import with validation**
- **Verify data integrity**

---

## 🔄 **Phase 2: Application Deployment (Week 2)**

### **2.1 Environment Configuration**
```bash
# Copy production environment
cp env.production .env

# Update with real values
nano .env
```

### **2.2 Database Integration**
```javascript
// Update server.js to use real database
const databaseManager = require('./database/config');

// Initialize database connection
app.use(async (req, res, next) => {
    if (!databaseManager.isConnected) {
        await databaseManager.connect();
    }
    req.db = databaseManager;
    next();
});
```

### **2.3 Service Layer Integration**
```javascript
// Update company creation service
const CompanyCreationService = require('./services/company-creation-service');
const companyCreationService = new CompanyCreationService(databaseManager);
```

---

## 🌐 **Phase 3: Production Infrastructure (Week 3)**

### **3.1 Load Balancer Setup**
```nginx
# Nginx configuration
upstream calldocker_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://calldocker_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### **3.2 SSL/TLS Configuration**
```bash
# Let's Encrypt setup
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **3.3 CDN Configuration**
```javascript
// Widget CDN setup
const widgetCDN = process.env.WIDGET_CDN_URL || 'https://cdn.yourdomain.com';

// Serve widget from CDN
app.get('/widget/:companyId', (req, res) => {
    const widgetUrl = `${widgetCDN}/widgets/${req.params.companyId}.js`;
    res.redirect(widgetUrl);
});
```

---

## 📊 **Phase 4: Monitoring & Analytics (Week 4)**

### **4.1 Application Monitoring**
```javascript
// Health check endpoint
app.get('/health', async (req, res) => {
    const dbHealth = await req.db.healthCheck();
    const redisHealth = await redisClient.ping();
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: dbHealth ? 'connected' : 'disconnected',
        redis: redisHealth ? 'connected' : 'disconnected',
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});
```

### **4.2 Performance Monitoring**
```javascript
// Request timing middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${duration}ms`);
    });
    next();
});
```

---

## 🔒 **Security Hardening**

### **5.1 Authentication Middleware**
```javascript
// Implement proper admin authentication
const authenticateAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

### **5.2 Rate Limiting**
```javascript
// Enhanced rate limiting
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
});

app.use('/api/', apiLimiter);
```

---

## 🚀 **Deployment Commands**

### **6.1 Production Start**
```bash
# Set production environment
export NODE_ENV=production

# Install production dependencies
npm ci --only=production

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit
```

### **6.2 Database Migration**
```bash
# Run migrations
npm run migrate:up

# Verify schema
npm run db:verify

# Backup before major changes
npm run db:backup
```

### **6.3 Rollback Procedure**
```bash
# Stop application
pm2 stop calldocker

# Rollback database
npm run migrate:down

# Restart with previous version
pm2 start ecosystem.config.js --env production
```

---

## 📋 **Pre-Deployment Checklist**

### **7.1 Code Quality**
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security scan passed
- [ ] Performance benchmarks met

### **7.2 Database**
- [ ] Schema migration tested
- [ ] Data backup completed
- [ ] Connection pooling configured
- [ ] Indexes optimized

### **7.3 Infrastructure**
- [ ] SSL certificates installed
- [ ] Load balancer configured
- [ ] CDN setup completed
- [ ] Monitoring configured

### **7.4 Security**
- [ ] Environment variables secured
- [ ] Authentication implemented
- [ ] Rate limiting enabled
- [ ] CORS configured

---

## 🔍 **Post-Deployment Verification**

### **8.1 Functionality Tests**
```bash
# Test company registration
curl -X POST https://yourdomain.com/api/company-registrations \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test Corp","contact_email":"test@corp.com","admin_first_name":"John","admin_last_name":"Doe","admin_email":"john@corp.com"}'

# Test admin dashboard
curl https://yourdomain.com/admin

# Test widget generation
curl https://yourdomain.com/api/widgets/generate
```

### **8.2 Performance Tests**
```bash
# Load testing
npm run test:load

# Database performance
npm run test:db

# API response times
npm run test:api
```

---

## 🚨 **Troubleshooting**

### **9.1 Common Issues**
- **Database connection failures**: Check credentials and network
- **Memory leaks**: Monitor with PM2 and Node.js inspector
- **Slow queries**: Use database monitoring tools
- **SSL issues**: Verify certificate paths and permissions

### **9.2 Emergency Procedures**
```bash
# Quick rollback
git checkout HEAD~1
npm run deploy:rollback

# Database restore
npm run db:restore:latest

# Service restart
pm2 restart all
```

---

## 📈 **Scaling Strategy**

### **10.1 Horizontal Scaling**
```javascript
// Cluster mode with PM2
module.exports = {
    apps: [{
        name: 'calldocker',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        env: {
            NODE_ENV: 'production'
        }
    }]
};
```

### **10.2 Database Scaling**
- **Read replicas** for analytics
- **Connection pooling** optimization
- **Query optimization** and indexing
- **Caching layer** with Redis

---

## 🎯 **Success Metrics**

### **11.1 Performance Targets**
- **Response time**: < 200ms for API calls
- **Uptime**: > 99.9%
- **Database queries**: < 100ms average
- **Widget load time**: < 2 seconds

### **11.2 Business Metrics**
- **Company registrations**: Track conversion rate
- **Widget usage**: Monitor engagement
- **Call volume**: Track system capacity
- **User satisfaction**: Monitor support tickets

---

## 📚 **Additional Resources**

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance.html)
- [Nginx Configuration Guide](https://nginx.org/en/docs/)
- [PM2 Process Manager](https://pm2.keymetrics.io/docs/)

---

**Remember: The goal is to enhance what's working, not replace it. Take it step by step, test thoroughly, and always have a rollback plan ready!** 🚀

