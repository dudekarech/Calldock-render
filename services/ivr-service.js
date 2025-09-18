const databaseManager = require('../database/config');

class IVRService {
    constructor() {
        this.activeFlows = new Map();
        this.contentCache = new Map();
        this.routingRules = new Map();
    }

    /**
     * Initialize IVR service
     */
    async initialize() {
        try {
            await this.loadIVRFlows();
            await this.loadRoutingRules();
            await this.loadContentLibrary();
            console.log('✅ IVR Service initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize IVR service:', error);
            // Don't throw error, just log it to prevent app crash
            console.log('⚠️ Continuing without full IVR functionality');
        }
    }

    /**
     * Load all active IVR flows from database
     */
    async loadIVRFlows() {
        try {
            const result = await databaseManager.query(`
                SELECT f.*, c.name as company_name, c.domain as company_domain
                FROM ivr_flows f
                JOIN companies c ON f.company_id = c.id
                WHERE f.status = 'active'
                ORDER BY f.created_at ASC
            `);

            this.activeFlows.clear();
            result.rows.forEach(flow => {
                this.activeFlows.set(flow.id, {
                    ...flow,
                    config: {},
                    nodes: [],
                    connections: [],
                    is_active: flow.status === 'active'
                });
            });

            console.log(`📊 Loaded ${this.activeFlows.size} active IVR flows`);
        } catch (error) {
            console.error('Error loading IVR flows:', error);
            throw error;
        }
    }

    /**
     * Load routing rules from database
     */
    async loadRoutingRules() {
        try {
            // For now, use empty routing rules since the table doesn't exist in main schema
            this.routingRules.clear();
            console.log(`📊 Loaded 0 routing rules (table not available in current schema)`);
        } catch (error) {
            console.error('Error loading routing rules:', error);
            // Don't throw error, just log it
        }
    }

    /**
     * Load content library from database
     */
    async loadContentLibrary() {
        try {
            // For now, use empty content library since the table doesn't exist in main schema
            this.contentCache.clear();
            console.log(`📊 Loaded 0 content items (table not available in current schema)`);
        } catch (error) {
            console.error('Error loading content library:', error);
            // Don't throw error, just log it
        }
    }

    /**
     * Get IVR flow for a specific company and call type
     */
    async getIVRFlow(companyId, callType = 'default') {
        try {
            const flow = Array.from(this.activeFlows.values()).find(f => 
                f.company_id === companyId && 
                (f.call_type === callType || f.call_type === 'default')
            );

            if (!flow) {
                throw new Error(`No IVR flow found for company ${companyId} and type ${callType}`);
            }

            return {
                flowId: flow.id,
                companyId: flow.company_id,
                companyName: flow.company_name,
                flowName: flow.name,
                flowType: flow.flow_type,
                nodes: flow.nodes,
                connections: flow.connections,
                config: flow.config
            };
        } catch (error) {
            console.error('Error getting IVR flow:', error);
            throw error;
        }
    }

