const databaseManager = require('../database/config');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    try {
        console.log('🗄️ Initializing database schema...');
        
        // Connect to database
        await databaseManager.connect();
        
        // Read and execute init.sql
        const initSqlPath = path.join(__dirname, '../database/init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        
        // Split SQL into individual statements
        const statements = initSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Executing ${statements.length} SQL statements...`);
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    await databaseManager.query(statement);
                    console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
                } catch (error) {
                    // Ignore "already exists" errors
                    if (error.code === '42P07' || error.code === '42710') {
                        console.log(`⚠️ Statement ${i + 1}/${statements.length} skipped (already exists)`);
                    } else {
                        console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
                        throw error;
                    }
                }
            }
        }
        
        // Read and execute ivr-schema.sql
        const ivrSchemaPath = path.join(__dirname, '../database/ivr-schema.sql');
        if (fs.existsSync(ivrSchemaPath)) {
            const ivrSchema = fs.readFileSync(ivrSchemaPath, 'utf8');
            const ivrStatements = ivrSchema
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
            
            console.log(`📝 Executing ${ivrStatements.length} IVR schema statements...`);
            
            for (let i = 0; i < ivrStatements.length; i++) {
                const statement = ivrStatements[i];
                if (statement.trim()) {
                    try {
                        await databaseManager.query(statement);
                        console.log(`✅ IVR Statement ${i + 1}/${ivrStatements.length} executed successfully`);
                    } catch (error) {
                        // Ignore "already exists" errors
                        if (error.code === '42P07' || error.code === '42710') {
                            console.log(`⚠️ IVR Statement ${i + 1}/${ivrStatements.length} skipped (already exists)`);
                        } else {
                            console.error(`❌ IVR Statement ${i + 1}/${ivrStatements.length} failed:`, error.message);
                            throw error;
                        }
                    }
                }
            }
        }
        
        console.log('✅ Database initialization completed successfully!');
        
        // Test the tables exist
        const tables = await databaseManager.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('📊 Database tables:', tables.rows.map(row => row.table_name).join(', '));
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        await databaseManager.close();
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Database initialization completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database initialization failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDatabase;
