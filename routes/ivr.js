const express = require('express');
const router = express.Router();
const IVRService = require('../services/ivr-service');
const ContentUploadService = require('../services/content-upload-service');
const { authenticateToken, authenticateAdmin, authenticateGlobalAdmin } = require('../middleware/auth');

const ivrService = new IVRService();
const contentUploadService = new ContentUploadService();

// Initialize IVR service after database connection
setTimeout(async () => {
    try {
        await ivrService.initialize();
        console.log('✅ IVR service initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize IVR service:', error);
    }
}, 2000); // Wait 2 seconds for database connection

// ========================================
// IVR FLOW MANAGEMENT
// ========================================

/**
 * @route GET /api/ivr/flows
 * @desc Get all IVR flows for a company or all flows for global admin
 * @access Private (Company Admin or Global Admin)
 */
router.get('/flows', authenticateAdmin, async (req, res) => {
    try {
        let companyId = req.user.company_id;
        
        // For global admin, allow querying all flows or specific company
        const isGlobalAdmin = req.user.is_global_admin || req.user.role === 'superadmin';
        if (isGlobalAdmin && req.query.company_id) {
            companyId = req.query.company_id;
        } else if (isGlobalAdmin && req.query.global_admin === 'true') {
            // Global admin wants to see all flows
            companyId = null;
        }
        
        if (!companyId && !isGlobalAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Company ID is required' 
            });
        }

        const flows = companyId ? 
            await ivrService.getCompanyFlows(companyId) : 
            await ivrService.getAllFlows();
            
        res.json({ 
            success: true, 
            data: flows 
        });
    } catch (error) {
        console.error('Error getting IVR flows:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR flows',
            error: error.message 
        });
    }
});

/**
 * @route POST /api/ivr/flows
 * @desc Create a new IVR flow
 * @access Private (Company Admin)
 */
router.post('/flows', authenticateAdmin, async (req, res) => {
    try {
        const { name, description, flow_type, nodes, connections, config } = req.body;
        const companyId = req.user.company_id;

        if (!name || !flow_type) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name and flow type are required' 
            });
        }

        const flow = await ivrService.createFlow({
            name,
            description,
            flow_type,
            company_id: companyId,
            nodes: nodes || [],
            connections: connections || [],
            config: config || {},
            is_active: true
        });

        res.status(201).json({ 
            success: true, 
            data: flow,
            message: 'IVR flow created successfully' 
        });
    } catch (error) {
        console.error('Error creating IVR flow:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create IVR flow',
            error: error.message 
        });
    }
});

/**
 * @route PUT /api/ivr/flows/:id
 * @desc Update an existing IVR flow
 * @access Private (Company Admin)
 */
router.put('/flows/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const companyId = req.user.company_id;

        // Verify ownership
        const existingFlow = await ivrService.getFlowById(id);
        if (!existingFlow || existingFlow.company_id !== companyId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Flow not found or access denied' 
            });
        }

        const updatedFlow = await ivrService.updateFlow(id, updates);
        res.json({ 
            success: true, 
            data: updatedFlow,
            message: 'IVR flow updated successfully' 
        });
    } catch (error) {
        console.error('Error updating IVR flow:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update IVR flow',
            error: error.message 
        });
    }
});

/**
 * @route DELETE /api/ivr/flows/:id
 * @desc Delete an IVR flow
 * @access Private (Company Admin)
 */
router.delete('/flows/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        // Verify ownership
        const existingFlow = await ivrService.getFlowById(id);
        if (!existingFlow || existingFlow.company_id !== companyId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Flow not found or access denied' 
            });
        }

        await ivrService.deleteFlow(id);
        res.json({ 
            success: true, 
            message: 'IVR flow deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting IVR flow:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete IVR flow',
            error: error.message 
        });
    }
});

/**
 * @route GET /api/ivr/flows/:id
 * @desc Get a specific IVR flow
 * @access Private (Company Admin)
 */
router.get('/flows/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        const flow = await ivrService.getFlowById(id);
        if (!flow || flow.company_id !== companyId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Flow not found or access denied' 
            });
        }

        res.json({ 
            success: true, 
            data: flow 
        });
    } catch (error) {
        console.error('Error getting IVR flow:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR flow',
            error: error.message 
        });
    }
});

// ========================================
// CONTENT MANAGEMENT
// ========================================

/**
 * @route GET /api/ivr/content
 * @desc Get all content for a company or all content for global admin
 * @access Private (Company Admin or Global Admin)
 */