    /**
     * Start IVR session for a customer
     */
    async startIVRSession(callId, companyId, customerData = {}) {
        try {
            const flow = await this.getIVRFlow(companyId);
            
            // Create IVR session
            const session = {
                id: `ivr_${callId}`,
                callId,
                companyId,
                flowId: flow.flowId,
                customerData,
                currentNode: flow.nodes[0]?.id || 'start',
                startTime: new Date(),
                interactions: [],
                status: 'active'
            };

            // Store session in database
            await databaseManager.query(`
                INSERT INTO ivr_sessions (
                    id, call_id, company_id, flow_id, customer_data, 
                    current_node, start_time, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                session.id, session.callId, session.companyId, 
                session.flowId, JSON.stringify(session.customerData),
                session.currentNode, session.startTime, session.status
            ]);

            console.log(`🎬 Started IVR session ${session.id} for call ${callId}`);
            return session;
        } catch (error) {
            console.error('Error starting IVR session:', error);
            throw error;
        }
    }

    /**
     * Get next IVR node based on current state and customer input
     */
    async getNextNode(sessionId, customerInput = null) {
        try {
            const session = await this.getSession(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            const flow = this.activeFlows.get(session.flowId);
            if (!flow) {
                throw new Error(`Flow ${session.flowId} not found`);
            }

            const currentNode = flow.nodes.find(n => n.id === session.currentNode);
            if (!currentNode) {
                throw new Error(`Node ${session.currentNode} not found`);
            }

            // Determine next node based on node type and customer input
            let nextNode = null;

            switch (currentNode.type) {
                case 'start':
                    nextNode = this.findNodeById(flow, currentNode.next_node_id);
                    break;

                case 'audio_prompt':
                    nextNode = this.findNodeById(flow, currentNode.next_node_id);
                    break;

                case 'video_content':
                    nextNode = this.findNodeById(flow, currentNode.next_node_id);
                    break;

                case 'menu':
                    nextNode = this.handleMenuSelection(flow, currentNode, customerInput);
                    break;

                case 'condition':
                    nextNode = this.evaluateCondition(flow, currentNode, session.customerData);
                    break;

                case 'agent_transfer':
                    nextNode = null; // End IVR, transfer to agent
                    break;

                default:
                    nextNode = this.findNodeById(flow, currentNode.next_node_id);
            }

            // Update session with new node
            if (nextNode) {
                await this.updateSessionNode(sessionId, nextNode.id);
                session.currentNode = nextNode.id;
            }

            // Log interaction
            await this.logInteraction(sessionId, {
                fromNode: currentNode.id,
                toNode: nextNode?.id || 'agent_transfer',
                input: customerInput,
                timestamp: new Date()
            });

            return {
                currentNode: currentNode,
                nextNode: nextNode,
                isEndOfIVR: !nextNode || nextNode.type === 'agent_transfer'
            };
        } catch (error) {
            console.error('Error getting next node:', error);
            throw error;
        }
    }

    /**
     * Handle menu selection and return appropriate next node
     */
    handleMenuSelection(flow, currentNode, customerInput) {
        if (!customerInput || !currentNode.options) {
            return this.findNodeById(flow, currentNode.default_node_id);
        }

        const selectedOption = currentNode.options.find(opt => 
            opt.value === customerInput || 
            opt.label.toLowerCase().includes(customerInput.toLowerCase())
        );

        if (selectedOption) {
            return this.findNodeById(flow, selectedOption.next_node_id);
        }

        return this.findNodeById(flow, currentNode.default_node_id);
    }

    /**
     * Evaluate conditional logic and return appropriate next node
     */
    evaluateCondition(flow, currentNode, customerData) {
        try {
            const condition = currentNode.condition;
            if (!condition) {
                return this.findNodeById(flow, currentNode.default_node_id);
            }

            let result = false;
            switch (condition.operator) {
                case 'equals':
                    result = customerData[condition.field] === condition.value;
                    break;
                case 'contains':
                    result = String(customerData[condition.field]).includes(condition.value);
                    break;
                case 'greater_than':
                    result = Number(customerData[condition.field]) > Number(condition.value);
                    break;
                case 'less_than':
                    result = Number(customerData[condition.field]) < Number(condition.value);
                    break;
                default:
                    result = false;
            }

            return this.findNodeById(flow, result ? condition.true_node_id : condition.false_node_id);
        } catch (error) {
            console.error('Error evaluating condition:', error);
            return this.findNodeById(flow, currentNode.default_node_id);
        }
    }

    /**
     * Get content for a specific node
     */
    async getNodeContent(nodeId, companyId) {
        try {
            const node = await this.getNode(nodeId);
            if (!node) {
                throw new Error(`Node ${nodeId} not found`);
            }

            let content = null;

            switch (node.type) {
                case 'audio_prompt':
                    content = await this.getAudioContent(node.content_id);
                    break;
                case 'video_content':
                    content = await this.getVideoContent(node.content_id);
                    break;
                case 'menu':
                    content = this.formatMenuContent(node);
                    break;
                default:
                    content = { type: 'text', value: node.text || 'Welcome to our support system.' };
            }

            return {
                nodeId,
                nodeType: node.type,
                content,
                config: node.config || {}
            };
        } catch (error) {
            console.error('Error getting node content:', error);
            throw error;
        }
    }

    /**
     * Get audio content
     */
    async getAudioContent(contentId) {
        try {
            const result = await databaseManager.query(
                'SELECT * FROM ivr_content WHERE id = $1 AND content_type = $2',
                [contentId, 'audio']
            );

            if (result.rows.length === 0) {
                throw new Error(`Audio content ${contentId} not found`);
            }

            const content = result.rows[0];
            return {
                id: content.id,
                type: 'audio',
                url: content.file_url,
                duration: content.duration,
                text: content.text,
                language: content.language
            };
        } catch (error) {
            console.error('Error getting audio content:', error);
            throw error;
        }
    }

    /**
     * Get video content
     */
    async getVideoContent(contentId) {
        try {
            const result = await databaseManager.query(
                'SELECT * FROM ivr_content WHERE id = $1 AND content_type = $2',
                [contentId, 'video']
            );

            if (result.rows.length === 0) {
                throw new Error(`Video content ${contentId} not found`);
            }

            const content = result.rows[0];
            return {
                id: content.id,
                type: 'video',
                url: content.file_url,
                duration: content.duration,
                thumbnail: content.thumbnail_url,
                description: content.description
            };
        } catch (error) {
            console.error('Error getting video content:', error);
            throw error;
        }
    }

    /**
     * Format menu content for display
     */
    formatMenuContent(node) {
        return {
            type: 'menu',
            title: node.title || 'Please select an option:',
            options: node.options || [],
            timeout: node.timeout || 30,
            maxRetries: node.max_retries || 3
        };
    }

    /**
     * Get IVR session by ID
     */
    async getSession(sessionId) {
        try {
            const result = await databaseManager.query(
                'SELECT * FROM ivr_sessions WHERE id = $1',
                [sessionId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const session = result.rows[0];
            return {
                ...session,
                customerData: session.customer_data ? JSON.parse(session.customer_data) : {},
                startTime: new Date(session.start_time)
            };
        } catch (error) {
            console.error('Error getting session:', error);
            throw error;
        }
    }

    /**
     * Update session current node
     */
    async updateSessionNode(sessionId, nodeId) {
        try {
            await databaseManager.query(
                'UPDATE ivr_sessions SET current_node = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [nodeId, sessionId]
            );
        } catch (error) {
            console.error('Error updating session node:', error);
            throw error;
        }
    }

    /**
     * Log IVR interaction
     */
    async logInteraction(sessionId, interaction) {
        try {
            await databaseManager.query(`
                INSERT INTO ivr_interactions (
                    session_id, from_node, to_node, customer_input, timestamp
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                sessionId, interaction.fromNode, interaction.toNode,
                interaction.input, interaction.timestamp
            ]);
        } catch (error) {
            console.error('Error logging interaction:', error);
            // Don't throw error for logging failures
        }
    }

