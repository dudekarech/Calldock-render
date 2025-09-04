const { query, getRow, getRows, execute, transaction } = require('../config');

class IvrFlow {
    // Create a new IVR flow
    static async create(flowData) {
        const {
            company_id,
            name,
            description,
            status = 'draft',
            welcome_message,
            hold_music = 'default',
            hold_video,
            estimated_wait_time = 180,
            created_by,
            menu_options = []
        } = flowData;

        return await transaction(async (client) => {
            // Create the IVR flow
            const flowSql = `
                INSERT INTO ivr_flows (
                    company_id, name, description, status, welcome_message,
                    hold_music, hold_video, estimated_wait_time, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const flowResult = await client.query(flowSql, [
                company_id, name, description, status, welcome_message,
                hold_music, hold_video, estimated_wait_time, created_by
            ]);

            const flow = flowResult.rows[0];

            // Create menu options
            if (menu_options && menu_options.length > 0) {
                for (const option of menu_options) {
                    const optionSql = `
                        INSERT INTO ivr_menu_options (
                            ivr_flow_id, key_press, label, action, target, order_index
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                    `;

                    await client.query(optionSql, [
                        flow.id,
                        option.key_press,
                        option.label,
                        option.action,
                        option.target,
                        option.order_index || 0
                    ]);
                }
            }

            return flow;
        });
    }

    // Find IVR flow by ID
    static async findById(id) {
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
            WHERE ivf.id = $1
            GROUP BY ivf.id
        `;

        const flow = await getRow(sql, [id]);
        if (flow && flow.menu_options[0].id === null) {
            flow.menu_options = [];
        }
        return flow;
    }

    // Get all IVR flows for a company
    static async findByCompany(companyId, status = null) {
        let sql = `
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
        `;
        const params = [companyId];

        if (status) {
            sql += ` AND ivf.status = $2`;
            params.push(status);
        }

        sql += ` GROUP BY ivf.id ORDER BY ivf.created_at DESC`;

        const flows = await getRows(sql, params);
        return flows.map(flow => {
            if (flow.menu_options[0].id === null) {
                flow.menu_options = [];
            }
            return flow;
        });
    }

    // Get all IVR flows with pagination
    static async findAll(page = 1, limit = 10, filters = {}) {
        let sql = `
            SELECT 
                ivf.*,
                c.name as company_name,
                c.domain as company_domain,
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
            LEFT JOIN companies c ON ivf.company_id = c.id
            LEFT JOIN ivr_menu_options imo ON ivf.id = imo.ivr_flow_id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        // Add filters
        if (filters.company_id) {
            paramCount++;
            sql += ` AND ivf.company_id = $${paramCount}`;
            params.push(filters.company_id);
        }

        if (filters.status) {
            paramCount++;
            sql += ` AND ivf.status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.search) {
            paramCount++;
            sql += ` AND (ivf.name ILIKE $${paramCount} OR ivf.description ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        sql += ` GROUP BY ivf.id, c.name, c.domain`;

        // Add pagination
        const offset = (page - 1) * limit;
        paramCount++;
        sql += ` ORDER BY ivf.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        params.push(offset);

        const flows = await getRows(sql, params);
        const processedFlows = flows.map(flow => {
            if (flow.menu_options[0].id === null) {
                flow.menu_options = [];
            }
            return flow;
        });

        // Get total count for pagination
        let countSql = 'SELECT COUNT(DISTINCT ivf.id) FROM ivr_flows ivf WHERE 1=1';
        const countParams = [];
        paramCount = 0;

        if (filters.company_id) {
            paramCount++;
            countSql += ` AND ivf.company_id = $${paramCount}`;
            countParams.push(filters.company_id);
        }

        if (filters.status) {
            paramCount++;
            countSql += ` AND ivf.status = $${paramCount}`;
            countParams.push(filters.status);
        }

        if (filters.search) {
            paramCount++;
            countSql += ` AND (ivf.name ILIKE $${paramCount} OR ivf.description ILIKE $${paramCount})`;
            countParams.push(`%${filters.search}%`);
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);

        return {
            flows: processedFlows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Update IVR flow
    static async update(id, updateData) {
        const {
            name,
            description,
            status,
            welcome_message,
            hold_music,
            hold_video,
            estimated_wait_time,
            menu_options
        } = updateData;

        return await transaction(async (client) => {
            // Update the IVR flow
            const allowedFields = [
                'name', 'description', 'status', 'welcome_message',
                'hold_music', 'hold_video', 'estimated_wait_time'
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

            const flowSql = `
                UPDATE ivr_flows 
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const flowResult = await client.query(flowSql, values);
            const flow = flowResult.rows[0];

            // Update menu options if provided
            if (menu_options !== undefined) {
                // Delete existing menu options
                await client.query('DELETE FROM ivr_menu_options WHERE ivr_flow_id = $1', [id]);

                // Create new menu options
                if (menu_options && menu_options.length > 0) {
                    for (const option of menu_options) {
                        const optionSql = `
                            INSERT INTO ivr_menu_options (
                                ivr_flow_id, key_press, label, action, target, order_index
                            )
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `;

                        await client.query(optionSql, [
                            id,
                            option.key_press,
                            option.label,
                            option.action,
                            option.target,
                            option.order_index || 0
                        ]);
                    }
                }
            }

            return flow;
        });
    }

    // Delete IVR flow
    static async delete(id) {
        return await transaction(async (client) => {
            // Delete menu options first
            await client.query('DELETE FROM ivr_menu_options WHERE ivr_flow_id = $1', [id]);

            // Delete the IVR flow
            const sql = 'DELETE FROM ivr_flows WHERE id = $1 RETURNING *';
            const result = await client.query(sql, [id]);
            return result.rows[0];
        });
    }

    // Duplicate IVR flow
    static async duplicate(id, newName = null) {
        const originalFlow = await this.findById(id);
        if (!originalFlow) {
            throw new Error('IVR flow not found');
        }

        const flowData = {
            company_id: originalFlow.company_id,
            name: newName || `${originalFlow.name} (Copy)`,
            description: originalFlow.description,
            status: 'draft',
            welcome_message: originalFlow.welcome_message,
            hold_music: originalFlow.hold_music,
            hold_video: originalFlow.hold_video,
            estimated_wait_time: originalFlow.estimated_wait_time,
            created_by: originalFlow.created_by,
            menu_options: originalFlow.menu_options
        };

        return await this.create(flowData);
    }

    // Get active IVR flows for a company
    static async getActiveFlows(companyId) {
        return await this.findByCompany(companyId, 'active');
    }

    // Get IVR flow usage statistics
    static async getUsageStats(id, startDate = null, endDate = null) {
        let sql = `
            SELECT 
                COUNT(*) as total_calls,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_calls,
                COUNT(CASE WHEN c.status = 'missed' THEN 1 END) as missed_calls,
                AVG(CASE WHEN c.status = 'completed' THEN c.call_duration_seconds END) as avg_duration,
                AVG(CASE WHEN c.status = 'completed' THEN c.wait_time_seconds END) as avg_wait_time
            FROM calls c
            WHERE c.ivr_flow_id = $1
        `;
        const params = [id];

        if (startDate && endDate) {
            sql += ` AND DATE(c.created_at) BETWEEN $2 AND $3`;
            params.push(startDate, endDate);
        }

        const stats = await getRow(sql, params);
        return {
            total_calls: parseInt(stats?.total_calls || 0),
            completed_calls: parseInt(stats?.completed_calls || 0),
            missed_calls: parseInt(stats?.missed_calls || 0),
            avg_duration: parseInt(stats?.avg_duration || 0),
            avg_wait_time: parseInt(stats?.avg_wait_time || 0)
        };
    }

    // Get IVR flow by key press
    static async getByKeyPress(flowId, keyPress) {
        const sql = `
            SELECT * FROM ivr_menu_options 
            WHERE ivr_flow_id = $1 AND key_press = $2
        `;
        return await getRow(sql, [flowId, keyPress]);
    }

    // Validate IVR flow configuration
    static async validateFlow(id) {
        const flow = await this.findById(id);
        if (!flow) {
            return { valid: false, errors: ['IVR flow not found'] };
        }

        const errors = [];

        // Check required fields
        if (!flow.welcome_message || flow.welcome_message.trim() === '') {
            errors.push('Welcome message is required');
        }

        // Check menu options
        if (!flow.menu_options || flow.menu_options.length === 0) {
            errors.push('At least one menu option is required');
        } else {
            const keyPresses = new Set();
            for (const option of flow.menu_options) {
                if (!option.key_press || option.key_press.trim() === '') {
                    errors.push('All menu options must have a key press');
                } else if (keyPresses.has(option.key_press)) {
                    errors.push(`Duplicate key press: ${option.key_press}`);
                } else {
                    keyPresses.add(option.key_press);
                }

                if (!option.label || option.label.trim() === '') {
                    errors.push('All menu options must have a label');
                }

                if (!option.action || !['route', 'message', 'callback'].includes(option.action)) {
                    errors.push('Invalid action for menu option');
                }

                if (!option.target || option.target.trim() === '') {
                    errors.push('All menu options must have a target');
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Activate IVR flow
    static async activate(id) {
        const validation = await this.validateFlow(id);
        if (!validation.valid) {
            throw new Error(`Cannot activate IVR flow: ${validation.errors.join(', ')}`);
        }

        const sql = `
            UPDATE ivr_flows 
            SET status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Deactivate IVR flow
    static async deactivate(id) {
        const sql = `
            UPDATE ivr_flows 
            SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await query(sql, [id]);
        return result.rows[0];
    }

    // Search IVR flows
    static async search(searchTerm, companyId = null) {
        let sql = `
            SELECT 
                ivf.*,
                c.name as company_name,
                c.domain as company_domain
            FROM ivr_flows ivf
            LEFT JOIN companies c ON ivf.company_id = c.id
            WHERE (ivf.name ILIKE $1 OR ivf.description ILIKE $1)
        `;
        const params = [`%${searchTerm}%`];

        if (companyId) {
            sql += ` AND ivf.company_id = $2`;
            params.push(companyId);
        }

        sql += ` ORDER BY ivf.name LIMIT 10`;

        return await getRows(sql, params);
    }

    // Get IVR flow templates
    static async getTemplates() {
        return [
            {
                name: 'Basic Support',
                description: 'Simple support line with basic routing',
                welcome_message: 'Welcome to our support line. Please press 1 for technical support, 2 for billing, or 0 to speak with an operator.',
                menu_options: [
                    { key_press: '1', label: 'Technical Support', action: 'route', target: 'technical_support', order_index: 1 },
                    { key_press: '2', label: 'Billing', action: 'route', target: 'billing', order_index: 2 },
                    { key_press: '0', label: 'Operator', action: 'route', target: 'operator', order_index: 3 }
                ]
            },
            {
                name: 'Sales & Support',
                description: 'Combined sales and support line',
                welcome_message: 'Welcome! Please press 1 for sales inquiries, 2 for technical support, 3 for billing, or 0 to speak with an operator.',
                menu_options: [
                    { key_press: '1', label: 'Sales', action: 'route', target: 'sales', order_index: 1 },
                    { key_press: '2', label: 'Technical Support', action: 'route', target: 'technical_support', order_index: 2 },
                    { key_press: '3', label: 'Billing', action: 'route', target: 'billing', order_index: 3 },
                    { key_press: '0', label: 'Operator', action: 'route', target: 'operator', order_index: 4 }
                ]
            },
            {
                name: 'Callback Request',
                description: 'IVR flow for requesting callbacks',
                welcome_message: 'Thank you for calling. All our agents are currently busy. Please press 1 to request a callback, or 2 to leave a message.',
                menu_options: [
                    { key_press: '1', label: 'Request Callback', action: 'callback', target: 'callback_request', order_index: 1 },
                    { key_press: '2', label: 'Leave Message', action: 'message', target: 'Please leave your message after the beep.', order_index: 2 }
                ]
            }
        ];
    }
}

module.exports = IvrFlow;