router.get('/content', authenticateAdmin, async (req, res) => {
    try {
        let companyId = req.user.company_id;
        
        // For global admin, allow querying all content or specific company
        const isGlobalAdmin = req.user.is_global_admin || req.user.role === 'superadmin';
        if (isGlobalAdmin && req.query.company_id) {
            companyId = req.query.company_id;
        } else if (isGlobalAdmin && req.query.global_admin === 'true') {
            // Global admin wants to see all content
            companyId = null;
        }
        
        const filters = {
            type: req.query.type,
            search: req.query.search,
            limit: parseInt(req.query.limit) || 50,
            offset: parseInt(req.query.offset) || 0
        };

        const content = companyId ? 
            await contentUploadService.getCompanyContent(companyId, filters) :
            await contentUploadService.getAllContent(filters);
            
        res.json({ 
            success: true, 
            data: content 
        });
    } catch (error) {
        console.error('Error getting content:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get content',
            error: error.message 
        });
    }
});

/**
 * @route POST /api/ivr/content
 * @desc Upload new content
 * @access Private (Company Admin)
 */
router.post('/content', authenticateAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Use multer middleware for file upload
        contentUploadService.getUploadMiddleware()(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ 
                    success: false, 
                    message: err.message 
                });
            }

            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'No file uploaded' 
                });
            }

            try {
                const result = await contentUploadService.processUploadedFile(req.file, companyId);
                
                // Add URL to the response
                result.data.url = contentUploadService.getContentUrl(result.data.file_path);
                
                res.status(201).json(result);
            } catch (uploadError) {
                console.error('Error processing upload:', uploadError);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to process uploaded file',
                    error: uploadError.message 
                });
            }
        });
    } catch (error) {
        console.error('Error in content upload route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to upload content',
            error: error.message 
        });
    }
});

/**
 * @route PUT /api/ivr/content/:id
 * @desc Update content metadata
 * @access Private (Company Admin)
 */
router.put('/content/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const companyId = req.user.company_id;

        const updatedContent = await contentUploadService.updateContent(id, updates, companyId);
        if (!updatedContent) {
            return res.status(404).json({ 
                success: false, 
                message: 'Content not found or access denied' 
            });
        }

        res.json({ 
            success: true, 
            data: updatedContent,
            message: 'Content updated successfully' 
        });
    } catch (error) {
        console.error('Error updating content:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update content',
            error: error.message 
        });
    }
});

/**
 * @route DELETE /api/ivr/content/:id
 * @desc Delete content
 * @access Private (Company Admin)
 */
router.delete('/content/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        const deletedContent = await contentUploadService.deleteContent(id, companyId);
        if (!deletedContent) {
            return res.status(404).json({ 
                success: false, 
                message: 'Content not found or access denied' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Content deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting content:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete content',
            error: error.message 
        });
    }
});

/**
 * @route GET /api/ivr/content/:id
 * @desc Get specific content
 * @access Private (Company Admin)
 */
router.get('/content/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        const content = await contentUploadService.getContentById(id, companyId);
        if (!content) {
            return res.status(404).json({ 
                success: false, 
                message: 'Content not found or access denied' 
            });
        }

        // Add URL to the response
        content.url = contentUploadService.getContentUrl(content.file_path);

        res.json({ 
            success: true, 
            data: content 
        });
    } catch (error) {
        console.error('Error getting content:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get content',
            error: error.message 
        });
    }
});

// ========================================
// ROUTING RULES
// ========================================

/**
 * @route GET /api/ivr/routing-rules
 * @desc Get routing rules for a company
 * @access Private (Company Admin)
 */
router.get('/routing-rules', authenticateAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const rules = await ivrService.getRoutingRules(companyId);
        res.json({ 
            success: true, 
            data: rules 
        });
    } catch (error) {
        console.error('Error getting routing rules:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get routing rules',
            error: error.message 
        });
    }
});

// ========================================
// IVR SESSIONS
// ========================================

/**
 * @route POST /api/ivr/sessions
 * @desc Start a new IVR session
 * @access Public (Customer)
 */
router.post('/sessions', async (req, res) => {
    try {
        const { customer_data, flow_type, company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Company ID is required' 
            });
        }

        const session = await ivrService.startIVRSession({
            customer_data,
            flow_type: flow_type || 'default',
            company_id
        });

        res.status(201).json({ 
            success: true, 
            data: session,
            message: 'IVR session started successfully' 
        });
    } catch (error) {
        console.error('Error starting IVR session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to start IVR session',
            error: error.message 
        });
    }
});

