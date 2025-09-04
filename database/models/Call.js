const { query, getRow, getRows, execute, transaction } = require('../config');

class Call {
    // Create a new call
    static async create(callData) {
        const {
            call_id,
            company_id,
            caller_name,
            caller_phone,
            caller_email,
            call_type = 'voice',
            call_reason,
            ivr_flow_id,
            department_id
        } = callData;

        const sql = `
            INSERT INTO calls (
                call_id, company_id, caller_name, caller_phone, caller_email,
                call_type, call_reason, ivr_flow_id, department_id, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'initiated')
            RETURNING *
        `;

        const result = await query(sql, [
            call_id, company_id, caller_name, caller_phone, caller_email,
            call_type, call_reason, ivr_flow_id, department_id
        ]);

        // Add call event
        await this.addEvent(result.rows[0].id, 'initiated', { call_type, call_reason });

        return result.rows[0];
    }

    // Find call by ID
    static async findById(id) {
        const sql = `
            SELECT 
                c.*,
                a.agent_code,
                u.first_name as agent_first_name,
                u.last_name as agent_last_name,
                d.name as department_name,
                d.color as department_color,
                ivf.name as ivr_flow_name
            FROM calls c
            LEFT JOIN agents a ON c.agent_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN ivr_flows ivf ON c.ivr_flow_id = ivf.id
            WHERE c.id = $1
        `;
        return await getRow(sql, [id]);
    }

    // Find call by WebRTC call ID
    static async findByCallId(callId) {
        const sql = `
            SELECT 
                c.*,
                a.agent_code,
                u.first_name as agent_first_name,
                u.last_name as agent_last_name,
                d.name as department_name,
                d.color as department_color,
                ivf.name as ivr_flow_name
            FROM calls c
            LEFT JOIN agents a ON c.agent_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN ivr_flows ivf ON c.ivr_flow_id = ivf.id
            WHERE c.call_id = $1
        `;
        return await getRow(sql, [callId]);
    }

