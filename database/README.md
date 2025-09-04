# CallDocker Database Setup

This directory contains the database schema and configuration for the CallDocker system.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Schema](#database-schema)
- [Models](#models)
- [Usage](#usage)
- [Migrations](#migrations)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

CallDocker uses PostgreSQL as its primary database with a comprehensive schema designed for:
- **User Management**: Authentication, authorization, and user profiles
- **Company Management**: Multi-tenant organization support
- **IVR System**: Interactive Voice Response flows and menu options
- **Call Management**: Call tracking, queue management, and analytics
- **Agent Management**: Agent profiles, skills, and availability
- **Analytics**: Call statistics and performance metrics

## 🔧 Prerequisites

- **PostgreSQL 12+** installed and running
- **Node.js 16+** for running database scripts
- **psql** command-line tool (usually comes with PostgreSQL)

### Install PostgreSQL

#### Windows
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

#### macOS
```bash
# Using Homebrew:
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 🚀 Installation

### 1. Create Database

```bash
# Create the development database
createdb calldocker_dev

# Create the test database
createdb calldocker_test
```

### 2. Run Schema Migration

```bash
# Run the schema migration
psql -d calldocker_dev -f database/schema.sql
```

### 3. Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### 4. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env file with your database credentials
nano .env
```

### 5. Test Connection

```bash
# Test database connection
node -e "require('./database/config').initializeDatabase().then(console.log)"
```

## 🗄️ Database Schema

### Core Tables

#### Users & Authentication
- `users` - User accounts and profiles
- `user_sessions` - Active user sessions

#### Companies & Organizations
- `companies` - Company/organization information
- `company_users` - Many-to-many relationship between users and companies

#### IVR System
- `ivr_flows` - IVR flow configurations
- `ivr_menu_options` - Menu options for each IVR flow

#### Agents & Departments
- `departments` - Company departments
- `agents` - Agent profiles and skills
- `agent_availability_log` - Agent status history

#### Calls & Communications
- `calls` - Call records and metadata
- `call_events` - Call event logs
- `call_queue` - Call queue management

#### Analytics & Reporting
- `call_analytics` - Aggregated call statistics
- `agent_performance` - Agent performance metrics

#### Integrations & Settings
- `company_settings` - Company-specific settings
- `webhooks` - Webhook configurations

### Key Features

- **UUID Primary Keys**: All tables use UUIDs for better scalability
- **Timestamps**: Automatic created_at and updated_at tracking
- **JSONB Support**: Flexible data storage for complex objects
- **Indexes**: Optimized for common query patterns
- **Foreign Keys**: Referential integrity constraints
- **Triggers**: Automatic updated_at timestamp updates

## 📊 Models

The database models provide a clean interface for database operations:

### User Model
```javascript
const User = require('./database/models/User');

// Create user
const user = await User.create({
    email: 'user@example.com',
    password: 'securepassword',
    first_name: 'John',
    last_name: 'Doe'
});

// Find user
const user = await User.findByEmail('user@example.com');

// Update user
await User.update(userId, { first_name: 'Jane' });
```

### Company Model
```javascript
const Company = require('./database/models/Company');

// Create company
const company = await Company.create({
    name: 'Acme Corp',
    domain: 'acme.com',
    industry: 'Technology'
});

// Get company with users
const companyWithUsers = await Company.findWithUsers(companyId);

// Get company statistics
const stats = await Company.getStats(companyId);
```

### Call Model
```javascript
const Call = require('./database/models/Call');

// Create call
const call = await Call.create({
    call_id: 'call_123',
    company_id: companyId,
    caller_name: 'John Doe',
    caller_phone: '+1234567890'
});

// Update call status
await Call.updateStatus(callId, 'connected', { agent_id: agentId });

// Get call statistics
const stats = await Call.getStats(companyId);
```

### IVR Flow Model
```javascript
const IvrFlow = require('./database/models/IvrFlow');

// Create IVR flow
const flow = await IvrFlow.create({
    company_id: companyId,
    name: 'Support IVR',
    welcome_message: 'Welcome to support...',
    menu_options: [
        { key_press: '1', label: 'Support', action: 'route', target: 'support' }
    ]
});

// Get active flows
const activeFlows = await IvrFlow.getActiveFlows(companyId);
```

## 🔄 Usage

### Basic Operations

#### Create a New Company with Admin User

```javascript
const User = require('./database/models/User');
const Company = require('./database/models/Company');

// Create company
const company = await Company.create({
    name: 'My Company',
    domain: 'mycompany.com'
});

// Create admin user
const admin = await User.create({
    email: 'admin@mycompany.com',
    password: 'securepassword',
    first_name: 'Admin',
    last_name: 'User',
    role: 'admin'
});

// Link user to company
await User.addToCompany(admin.id, company.id, 'owner');
```

#### Set Up IVR Flow

```javascript
const IvrFlow = require('./database/models/IvrFlow');

const ivrFlow = await IvrFlow.create({
    company_id: companyId,
    name: 'Main Support Line',
    welcome_message: 'Welcome to our support line...',
    menu_options: [
        { key_press: '1', label: 'Technical Support', action: 'route', target: 'tech_support' },
        { key_press: '2', label: 'Billing', action: 'route', target: 'billing' },
        { key_press: '0', label: 'Operator', action: 'route', target: 'operator' }
    ]
});

// Activate the flow
await IvrFlow.activate(ivrFlow.id);
```

#### Track a Call

```javascript
const Call = require('./database/models/Call');

// Create call
const call = await Call.create({
    call_id: 'call_abc123',
    company_id: companyId,
    caller_name: 'John Doe',
    caller_phone: '+1234567890'
});

// Add to queue
await Call.addToQueue(call.id, companyId);

// Update status when agent picks up
await Call.updateStatus(call.id, 'connected', { agent_id: agentId });

// Complete call
await Call.updateStatus(call.id, 'completed', {
    call_duration_seconds: 300,
    wait_time_seconds: 45
});
```

### Advanced Queries

#### Get Call Analytics

```javascript
// Get call statistics for last 30 days
const stats = await Call.getStats(companyId, {
    date_from: '2024-01-01',
    date_to: '2024-01-31'
});

// Get daily call volume
const dailyStats = await Call.getByDateRange(companyId, '2024-01-01', '2024-01-31');
```

#### Search and Filter

```javascript
// Search calls
const calls = await Call.search('john doe', companyId);

// Get calls with filters
const calls = await Call.findAll(1, 20, {
    status: 'completed',
    date_from: '2024-01-01',
    agent_id: agentId
});
```

## 🔄 Migrations

### Running Migrations

```bash
# Run schema migration
npm run db:migrate

# Reset database (drop, create, migrate, seed)
npm run db:reset
```

### Creating New Migrations

1. Create a new SQL file in the `database/migrations/` directory
2. Use timestamp prefix: `20240101_001_add_new_table.sql`
3. Include both UP and DOWN migrations
4. Test the migration

Example migration:
```sql
-- UP Migration
CREATE TABLE new_feature (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DOWN Migration
DROP TABLE new_feature;
```

## 💾 Backup & Restore

### Backup Database

```bash
# Create backup
pg_dump calldocker_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Create compressed backup
pg_dump calldocker_dev | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore Database

```bash
# Restore from backup
psql calldocker_dev < backup_20240101_120000.sql

# Restore from compressed backup
gunzip -c backup_20240101_120000.sql.gz | psql calldocker_dev
```

### Automated Backups

Create a cron job for automated backups:

```bash
# Add to crontab
0 2 * * * pg_dump calldocker_dev | gzip > /backups/calldocker_$(date +\%Y\%m\%d).sql.gz
```

## 🔧 Troubleshooting

### Common Issues

#### Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql
```

#### Permission Denied
```bash
# Create PostgreSQL user
sudo -u postgres createuser --interactive

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE calldocker_dev TO your_user;"
```

#### Database Not Found
```bash
# Create database
createdb calldocker_dev

# Or using psql
sudo -u postgres createdb calldocker_dev
```

#### UUID Extension Error
```bash
# Enable UUID extension
sudo -u postgres psql calldocker_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

### Performance Optimization

#### Index Optimization
```sql
-- Analyze table usage
ANALYZE calls;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Query Optimization
```sql
-- Enable query logging
SET log_statement = 'all';
SET log_min_duration_statement = 1000;

-- Check slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Monitoring

#### Database Size
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

#### Connection Count
```sql
SELECT 
    state,
    count(*) as connections
FROM pg_stat_activity
GROUP BY state
ORDER BY connections DESC;
```

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Documentation](https://node-postgres.com/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl.html)

## 🤝 Contributing

When contributing to the database schema:

1. Create a new migration file
2. Test the migration on a copy of production data
3. Update the models if needed
4. Add appropriate indexes
5. Update this documentation

## 📄 License

This database schema is part of the CallDocker project and is licensed under the MIT License.