    /**
     * End IVR session
     */
    async endIVRSession(sessionId, reason = 'completed') {
        try {
            await databaseManager.query(
                'UPDATE ivr_sessions SET status = $1, end_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [reason, sessionId]
            );

            console.log(`🏁 Ended IVR session ${sessionId} with reason: ${reason}`);
        } catch (error) {
            console.error('Error ending IVR session:', error);
            throw error;
        }
    }

    /**
     * Get IVR analytics for a company
     */
    async getIVRAnalytics(companyId, timeRange = '7d') {
        try {
            const timeFilter = this.getTimeFilter(timeRange);
            
            const result = await databaseManager.query(`
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN status = 'abandoned' THEN 1 END) as abandoned_sessions,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_session_duration,
                    COUNT(DISTINCT call_id) as unique_calls
                FROM ivr_sessions 
                WHERE company_id = $1 AND start_time >= $2
            `, [companyId, timeFilter]);

            const interactions = await databaseManager.query(`
                SELECT 
                    COUNT(*) as total_interactions,
                    COUNT(DISTINCT session_id) as sessions_with_interactions
                FROM ivr_interactions i
                JOIN ivr_sessions s ON i.session_id = s.id
                WHERE s.company_id = $1 AND i.timestamp >= $2
            `, [companyId, timeFilter]);

            const data = result.rows[0];
            const interactionData = interactions.rows[0];

            return {
                totalSessions: parseInt(data.total_sessions || 0),
                completedSessions: parseInt(data.completed_sessions || 0),
                abandonedSessions: parseInt(data.abandoned_sessions || 0),
                completionRate: data.total_sessions > 0 ? 
                    (data.completed_sessions / data.total_sessions * 100).toFixed(1) : 0,
                avgSessionDuration: Math.round(parseFloat(data.avg_session_duration || 0)),
                uniqueCalls: parseInt(data.unique_calls || 0),
                totalInteractions: parseInt(interactionData.total_interactions || 0),
                avgInteractionsPerSession: data.total_sessions > 0 ? 
                    (interactionData.total_interactions / data.total_sessions).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting IVR analytics:', error);
            throw error;
        }
    }

    /**
     * Get time filter for analytics
     */
    getTimeFilter(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        }
    }

