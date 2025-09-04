const { query, getRow, getRows, execute, transaction } = require('../config');

class Company {
    // Create a new company
    static async create(companyData) {
        const {
            name,
            domain,
            industry,
            size = 'medium',
            logo_url,
            website_url,
            billing_email,
            phone,
            address,
            timezone = 'UTC'
        } = companyData;

        const sql = `
            INSERT INTO companies (name, domain, industry, size, logo_url, website_url, billing_email, phone, address, timezone)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const result = await query(sql, [
            name, domain, industry, size, logo_url, website_url, billing_email, phone, address, timezone
        ]);
        return result.rows[0];
    }

    // Find company by ID
    static async findById(id) {
        const sql = 'SELECT * FROM companies WHERE id = $1';
        return await getRow(sql, [id]);
    }

    // Find company by domain
    static async findByDomain(domain) {
        const sql = 'SELECT * FROM companies WHERE domain = $1';
        return await getRow(sql, [domain]);
    }

    // Get all companies with pagination
    static async findAll(page = 1, limit = 10, filters = {}) {
        let sql = 'SELECT * FROM companies WHERE 1=1';
        const params = [];
        let paramCount = 0;

        // Add filters
        if (filters.status) {
            paramCount++;
            sql += ` AND status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.industry) {
            paramCount++;
            sql += ` AND industry = $${paramCount}`;
            params.push(filters.industry);
        }

        if (filters.size) {
            paramCount++;
            sql += ` AND size = $${paramCount}`;
            params.push(filters.size);
        }

