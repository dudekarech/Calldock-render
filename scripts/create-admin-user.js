const databaseManager = require('../database/config');
const bcrypt = require('bcryptjs');

async function createAdminUser() {
    try {
        console.log('👤 Creating admin user...');
        
        // Connect to database
        await databaseManager.connect();
        
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
    } finally {
        await databaseManager.close();
    }
}

// Run if called directly
if (require.main === module) {
    createAdminUser()
        .then(() => {
            console.log('🎉 Admin user creation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Admin user creation failed:', error);
            process.exit(1);
        });
}

module.exports = createAdminUser;