/**
 * @route GET /api/ivr/sessions/:id
 * @desc Get IVR session details
 * @access Public (Customer)
 */
router.get('/sessions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const session = await ivrService.getSession(id);
        
        if (!session) {
            return res.status(404).json({ 
                success: false, 
                message: 'Session not found' 
            });
        }

        res.json({ 
            success: true, 
            data: session 
        });
    } catch (error) {
        console.error('Error getting IVR session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR session',
            error: error.message 
        });
    }
});

/**
 * @route POST /api/ivr/sessions/:id/next
 * @desc Get next node in IVR flow
 * @access Public (Customer)
 */
router.post('/sessions/:id/next', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_input, node_id } = req.body;

        const nextNode = await ivrService.getNextNode(id, user_input, node_id);
        res.json({ 
            success: true, 
            data: nextNode 
        });
    } catch (error) {
        console.error('Error getting next node:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get next node',
            error: error.message 
        });
    }
});

/**
 * @route PUT /api/ivr/sessions/:id/end
 * @desc End IVR session
 * @access Public (Customer)
 */
router.put('/sessions/:id/end', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, final_node } = req.body;

        await ivrService.endIVRSession(id, reason, final_node);
        res.json({ 
            success: true, 
            message: 'IVR session ended successfully' 
        });
    } catch (error) {
        console.error('Error ending IVR session:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to end IVR session',
            error: error.message 
        });
    }
});

// ========================================
// ANALYTICS
// ========================================

/**
 * @route GET /api/ivr/analytics/:companyId
 * @desc Get IVR analytics for a company
 * @access Private (Company Admin)
 */
router.get('/analytics/:companyId', authenticateAdmin, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { timeFilter } = req.query;

        // Verify company access
        if (req.user.company_id !== companyId && !req.user.is_global_admin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }

        const analytics = await ivrService.getIVRAnalytics(companyId, timeFilter);
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('Error getting IVR analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR analytics',
            error: error.message 
        });
    }
});

// ========================================
// HEALTH & UTILITY
// ========================================

/**
 * @route GET /api/ivr/health
 * @desc Check IVR service health
 * @access Public
 */
router.get('/health', async (req, res) => {
    try {
        const health = await ivrService.healthCheck();
        res.json({ 
            success: true, 
            data: health,
            message: 'IVR service is healthy' 
        });
    } catch (error) {
        console.error('IVR service health check failed:', error);
        res.status(503).json({ 
            success: false, 
            message: 'IVR service is unhealthy',
            error: error.message 
        });
    }
});

/**
 * @route GET /api/ivr/flows/:id/preview
 * @desc Preview IVR flow (for testing)
 * @access Private (Company Admin)
 */
router.get('/flows/:id/preview', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user.company_id;

        const flow = await ivrService.getFlowById(id);
        if (!flow || flow.company_id !== companyId) {
            return res.status(404).json({ 
                success: false, 
                message: 'Flow not found or access denied' 
            });
        }

        // Create a preview session
        const previewSession = await ivrService.createPreviewSession(flow);
        res.json({ 
            success: true, 
            data: previewSession,
            message: 'Flow preview created successfully' 
        });
    } catch (error) {
        console.error('Error creating flow preview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create flow preview',
            error: error.message 
        });
    }
});

// Analytics endpoint
router.get('/analytics', authenticateAdmin, async (req, res) => {
    try {
        const { timeframe = '7d' } = req.query;
        let companyId = req.user.company_id;
        
        // For global admin, allow querying all analytics or specific company
        if (req.user.is_global_admin && req.query.company_id) {
            companyId = req.query.company_id;
        } else if (req.user.is_global_admin && req.query.global_admin === 'true') {
            // Global admin wants to see all analytics
            companyId = null;
        }
        
        const analytics = await ivrService.getIVRAnalytics(companyId, timeframe);
        
        res.json({ 
            success: true, 
            data: analytics 
        });
    } catch (error) {
        console.error('Error getting IVR analytics:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR analytics',
            error: error.message 
        });
    }
});

// Get single flow by ID
router.get('/flows/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const flow = await ivrService.getFlowById(id);
        
        if (!flow) {
            return res.status(404).json({ 
                success: false, 
                message: 'Flow not found' 
            });
        }
        
        res.json({ 
            success: true, 
            data: flow 
        });
    } catch (error) {
        console.error('Error getting IVR flow:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get IVR flow',
            error: error.message 
        });
    }
});

module.exports = router;
