const { Pool } = require('pg');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // Database connection configuration
            const config = {
                user: process.env.DB_USER || 'calldocker_user',
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'calldocker',
                password: process.env.DB_PASSWORD || 'calldocker_password',
                port: process.env.DB_PORT || 5433,
                ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
                max: 20, // Maximum number of clients in the pool
                idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
                connectionTimeoutMillis: 10000, // Increased timeout for Render
                maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
            };

            // Handle Render's DATABASE_URL if provided
            if (process.env.DATABASE_URL) {
                const url = require('url').parse(process.env.DATABASE_URL);
                config.host = url.hostname;
                config.port = url.port;
                config.database = url.pathname.slice(1);
                config.user = url.auth.split(':')[0];
                config.password = url.auth.split(':')[1];
                config.ssl = { rejectUnauthorized: false };
            }

            this.pool = new Pool(config);

            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            console.log('✅ Database connected successfully');
            
            return this.pool;
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async query(text, params) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }

        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Log slow queries in development
            if (process.env.NODE_ENV === 'development' && duration > 100) {
                console.log(`🐌 Slow query (${duration}ms):`, text.substring(0, 100) + '...');
            }

            return result;
        } catch (error) {
            console.error('❌ Database query error:', error.message);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        }
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('🔌 Database connection closed');
        }
    }

    // Health check method
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return result.rows[0].health === 1;
        } catch (error) {
            return false;
        }
    }

    // Get connection pool status
    getPoolStatus() {
        if (!this.pool) return null;
        
        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount
        };
    }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🔄 Shutting down database connections...');
    await databaseManager.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🔄 Shutting down database connections...');
    await databaseManager.close();
    process.exit(0);
});

module.exports = databaseManager;