    /**
     * Helper method to find node by ID
     */
    findNodeById(flow, nodeId) {
        if (!nodeId) return null;
        return flow.nodes.find(n => n.id === nodeId) || null;
    }

    /**
     * Helper method to get node by ID
     */
    async getNode(nodeId) {
        try {
            const result = await databaseManager.query(
                'SELECT * FROM ivr_nodes WHERE id = $1',
                [nodeId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const node = result.rows[0];
            return {
                ...node,
                config: node.config ? JSON.parse(node.config) : {},
                options: node.options ? JSON.parse(node.options) : []
            };
        } catch (error) {
            console.error('Error getting node:', error);
            return null;
        }
    }

    /**
     * Health check for IVR service
     */
    async healthCheck() {
        try {
            const flowsCount = this.activeFlows.size;
            const rulesCount = this.routingRules.size;
            const contentCount = Array.from(this.contentCache.values()).reduce((sum, arr) => sum + arr.length, 0);

            return {
                status: 'healthy',
                activeFlows: flowsCount,
                routingRules: rulesCount,
                contentItems: contentCount,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Get all flows for a specific company
     */
    async getCompanyFlows(companyId) {
        try {
            const result = await databaseManager.query(`
                SELECT * FROM ivr_flows 
                WHERE company_id = $1 
                ORDER BY created_at DESC
            `, [companyId]);

            return result.rows.map(flow => ({
                ...flow,
                config: flow.config || {},
                nodes: flow.nodes || [],
                connections: flow.connections || []
            }));
        } catch (error) {
            console.error('Error getting company flows:', error);
            throw error;
        }
    }

    /**
     * Get all flows (for global admin)
     */
    async getAllFlows() {
        try {
            const result = await databaseManager.query(`
                SELECT f.*, c.name as company_name, c.domain as company_domain
                FROM ivr_flows f
                LEFT JOIN companies c ON f.company_id = c.id
                ORDER BY f.created_at DESC
            `);

            return result.rows.map(flow => ({
                ...flow,
                config: flow.config || {},
                nodes: flow.nodes || [],
                connections: flow.connections || []
            }));
        } catch (error) {
            console.error('Error getting all flows:', error);
            throw error;
        }
    }

    /**
     * Get a specific flow by ID
     */
    async getFlowById(flowId) {
        try {
            const result = await databaseManager.query(`
                SELECT f.*, c.name as company_name, c.domain as company_domain
                FROM ivr_flows f
                LEFT JOIN companies c ON f.company_id = c.id
                WHERE f.id = $1
            `, [flowId]);

            if (result.rows.length === 0) {
                return null;
            }

            const flow = result.rows[0];
            return {
                ...flow,
                config: flow.config || {},
                nodes: flow.nodes || [],
                connections: flow.connections || []
            };
        } catch (error) {
            console.error('Error getting flow by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new IVR flow
     */
    async createFlow(flowData) {
        try {
            const { name, description, flow_type, company_id, nodes, connections, config, is_active } = flowData;
            
            const result = await databaseManager.query(`
                INSERT INTO ivr_flows (name, description, flow_type, company_id, nodes, connections, config, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [name, description, flow_type, company_id, JSON.stringify(nodes), JSON.stringify(connections), JSON.stringify(config), is_active]);

            const flow = result.rows[0];
            return {
                ...flow,
                config: flow.config || {},
                nodes: flow.nodes || [],
                connections: flow.connections || []
            };
        } catch (error) {
            console.error('Error creating flow:', error);
            throw error;
        }
    }

    /**
     * Update an existing IVR flow
     */
    async updateFlow(flowId, updates) {
        try {
            const fields = [];
            const values = [];
            let paramCount = 1;

            Object.keys(updates).forEach(key => {
                if (key === 'nodes' || key === 'connections' || key === 'config') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(updates[key]));
                } else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updates[key]);
                }
                paramCount++;
            });

            values.push(flowId);

            const result = await databaseManager.query(`
                UPDATE ivr_flows 
                SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount}
                RETURNING *
            `, values);

            if (result.rows.length === 0) {
                return null;
            }

            const flow = result.rows[0];
            return {
                ...flow,
                config: flow.config || {},
                nodes: flow.nodes || [],
                connections: flow.connections || []
            };
        } catch (error) {
            console.error('Error updating flow:', error);
            throw error;
        }
    }

    /**
     * Delete an IVR flow
     */
    async deleteFlow(flowId) {
        try {
            const result = await databaseManager.query(`
                DELETE FROM ivr_flows 
                WHERE id = $1
                RETURNING *
            `, [flowId]);

            return result.rows.length > 0;
        } catch (error) {
            console.error('Error deleting flow:', error);
            throw error;
        }
    }

    /**
     * Get routing rules for a company
     */
    async getRoutingRules(companyId) {
        try {
            const result = await databaseManager.query(`
                SELECT * FROM ivr_routing_rules 
                WHERE company_id = $1 
                ORDER BY priority DESC, created_at ASC
            `, [companyId]);

            return result.rows;
        } catch (error) {
            console.error('Error getting routing rules:', error);
            throw error;
        }
    }

    /**
     * Get IVR analytics for a company
     */
    async getIVRAnalytics(companyId, timeFilter = '7d') {
        try {
            // This would typically query analytics tables
            // For now, return mock data
            return {
                totalCalls: 1250,
                avgWaitTime: '2.5 min',
                satisfactionRate: '94%',
                activeFlows: 3,
                timeFilter: timeFilter
            };
        } catch (error) {
            console.error('Error getting IVR analytics:', error);
            throw error;
        }
    }

    /**
     * Create a preview session for testing flows
     */
    async createPreviewSession(flow) {
        try {
            // Create a temporary session for preview
            const sessionId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            return {
                sessionId,
                flowId: flow.id,
                currentNode: flow.nodes[0]?.id || null,
                customerData: {},
                status: 'active',
                isPreview: true,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error creating preview session:', error);
            throw error;
        }
    }
}

module.exports = IVRService;


