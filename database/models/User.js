const { query, getRow, getRows, execute, transaction } = require('../config');
const bcrypt = require('bcrypt');

class User {
    // Create a new user
    static async create(userData) {
        const { email, password, first_name, last_name, phone, role = 'user' } = userData;
        
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        const sql = `
            INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const result = await query(sql, [email, password_hash, first_name, last_name, phone, role]);
        return result.rows[0];
    }

    // Find user by ID
    static async findById(id) {
        const sql = 'SELECT * FROM users WHERE id = $1';
        return await getRow(sql, [id]);
    }

    // Find user by email
    static async findByEmail(email) {
        const sql = 'SELECT * FROM users WHERE email = $1';
        return await getRow(sql, [email]);
    }

    // Get all users with pagination
    static async findAll(page = 1, limit = 10, filters = {}) {
        let sql = 'SELECT * FROM users WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Add filters
        if (filters.role) {
            paramCount++;
            sql += ` AND role = $${paramCount}`;
            params.push(filters.role);
        }

        if (filters.status) {
            paramCount++;
            sql += ` AND status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.search) {
            paramCount++;
            sql += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        paramCount++;
        sql += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        params.push(offset);

        const users = await getRows(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) FROM users WHERE 1=1';
        const countParams = [];
        paramCount = 0;

        if (filters.role) {
            paramCount++;
            countSql += ` AND role = $${paramCount}`;
            countParams.push(filters.role);
        }

        if (filters.status) {
            paramCount++;
            countSql += ` AND status = $${paramCount}`;
            countParams.push(filters.status);
        }

        if (filters.search) {
            paramCount++;
            countSql += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
            countParams.push(`%${filters.search}%`);
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Update user
    static async update(id, updateData) {
        const allowedFields = ['first_name', 'last_name', 'phone', 'role', 'status', 'avatar_url'];
        const updates = [];
        const values = [];
        let paramCount = 0;

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                updates.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }

        if (updates.length === 0) {
            throw new Error('No valid fields to update');
        }

        paramCount++;
        values.push(id);

        const sql = `
            UPDATE users 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Update password
    static async updatePassword(id, newPassword) {
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(newPassword, saltRounds);

        const sql = `
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING id, email
        `;

        const result = await query(sql, [password_hash, id]);
        return result.rows[0];
    }

    // Verify password
    static async verifyPassword(userId, password) {
        const user = await this.findById(userId);
        if (!user) {
            return false;
        }

        return await bcrypt.compare(password, user.password_hash);
    }

    // Update last login
    static async updateLastLogin(id) {
        const sql = `
            UPDATE users 
            SET last_login = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, last_login
        `;

        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Delete user
    static async delete(id) {
        const sql = 'DELETE FROM users WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Get users by role
    static async findByRole(role) {
        const sql = 'SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC';
        return await getRows(sql, [role]);
    }

    // Get users by company
    static async findByCompany(companyId) {
        const sql = `
            SELECT u.*, cu.role as company_role, cu.permissions
            FROM users u
            JOIN company_users cu ON u.id = cu.user_id
            WHERE cu.company_id = $1
            ORDER BY cu.joined_at DESC
        `;
        return await getRows(sql, [companyId]);
    }

    // Add user to company
    static async addToCompany(userId, companyId, role = 'member', permissions = {}) {
        const sql = `
            INSERT INTO company_users (user_id, company_id, role, permissions)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (company_id, user_id) 
            DO UPDATE SET role = $3, permissions = $4, joined_at = CURRENT_TIMESTAMP
            RETURNING *
        `;

        const result = await query(sql, [userId, companyId, role, JSON.stringify(permissions)]);
        return result.rows[0];
    }

    // Remove user from company
    static async removeFromCompany(userId, companyId) {
        const sql = 'DELETE FROM company_users WHERE user_id = $1 AND company_id = $2 RETURNING *';
        const result = await query(sql, [userId, companyId]);
        return result.rows[0];
    }

    // Get user's companies
    static async getCompanies(userId) {
        const sql = `
            SELECT c.*, cu.role as user_role, cu.permissions
            FROM companies c
            JOIN company_users cu ON c.id = cu.company_id
            WHERE cu.user_id = $1
            ORDER BY cu.joined_at DESC
        `;
        return await getRows(sql, [userId]);
    }

    // Check if user has permission in company
    static async hasPermission(userId, companyId, permission) {
        const sql = `
            SELECT permissions
            FROM company_users
            WHERE user_id = $1 AND company_id = $2
        `;
        
        const result = await getRow(sql, [userId, companyId]);
        if (!result) return false;

        const permissions = result.permissions || {};
        return permissions[permission] === true;
    }

    // Get user statistics
    static async getStats(userId) {
        const sql = `
            SELECT 
                COUNT(DISTINCT c.id) as total_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
                AVG(CASE WHEN c.status = 'completed' THEN c.call_duration_seconds END) as avg_call_duration,
                SUM(CASE WHEN c.status = 'completed' THEN c.call_duration_seconds END) as total_call_time
            FROM calls c
            WHERE c.agent_id = (SELECT id FROM agents WHERE user_id = $1)
        `;

        const stats = await getRow(sql, [userId]);
        return {
            total_calls: parseInt(stats?.total_calls || 0),
            completed_calls: parseInt(stats?.completed_calls || 0),
            avg_call_duration: parseInt(stats?.avg_call_duration || 0),
            total_call_time: parseInt(stats?.total_call_time || 0)
        };
    }

    // Search users
    static async search(searchTerm, companyId = null) {
        let sql = `
            SELECT DISTINCT u.*
            FROM users u
        `;
        
        const params = [];
        let paramCount = 0;

        if (companyId) {
            paramCount++;
            sql += ` JOIN company_users cu ON u.id = cu.user_id WHERE cu.company_id = $${paramCount}`;
            params.push(companyId);
        } else {
            sql += ' WHERE 1=1';
        }

        paramCount++;
        sql += ` AND (
            u.first_name ILIKE $${paramCount} OR 
            u.last_name ILIKE $${paramCount} OR 
            u.email ILIKE $${paramCount}
        )`;
        params.push(`%${searchTerm}%`);

        sql += ' ORDER BY u.first_name, u.last_name LIMIT 10';

        return await getRows(sql, params);
    }
}

module.exports = User;
