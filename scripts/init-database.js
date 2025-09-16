const databaseManager = require('../database/config');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Function to properly split SQL statements, handling functions and DO blocks
function splitSqlStatements(sql) {
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    let inDoBlock = false;
    let dollarQuoteTag = '';
    let parenDepth = 0;
    let inComment = false;
    
    const lines = sql.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and comments
        if (!line || line.startsWith('--')) {
            if (currentStatement.trim()) {
                currentStatement += '\n';
            }
            continue;
        }
        
        // Handle multi-line comments
        if (line.includes('/*')) {
            inComment = true;
        }
        if (line.includes('*/')) {
            inComment = false;
            continue;
        }
        if (inComment) {
            continue;
        }
        
        // Check for function definition
        if (line.match(/CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i)) {
            inFunction = true;
        }
        
        // Check for DO block
        if (line.match(/DO\s+\$\$/i)) {
            inDoBlock = true;
            dollarQuoteTag = '$$';
        }
        
        // Check for custom dollar quoting
        if (line.includes('$$') && !inDoBlock) {
            if (!dollarQuoteTag) {
                dollarQuoteTag = '$$';
            } else if (line.includes(dollarQuoteTag)) {
                dollarQuoteTag = '';
            }
        }
        
        // Track parentheses depth for function bodies
        if (inFunction || inDoBlock) {
            parenDepth += (line.match(/\(/g) || []).length;
            parenDepth -= (line.match(/\)/g) || []).length;
        }
        
        currentStatement += line + '\n';
        
        // Check if we're at the end of a statement
        if (line.endsWith(';') && !inFunction && !inDoBlock && !dollarQuoteTag) {
            const statement = currentStatement.trim();
            if (statement && !statement.startsWith('--')) {
                statements.push(statement);
            }
            currentStatement = '';
        }
        
        // Check if we're at the end of a function
        if (inFunction && line.includes('$$') && parenDepth <= 0) {
            inFunction = false;
            parenDepth = 0;
        }
        
        // Check if we're at the end of a DO block
        if (inDoBlock && line.includes('$$') && parenDepth <= 0) {
            inDoBlock = false;
            dollarQuoteTag = '';
            parenDepth = 0;
        }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
    }
    
    return statements.filter(stmt => stmt.length > 0);
}

async function createAdminUser() {
    try {
        console.log('👤 Creating admin user...');
        
        // Check if admin user already exists
        const existingAdmin = await databaseManager.query(
            'SELECT id FROM users WHERE email = $1',
            ['admin@calldocker.com']
        );
        
        if (existingAdmin.rows.length > 0) {
            console.log('ℹ️ Admin user already exists, skipping creation');
            return;
        }
        
        // Create default company first
        const companyResult = await databaseManager.query(`
            INSERT INTO companies (name, uuid, status, settings, created_at, updated_at)
            VALUES ('CallDocker Global', 'calldocker', 'active', '{}', NOW(), NOW())
            ON CONFLICT (uuid) DO NOTHING
            RETURNING id
        `);
        
        let companyId;
        if (companyResult.rows.length > 0) {
            companyId = companyResult.rows[0].id;
            console.log('✅ Default company created');
        } else {
            // Get existing company ID
            const existingCompany = await databaseManager.query(
                'SELECT id FROM companies WHERE uuid = $1',
                ['calldocker']
            );
            companyId = existingCompany.rows[0].id;
            console.log('ℹ️ Using existing company');
        }
        
        // Hash the admin password
        const passwordHash = await bcrypt.hash('admin123', 12);
        
        // Create admin user
        const adminResult = await databaseManager.query(`
            INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, is_active, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id, email, role
        `, [
            'admin@calldocker.com',
            passwordHash,
            'super_admin',
            companyId,
            'Super',
            'Admin',
            true,
            'active'
        ]);
        
        console.log('✅ Admin user created successfully!');
        console.log(`📧 Email: admin@calldocker.com`);
        console.log(`🔑 Password: admin123`);
        console.log(`🆔 User ID: ${adminResult.rows[0].id}`);
        
    } catch (error) {
        console.error('❌ Failed to create admin user:', error);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        console.log('🗄️ Initializing database schema...');
        
        // Connect to database
        await databaseManager.connect();
        
        // Read and execute init.sql
        const initSqlPath = path.join(__dirname, '../database/init.sql');
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        
        // Split SQL into individual statements, handling functions and DO blocks
        const statements = splitSqlStatements(initSql);
        
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
            const ivrStatements = splitSqlStatements(ivrSchema);
            
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
        
        // Create admin user
        await createAdminUser();
        
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
