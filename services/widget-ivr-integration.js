const IVRService = require('./ivr-service');
const ContentUploadService = require('./content-upload-service');
const databaseManager = require('../database/config');
const { v4: uuidv4 } = require('uuid');

class WidgetIVRIntegration {
    constructor() {
        this.ivrService = new IVRService();
        this.contentService = new ContentUploadService();
        this.activeSessions = new Map();
        this.sessionTimeouts = new Map();
    }

    /**
     * Initialize the widget-IVR integration
     */
    async initialize() {
        try {
            await this.ivrService.initialize();
            console.log('✅ Widget-IVR Integration initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Widget-IVR Integration:', error);
            throw error;
        }
    }

    /**
     * Start IVR experience from widget
     */
    async startIVRFromWidget(widgetData) {
        try {
            const {
                company_id,
                flow_type = 'default',
                customer_data = {},
                widget_session_id,
                call_id
            } = widgetData;

            // Validate required data
            if (!company_id) {
                throw new Error('Company ID is required');
            }

            // Create IVR session
            const ivrSession = await this.createIVRSession({
                company_id,
                flow_type,
                customer_data,
                widget_session_id,
                call_id
            });

            // Get initial flow node
            const initialNode = await this.getInitialFlowNode(company_id, flow_type);
            
            // Start session tracking
            this.trackSession(ivrSession.id, {
                ...ivrSession,
                current_node: initialNode,
                start_time: new Date(),
                widget_session_id,
                call_id
            });

            return {
                success: true,
                session_id: ivrSession.id,
                initial_node: initialNode,
                flow_type,
                company_id
            };
        } catch (error) {
            console.error('Error starting IVR from widget:', error);
            throw error;
        }
    }

    /**
     * Create a new IVR session
     */
    async createIVRSession(sessionData) {
        try {
            const sessionId = uuidv4();
            const now = new Date();

            const query = `
                INSERT INTO ivr_sessions (
                    id, company_id, flow_type, customer_data, widget_session_id, 
                    call_id, status, current_node, start_time, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `;

            const values = [
                sessionId,
                sessionData.company_id,
                sessionData.flow_type,
                JSON.stringify(sessionData.customer_data),
                sessionData.widget_session_id || null,
                sessionData.call_id || null,
                'active',
                null,
                now,
                now,
                now
            ];

            const result = await databaseManager.query(query, values);
            return result.rows[0];
        } catch (error) {
            console.error('Error creating IVR session:', error);
            throw error;
        }
    }

    /**
     * Get initial flow node for company and flow type
     */
    async getInitialFlowNode(companyId, flowType) {
        try {
            // Get company's active IVR flow
            const flows = await this.ivrService.getCompanyFlows(companyId);
            const activeFlow = flows.find(f => f.flow_type === flowType && f.is_active);
            
            if (!activeFlow) {
                // Return default welcome node
                return {
                    id: 'welcome',
                    type: 'audio',
                    content: {
                        message: 'Welcome to our support system. Please wait while we connect you to an agent.',
                        audio_url: null,
                        video_url: null
                    },
                    next_nodes: ['menu', 'transfer'],
                    config: {
                        timeout: 10000,
                        retry_count: 3
                    }
                };
            }

            // Get first node from flow
            const nodes = activeFlow.nodes || [];
            if (nodes.length > 0) {
                return nodes[0];
            }

            // Fallback to default node
            return this.getDefaultNode();
        } catch (error) {
            console.error('Error getting initial flow node:', error);
            return this.getDefaultNode();
        }
    }

    /**
     * Get default IVR node
     */
    getDefaultNode() {
        return {
            id: 'default',
            type: 'audio',
            content: {
                message: 'Thank you for calling. Please wait while we assist you.',
                audio_url: null,
                video_url: null
            },
            next_nodes: ['transfer'],
            config: {
                timeout: 5000,
                retry_count: 1
            }
        };
    }