        if (filters.search) {
            paramCount++;
            sql += ` AND (name ILIKE $${paramCount} OR domain ILIKE $${paramCount})`;
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

        const companies = await getRows(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) FROM companies WHERE 1=1';
        const countParams = [];
        paramCount = 0;

        if (filters.status) {
            paramCount++;
            countSql += ` AND status = $${paramCount}`;
            countParams.push(filters.status);
        }

        if (filters.industry) {
            paramCount++;
            countSql += ` AND industry = $${paramCount}`;
            countParams.push(filters.industry);
        }

        if (filters.size) {
            paramCount++;
            countSql += ` AND size = $${paramCount}`;
            countParams.push(filters.size);
        }

        if (filters.search) {
            paramCount++;
            countSql += ` AND (name ILIKE $${paramCount} OR domain ILIKE $${paramCount})`;
            countParams.push(`%${filters.search}%`);
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);

        return {
            companies,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Update company
    static async update(id, updateData) {
        const allowedFields = [
            'name', 'domain', 'industry', 'size', 'logo_url', 'website_url',
            'billing_email', 'phone', 'address', 'timezone', 'status'
        ];
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
            UPDATE companies 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(sql, values);
        return result.rows[0];
    }

    // Delete company
    static async delete(id) {
        const sql = 'DELETE FROM companies WHERE id = $1 RETURNING *';
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Get company with users
    static async findWithUsers(id) {
        const sql = `
            SELECT 
                c.*,
                json_agg(
                    json_build_object(
                        'id', u.id,
                        'email', u.email,
                        'first_name', u.first_name,
                        'last_name', u.last_name,
                        'role', u.role,
                        'status', u.status,
                        'company_role', cu.role,
                        'permissions', cu.permissions,
                        'joined_at', cu.joined_at
                    )
                ) as users
            FROM companies c
            LEFT JOIN company_users cu ON c.id = cu.company_id
            LEFT JOIN users u ON cu.user_id = u.id
            WHERE c.id = $1
            GROUP BY c.id
        `;

        const result = await getRow(sql, [id]);
        if (result && result.users[0].id === null) {
            result.users = [];
        }
        return result;
    }

    // Get company statistics
    static async getStats(id) {
        const sql = `
            SELECT 
                COUNT(DISTINCT c.id) as total_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_calls,
                COUNT(DISTINCT CASE WHEN c.status = 'missed' THEN c.id END) as missed_calls,
                AVG(CASE WHEN c.status = 'completed' THEN c.call_duration_seconds END) as avg_call_duration,
                AVG(CASE WHEN c.status = 'completed' THEN c.wait_time_seconds END) as avg_wait_time,
                COUNT(DISTINCT a.id) as total_agents,
                COUNT(DISTINCT CASE WHEN a.status = 'available' THEN a.id END) as available_agents
            FROM companies comp
            LEFT JOIN calls c ON comp.id = c.company_id
            LEFT JOIN agents a ON comp.id = a.company_id
            WHERE comp.id = $1
        `;

        const stats = await getRow(sql, [id]);
        return {
            total_calls: parseInt(stats?.total_calls || 0),
            completed_calls: parseInt(stats?.completed_calls || 0),
            missed_calls: parseInt(stats?.missed_calls || 0),
            avg_call_duration: parseInt(stats?.avg_call_duration || 0),
            avg_wait_time: parseInt(stats?.avg_wait_time || 0),
            total_agents: parseInt(stats?.total_agents || 0),
            available_agents: parseInt(stats?.available_agents || 0)
        };
    }

    // Get company departments
    static async getDepartments(id) {
        const sql = `
            SELECT d.*, COUNT(a.id) as agent_count
            FROM departments d
            LEFT JOIN agents a ON d.id = a.department_id
            WHERE d.company_id = $1
            GROUP BY d.id
            ORDER BY d.created_at DESC
        `;
        return await getRows(sql, [id]);
    }

    // Get company IVR flows
    static async getIvrFlows(id) {
        const sql = `
            SELECT 
                ivf.*,
                json_agg(
                    json_build_object(
                        'id', imo.id,
                        'key_press', imo.key_press,
                        'label', imo.label,
                        'action', imo.action,
                        'target', imo.target,
                        'order_index', imo.order_index
                    ) ORDER BY imo.order_index
                ) as menu_options
            FROM ivr_flows ivf
            LEFT JOIN ivr_menu_options imo ON ivf.id = imo.ivr_flow_id
            WHERE ivf.company_id = $1
            GROUP BY ivf.id
            ORDER BY ivf.created_at DESC
        `;

        const flows = await getRows(sql, [id]);
        return flows.map(flow => {
            if (flow.menu_options[0].id === null) {
                flow.menu_options = [];
            }
            return flow;
        });
    }

    // Get company agents
    static async getAgents(id) {
        const sql = `
            SELECT 
                a.*,
                u.first_name,
                u.last_name,
                u.email,
                u.avatar_url,
                d.name as department_name,
                d.color as department_color
            FROM agents a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON a.department_id = d.id
            WHERE a.company_id = $1
            ORDER BY a.created_at DESC
        `;
        return await getRows(sql, [id]);
    }

    // Get company recent calls
    static async getRecentCalls(id, limit = 10) {
        const sql = `
            SELECT 
                c.*,
                a.agent_code,
                u.first_name as agent_first_name,
                u.last_name as agent_last_name,
                d.name as department_name
            FROM calls c
            LEFT JOIN agents a ON c.agent_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE c.company_id = $1
            ORDER BY c.created_at DESC
            LIMIT $2
        `;
        return await getRows(sql, [id, limit]);
    }

    // Get company analytics
    static async getAnalytics(id, startDate = null, endDate = null) {
        let sql = `
            SELECT 
                date,
                total_calls,
                answered_calls,
                missed_calls,
                avg_wait_time_seconds,
                avg_call_duration_seconds
            FROM call_analytics
            WHERE company_id = $1
        `;
        const params = [id];

        if (startDate && endDate) {
            sql += ` AND date BETWEEN $2 AND $3`;
            params.push(startDate, endDate);
        }

        sql += ` ORDER BY date DESC LIMIT 30`;

        return await getRows(sql, params);
    }

    // Search companies
    static async search(searchTerm) {
        const sql = `
            SELECT * FROM companies 
            WHERE name ILIKE $1 OR domain ILIKE $1
            ORDER BY name
            LIMIT 10
        `;
        return await getRows(sql, [`%${searchTerm}%`]);
    }

    // Get company settings
    static async getSettings(id) {
        const sql = 'SELECT setting_key, setting_value FROM company_settings WHERE company_id = $1';
        const settings = await getRows(sql, [id]);
        
        const result = {};
        settings.forEach(setting => {
            result[setting.setting_key] = setting.setting_value;
        });
        
        return result;
    }

    // Update company settings
    static async updateSettings(id, settings) {
        const results = [];
        
        for (const [key, value] of Object.entries(settings)) {
            const sql = `
                INSERT INTO company_settings (company_id, setting_key, setting_value)
                VALUES ($1, $2, $3)
                ON CONFLICT (company_id, setting_key) 
                DO UPDATE SET setting_value = $3, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `;
            
            const result = await query(sql, [id, key, JSON.stringify(value)]);
            results.push(result.rows[0]);
        }
        
        return results;
    }

    // Get company webhooks
    static async getWebhooks(id) {
        const sql = 'SELECT * FROM webhooks WHERE company_id = $1 ORDER BY created_at DESC';
        return await getRows(sql, [id]);
    }

    // Add webhook to company
    static async addWebhook(id, webhookData) {
        const { name, url, events, secret_key } = webhookData;
        
        const sql = `
            INSERT INTO webhooks (company_id, name, url, events, secret_key)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const result = await query(sql, [id, name, url, JSON.stringify(events), secret_key]);
        return result.rows[0];
    }

    // Get company dashboard data
    static async getDashboardData(id) {
        const today = new Date().toISOString().split('T')[0];
        
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM calls WHERE company_id = $1 AND DATE(created_at) = $2) as today_calls,
                (SELECT COUNT(*) FROM calls WHERE company_id = $1 AND DATE(created_at) = $2 AND status = 'completed') as today_completed,
                (SELECT COUNT(*) FROM agents WHERE company_id = $1 AND status = 'available') as available_agents,
                (SELECT COUNT(*) FROM agents WHERE company_id = $1) as total_agents,
                (SELECT AVG(wait_time_seconds) FROM calls WHERE company_id = $1 AND DATE(created_at) = $2 AND status = 'completed') as avg_wait_time
        `;
        
        const stats = await getRow(sql, [id, today]);
        
        return {
            today_calls: parseInt(stats?.today_calls || 0),
            today_completed: parseInt(stats?.today_completed || 0),
            available_agents: parseInt(stats?.available_agents || 0),
            total_agents: parseInt(stats?.total_agents || 0),
            avg_wait_time: parseInt(stats?.avg_wait_time || 0)
        };
    }
}

module.exports = Company;