    // Get all calls with pagination and filters
    static async findAll(page = 1, limit = 20, filters = {}) {
        let sql = `
            SELECT 
                c.*,
                a.agent_code,
                u.first_name as agent_first_name,
                u.last_name as agent_last_name,
                d.name as department_name,
                d.color as department_color,
                ivf.name as ivr_flow_name
            FROM calls c
            LEFT JOIN agents a ON c.agent_id = a.id
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN ivr_flows ivf ON c.ivr_flow_id = ivf.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        // Add filters
        if (filters.company_id) {
            paramCount++;
            sql += ` AND c.company_id = $${paramCount}`;
            params.push(filters.company_id);
        }

        if (filters.status) {
            paramCount++;
            sql += ` AND c.status = $${paramCount}`;
            params.push(filters.status);
        }

        if (filters.call_type) {
            paramCount++;
            sql += ` AND c.call_type = $${paramCount}`;
            params.push(filters.call_type);
        }

        if (filters.department_id) {
            paramCount++;
            sql += ` AND c.department_id = $${paramCount}`;
            params.push(filters.department_id);
        }

        if (filters.agent_id) {
            paramCount++;
            sql += ` AND c.agent_id = $${paramCount}`;
            params.push(filters.agent_id);
        }

        if (filters.date_from) {
            paramCount++;
            sql += ` AND DATE(c.created_at) >= $${paramCount}`;
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            paramCount++;
            sql += ` AND DATE(c.created_at) <= $${paramCount}`;
            params.push(filters.date_to);
        }

        if (filters.search) {
            paramCount++;
            sql += ` AND (c.caller_name ILIKE $${paramCount} OR c.caller_phone ILIKE $${paramCount} OR c.caller_email ILIKE $${paramCount})`;
            params.push(`%${filters.search}%`);
        }

        // Add pagination
        const offset = (page - 1) * limit;
        paramCount++;
        sql += ` ORDER BY c.created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        sql += ` OFFSET $${paramCount}`;
        params.push(offset);

        const calls = await getRows(sql, params);

        // Get total count for pagination
        let countSql = 'SELECT COUNT(*) FROM calls c WHERE 1=1';
        const countParams = [];
        paramCount = 0;

        if (filters.company_id) {
            paramCount++;
            countSql += ` AND c.company_id = $${paramCount}`;
            countParams.push(filters.company_id);
        }

        if (filters.status) {
            paramCount++;
            countSql += ` AND c.status = $${paramCount}`;
            countParams.push(filters.status);
        }

        if (filters.call_type) {
            paramCount++;
            countSql += ` AND c.call_type = $${paramCount}`;
            countParams.push(filters.call_type);
        }

        if (filters.department_id) {
            paramCount++;
            countSql += ` AND c.department_id = $${paramCount}`;
            countParams.push(filters.department_id);
        }

        if (filters.agent_id) {
            paramCount++;
            countSql += ` AND c.agent_id = $${paramCount}`;
            countParams.push(filters.agent_id);
        }

        if (filters.date_from) {
            paramCount++;
            countSql += ` AND DATE(c.created_at) >= $${paramCount}`;
            countParams.push(filters.date_from);
        }

        if (filters.date_to) {
            paramCount++;
            countSql += ` AND DATE(c.created_at) <= $${paramCount}`;
            countParams.push(filters.date_to);
        }

        if (filters.search) {
            paramCount++;
            countSql += ` AND (c.caller_name ILIKE $${paramCount} OR c.caller_phone ILIKE $${paramCount} OR c.caller_email ILIKE $${paramCount})`;
            countParams.push(`%${filters.search}%`);
        }

        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0].count);

        return {
            calls,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Update call status
    static async updateStatus(id, status, additionalData = {}) {
        const updates = ['status = $1'];
        const values = [status];
        let paramCount = 1;

        // Add additional fields based on status
        if (status === 'queued') {
            paramCount++;
            updates.push(`queue_position = $${paramCount}`);
            values.push(additionalData.queue_position);
        }

        if (status === 'connected') {
            paramCount++;
            updates.push(`agent_id = $${paramCount}`);
            values.push(additionalData.agent_id);
            paramCount++;
            updates.push(`started_at = CURRENT_TIMESTAMP`);
        }

        if (status === 'completed' || status === 'failed' || status === 'missed') {
            paramCount++;
            updates.push(`ended_at = CURRENT_TIMESTAMP`);
            if (additionalData.call_duration_seconds) {
                paramCount++;
                updates.push(`call_duration_seconds = $${paramCount}`);
                values.push(additionalData.call_duration_seconds);
            }
            if (additionalData.wait_time_seconds) {
                paramCount++;
                updates.push(`wait_time_seconds = $${paramCount}`);
                values.push(additionalData.wait_time_seconds);
            }
        }

        if (additionalData.recording_url) {
            paramCount++;
            updates.push(`recording_url = $${paramCount}`);
            values.push(additionalData.recording_url);
        }

        if (additionalData.notes) {
            paramCount++;
            updates.push(`notes = $${paramCount}`);
            values.push(additionalData.notes);
        }

        paramCount++;
        values.push(id);

        const sql = `
            UPDATE calls 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await query(sql, values);

        // Add call event
        await this.addEvent(id, status, additionalData);

        return result.rows[0];
    }

    // Add call to queue
    static async addToQueue(callId, companyId, departmentId = null, priority = 0) {
        // Get current queue position
        const positionSql = `
            SELECT COALESCE(MAX(queue_position), 0) + 1 as next_position
            FROM call_queue 
            WHERE company_id = $1 AND status = 'waiting'
        `;
        const positionResult = await query(positionSql, [companyId]);
        const queuePosition = positionResult.rows[0].next_position;

        const sql = `
            INSERT INTO call_queue (call_id, company_id, department_id, priority, queue_position, status)
            VALUES ($1, $2, $3, $4, $5, 'waiting')
            RETURNING *
        `;

        const result = await query(sql, [callId, companyId, departmentId, priority, queuePosition]);
        return result.rows[0];
    }

    // Get next call from queue
    static async getNextFromQueue(companyId, departmentId = null) {
        let sql = `
            SELECT 
                cq.*,
                c.caller_name,
                c.caller_phone,
                c.caller_email,
                c.call_type,
                c.call_reason
            FROM call_queue cq
            JOIN calls c ON cq.call_id = c.id
            WHERE cq.company_id = $1 AND cq.status = 'waiting'
        `;
        const params = [companyId];

        if (departmentId) {
            sql += ` AND (cq.department_id = $2 OR cq.department_id IS NULL)`;
            params.push(departmentId);
        }

        sql += ` ORDER BY cq.priority DESC, cq.queue_position ASC LIMIT 1`;

        return await getRow(sql, params);
    }

    // Update queue position
    static async updateQueuePosition(callId, newPosition) {
        const sql = `
            UPDATE call_queue 
            SET queue_position = $1, updated_at = CURRENT_TIMESTAMP
            WHERE call_id = $2
            RETURNING *
        `;
        const result = await query(sql, [newPosition, callId]);
        return result.rows[0];
    }

    // Assign call to agent
    static async assignToAgent(callId, agentId) {
        const sql = `
            UPDATE calls 
            SET agent_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        const result = await query(sql, [agentId, callId]);

        // Update queue status
        await query(`
            UPDATE call_queue 
            SET status = 'assigned', assigned_agent_id = $1, assigned_at = CURRENT_TIMESTAMP
            WHERE call_id = $2
        `, [agentId, callId]);

        // Add event
        await this.addEvent(callId, 'agent_assigned', { agent_id: agentId });

        return result.rows[0];
    }

    // Get call events
    static async getEvents(callId) {
        const sql = `
            SELECT * FROM call_events 
            WHERE call_id = $1 
            ORDER BY timestamp ASC
        `;
        return await getRows(sql, [callId]);
    }

    // Add call event
    static async addEvent(callId, eventType, eventData = {}) {
        const sql = `
            INSERT INTO call_events (call_id, event_type, event_data)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await query(sql, [callId, eventType, JSON.stringify(eventData)]);
        return result.rows[0];
    }

    // Get call statistics
    static async getStats(companyId, filters = {}) {
        let sql = `
            SELECT 
                COUNT(*) as total_calls,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
                COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_calls,
                AVG(CASE WHEN status = 'completed' THEN call_duration_seconds END) as avg_duration,
                AVG(CASE WHEN status = 'completed' THEN wait_time_seconds END) as avg_wait_time,
                SUM(CASE WHEN status = 'completed' THEN call_duration_seconds END) as total_duration
            FROM calls 
            WHERE company_id = $1
        `;
        const params = [companyId];
        let paramCount = 1;

        if (filters.date_from) {
            paramCount++;
            sql += ` AND DATE(created_at) >= $${paramCount}`;
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            paramCount++;
            sql += ` AND DATE(created_at) <= $${paramCount}`;
            params.push(filters.date_to);
        }

        const stats = await getRow(sql, params);
        return {
            total_calls: parseInt(stats?.total_calls || 0),
            completed_calls: parseInt(stats?.completed_calls || 0),
            missed_calls: parseInt(stats?.missed_calls || 0),
            failed_calls: parseInt(stats?.failed_calls || 0),
            avg_duration: parseInt(stats?.avg_duration || 0),
            avg_wait_time: parseInt(stats?.avg_wait_time || 0),
            total_duration: parseInt(stats?.total_duration || 0)
        };
    }

    // Get calls by date range
    static async getByDateRange(companyId, startDate, endDate) {
        const sql = `
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as total_calls,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_calls,
                COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
                AVG(CASE WHEN status = 'completed' THEN call_duration_seconds END) as avg_duration,
                AVG(CASE WHEN status = 'completed' THEN wait_time_seconds END) as avg_wait_time
            FROM calls 
            WHERE company_id = $1 AND DATE(created_at) BETWEEN $2 AND $3
            GROUP BY DATE(created_at)
            ORDER BY date
        `;
        return await getRows(sql, [companyId, startDate, endDate]);
    }

    // Get agent call history
    static async getAgentHistory(agentId, limit = 50) {
        const sql = `
            SELECT 
                c.*,
                d.name as department_name,
                d.color as department_color
            FROM calls c
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE c.agent_id = $1
            ORDER BY c.created_at DESC
            LIMIT $2
        `;
        return await getRows(sql, [agentId, limit]);
    }

    // Search calls
    static async search(searchTerm, companyId) {
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
            AND (c.caller_name ILIKE $2 OR c.caller_phone ILIKE $2 OR c.caller_email ILIKE $2)
            ORDER BY c.created_at DESC
            LIMIT 20
        `;
        return await getRows(sql, [companyId, `%${searchTerm}%`]);
    }

    // Get queue status
    static async getQueueStatus(companyId, departmentId = null) {
        let sql = `
            SELECT 
                COUNT(*) as waiting_calls,
                AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - wait_start_time))) as avg_wait_time,
                MIN(queue_position) as next_position
            FROM call_queue 
            WHERE company_id = $1 AND status = 'waiting'
        `;
        const params = [companyId];

        if (departmentId) {
            sql += ` AND (department_id = $2 OR department_id IS NULL)`;
            params.push(departmentId);
        }

        return await getRow(sql, params);
    }

    // Clean up old calls (for maintenance)
    static async cleanupOldCalls(daysOld = 90) {
        const sql = `
            DELETE FROM calls 
            WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
            AND status IN ('completed', 'failed', 'missed')
        `;
        const result = await query(sql);
        return result.rowCount;
    }
}

module.exports = Call;