    /**
     * Process user interaction and get next node
     */
    async processUserInteraction(sessionId, userInput) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found or expired');
            }

            // Log interaction
            await this.logInteraction(sessionId, userInput);

            // Get next node based on current node and user input
            const nextNode = await this.getNextNode(session.current_node, userInput, session.company_id);
            
            // Update session
            session.current_node = nextNode;
            session.last_interaction = new Date();
            
            // Update database
            await this.updateSessionNode(sessionId, nextNode.id);

            return {
                success: true,
                node: nextNode,
                session_status: 'active'
            };
        } catch (error) {
            console.error('Error processing user interaction:', error);
            throw error;
        }
    }

    /**
     * Get next node in flow
     */
    async getNextNode(currentNode, userInput, companyId) {
        try {
            // If current node has next_nodes, determine which one to go to
            if (currentNode.next_nodes && currentNode.next_nodes.length > 0) {
                // Simple logic - can be enhanced with routing rules
                if (userInput === 'menu' || userInput === '1') {
                    return await this.getMenuNode(companyId);
                } else if (userInput === 'transfer' || userInput === '2') {
                    return await this.getTransferNode(companyId);
                } else {
                    // Default to first next node
                    return await this.getNodeById(currentNode.next_nodes[0], companyId);
                }
            }

            // If no next nodes, try to get from flow
            const flows = await this.ivrService.getCompanyFlows(companyId);
            const activeFlow = flows.find(f => f.is_active);
            
            if (activeFlow && activeFlow.connections) {
                // Find connection from current node
                const connection = activeFlow.connections.find(c => c.from === currentNode.id);
                if (connection) {
                    return await this.getNodeById(connection.to, companyId);
                }
            }

            // Fallback to transfer node
            return await this.getTransferNode(companyId);
        } catch (error) {
            console.error('Error getting next node:', error);
            return this.getDefaultNode();
        }
    }

    /**
     * Get specific node by ID
     */
    async getNodeById(nodeId, companyId) {
        try {
            // Try to get from flow first
            const flows = await this.ivrService.getCompanyFlows(companyId);
            const activeFlow = flows.find(f => f.is_active);
            
            if (activeFlow && activeFlow.nodes) {
                const node = activeFlow.nodes.find(n => n.id === nodeId);
                if (node) return node;
            }

            // Return predefined nodes
            const predefinedNodes = {
                'menu': this.getMenuNode(companyId),
                'transfer': this.getTransferNode(companyId),
                'welcome': this.getWelcomeNode(companyId)
            };

            return predefinedNodes[nodeId] || this.getDefaultNode();
        } catch (error) {
            console.error('Error getting node by ID:', error);
            return this.getDefaultNode();
        }
    }

    /**
     * Get menu node
     */
    async getMenuNode(companyId) {
        return {
            id: 'menu',
            type: 'menu',
            content: {
                message: 'Please select an option: Press 1 for general support, Press 2 for technical support, Press 3 for billing, Press 4 to speak with an agent.',
                options: [
                    { key: '1', label: 'General Support', action: 'general_support' },
                    { key: '2', label: 'Technical Support', action: 'technical_support' },
                    { key: '3', label: 'Billing', action: 'billing' },
                    { key: '4', label: 'Speak with Agent', action: 'transfer' }
                ]
            },
            next_nodes: ['general_support', 'technical_support', 'billing', 'transfer'],
            config: {
                timeout: 15000,
                retry_count: 2
            }
        };
    }

    /**
     * Get transfer node
     */
    async getTransferNode(companyId) {
        return {
            id: 'transfer',
            type: 'transfer',
            content: {
                message: 'Connecting you to an agent. Please wait.',
                transfer_type: 'agent',
                department: 'general'
            },
            next_nodes: [],
            config: {
                timeout: 30000,
                retry_count: 1
            }
        };
    }

    /**
     * Get welcome node
     */
    async getWelcomeNode(companyId) {
        return {
            id: 'welcome',
            type: 'audio',
            content: {
                message: 'Welcome to our support system. We appreciate your patience.',
                audio_url: null,
                video_url: null
            },
            next_nodes: ['menu'],
            config: {
                timeout: 8000,
                retry_count: 2
            }
        };
    }

    /**
     * Get content for node
     */
    async getNodeContent(node, companyId) {
        try {
            if (!node || !node.content) {
                return null;
            }

            const content = { ...node.content };

            // If node has content_id, fetch from content library
            if (node.content_id) {
                const mediaContent = await this.contentService.getContentById(node.content_id, companyId);
                if (mediaContent) {
                    content.audio_url = mediaContent.type === 'audio' ? mediaContent.url : null;
                    content.video_url = mediaContent.type === 'video' ? mediaContent.url : null;
                    content.image_url = mediaContent.type === 'image' ? mediaContent.url : null;
                }
            }

            return content;
        } catch (error) {
            console.error('Error getting node content:', error);
            return node.content || null;
        }
    }

    /**
     * Track active session
     */
    trackSession(sessionId, sessionData) {
        this.activeSessions.set(sessionId, sessionData);
        
        // Set session timeout (30 minutes)
        const timeout = setTimeout(() => {
            this.expireSession(sessionId);
        }, 30 * 60 * 1000);
        
        this.sessionTimeouts.set(sessionId, timeout);
    }

    /**
     * Expire session
     */
    async expireSession(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                // Update database
                await this.updateSessionStatus(sessionId, 'expired');
                
                // Clean up
                this.activeSessions.delete(sessionId);
                const timeout = this.sessionTimeouts.get(sessionId);
                if (timeout) {
                    clearTimeout(timeout);
                    this.sessionTimeouts.delete(sessionId);
                }
                
                console.log(`Session ${sessionId} expired`);
            }
        } catch (error) {
            console.error('Error expiring session:', error);
        }
    }

    /**
     * End IVR session
     */
    async endIVRSession(sessionId, reason = 'completed') {
        try {
            const session = this.activeSessions.get(sessionId);
            if (session) {
                // Update database
                await this.updateSessionStatus(sessionId, 'completed', reason);
                
                // Clean up
                this.activeSessions.delete(sessionId);
                const timeout = this.sessionTimeouts.get(sessionId);
                if (timeout) {
                    clearTimeout(timeout);
                    this.sessionTimeouts.delete(sessionId);
                }
                
                return { success: true, message: 'Session ended successfully' };
            }
            
            return { success: false, message: 'Session not found' };
        } catch (error) {
            console.error('Error ending IVR session:', error);
            throw error;
        }
    }

    /**
     * Update session node in database
     */
    async updateSessionNode(sessionId, nodeId) {
        try {
            const query = `
                UPDATE ivr_sessions 
                SET current_node = $1, updated_at = $2
                WHERE id = $3
            `;
            
            await databaseManager.query(query, [nodeId, new Date(), sessionId]);
        } catch (error) {
            console.error('Error updating session node:', error);
        }
    }

    /**
     * Update session status in database
     */
    async updateSessionStatus(sessionId, status, reason = null) {
        try {
            const query = `
                UPDATE ivr_sessions 
                SET status = $1, end_reason = $2, end_time = $3, updated_at = $4
                WHERE id = $5
            `;
            
            await databaseManager.query(query, [status, reason, new Date(), new Date(), sessionId]);
        } catch (error) {
            console.error('Error updating session status:', error);
        }
    }

    /**
     * Log user interaction
     */
    async logInteraction(sessionId, userInput) {
        try {
            const query = `
                INSERT INTO ivr_interactions (
                    id, session_id, user_input, timestamp, created_at
                ) VALUES ($1, $2, $3, $4, $5)
            `;
            
            const values = [
                uuidv4(),
                sessionId,
                userInput,
                new Date(),
                new Date()
            ];
            
            await databaseManager.query(query, values);
        } catch (error) {
            console.error('Error logging interaction:', error);
        }
    }

    /**
     * Get session analytics
     */
    async getSessionAnalytics(companyId, timeFilter = '7d') {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_sessions,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
                    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_sessions,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time))) as avg_duration,
                    COUNT(DISTINCT DATE(created_at)) as active_days
                FROM ivr_sessions 
                WHERE company_id = $1 
                AND created_at >= $2
            `;
            
            const timeRange = this.getTimeRange(timeFilter);
            const result = await databaseManager.query(query, [companyId, timeRange]);
            
            return result.rows[0] || {};
        } catch (error) {
            console.error('Error getting session analytics:', error);
            return {};
        }
    }

    /**
     * Get time range for analytics
     */
    getTimeRange(timeFilter) {
        const now = new Date();
        switch (timeFilter) {
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
     * Get active sessions count
     */
    getActiveSessionsCount(companyId) {
        let count = 0;
        for (const [sessionId, session] of this.activeSessions) {
            if (session.company_id === companyId && session.status === 'active') {
                count++;
            }
        }
        return count;
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const activeSessions = this.activeSessions.size;
            const databaseHealth = await databaseManager.healthCheck();
            
            return {
                status: 'healthy',
                active_sessions: activeSessions,
                database: databaseHealth,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = WidgetIVRIntegration;










