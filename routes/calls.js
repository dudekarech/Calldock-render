const express = require('express');
const { authenticateToken, requireAgentOrAdmin, requireCompanyAccess } = require('../middleware/auth');
const { validateCall, validateCallUpdate, validateId, validateCompanyId, validatePagination, validateDateRange } = require('../middleware/validation');
const Call = require('../database/models/Call');
const IvrFlow = require('../database/models/IvrFlow');

const router = express.Router();

// Get all calls for a company
router.get('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, validatePagination, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, startDate, endDate } = req.query;

        const filters = { companyId };
        if (status) filters.status = status;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const calls = await Call.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            calls: calls.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: calls.total,
                pages: Math.ceil(calls.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get calls error:', error);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// Get all calls (admin only)
router.get('/', authenticateToken, requireAgentOrAdmin, validatePagination, validateDateRange, async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, companyId, startDate, endDate } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (companyId) filters.companyId = companyId;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const calls = await Call.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            calls: calls.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: calls.total,
                pages: Math.ceil(calls.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get all calls error:', error);
        res.status(500).json({ error: 'Failed to fetch calls' });
    }
});

// Get call by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const call = await Call.findById(id);

        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== call.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        // Get call events
        const events = await Call.getEvents(id);

        res.json({
            call: { ...call, events }
        });

    } catch (error) {
        console.error('Get call error:', error);
        res.status(500).json({ error: 'Failed to fetch call' });
    }
});

// Create new call
router.post('/', authenticateToken, validateCall, async (req, res) => {
    try {
        const callData = req.body;
        
        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            callData.companyId = req.user.companyId;
        }

        // If IVR flow is specified, validate it exists and belongs to the company
        if (callData.ivrFlowId) {
            const ivrFlow = await IvrFlow.findById(callData.ivrFlowId);
            if (!ivrFlow || ivrFlow.companyId !== callData.companyId) {
                return res.status(400).json({ error: 'Invalid IVR flow' });
            }
        }

        const call = await Call.create(callData);

        // Add to queue if status is 'queued'
        if (call.status === 'queued') {
            await Call.addToQueue(call.id);
        }

        res.status(201).json({
            message: 'Call created successfully',
            call
        });

    } catch (error) {
        console.error('Create call error:', error);
        res.status(500).json({ error: 'Failed to create call' });
    }
});

// Update call
router.put('/:id', authenticateToken, validateId, validateCallUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        // Ensure companyId cannot be changed
        delete updateData.companyId;

        const updatedCall = await Call.updateStatus(id, updateData);

        // Handle queue operations
        if (updateData.status === 'queued' && existingCall.status !== 'queued') {
            await Call.addToQueue(id);
        } else if (existingCall.status === 'queued' && updateData.status !== 'queued') {
            // Remove from queue if status changed from queued
            // This would be handled by the Call model
        }

        res.json({
            message: 'Call updated successfully',
            call: updatedCall
        });

    } catch (error) {
        console.error('Update call error:', error);
        res.status(500).json({ error: 'Failed to update call' });
    }
});

// Delete call
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        await Call.delete(id);

        res.json({ message: 'Call deleted successfully' });

    } catch (error) {
        console.error('Delete call error:', error);
        res.status(500).json({ error: 'Failed to delete call' });
    }
});

// Get next call from queue
router.get('/queue/next', authenticateToken, requireAgentOrAdmin, async (req, res) => {
    try {
        const { companyId, agentId } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const nextCall = await Call.getNextFromQueue(companyId, agentId);

        if (!nextCall) {
            return res.json({ message: 'No calls in queue' });
        }

        res.json({ call: nextCall });

    } catch (error) {
        console.error('Get next call error:', error);
        res.status(500).json({ error: 'Failed to get next call from queue' });
    }
});

// Add call to queue
router.post('/:id/queue', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        await Call.addToQueue(id);

        res.json({ message: 'Call added to queue successfully' });

    } catch (error) {
        console.error('Add call to queue error:', error);
        res.status(500).json({ error: 'Failed to add call to queue' });
    }
});

// Update call queue position
router.put('/:id/queue-position', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { position } = req.body;

        if (typeof position !== 'number' || position < 0) {
            return res.status(400).json({ error: 'Valid position is required' });
        }

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        await Call.updateQueuePosition(id, position);

        res.json({ message: 'Queue position updated successfully' });

    } catch (error) {
        console.error('Update queue position error:', error);
        res.status(500).json({ error: 'Failed to update queue position' });
    }
});

// Assign call to agent
router.post('/:id/assign', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { agentId } = req.body;

        if (!agentId) {
            return res.status(400).json({ error: 'Agent ID is required' });
        }

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        const updatedCall = await Call.assignToAgent(id, agentId);

        res.json({
            message: 'Call assigned to agent successfully',
            call: updatedCall
        });

    } catch (error) {
        console.error('Assign call error:', error);
        res.status(500).json({ error: 'Failed to assign call to agent' });
    }
});

// Get call events
router.get('/:id/events', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        const events = await Call.getEvents(id);

        res.json({ events });

    } catch (error) {
        console.error('Get call events error:', error);
        res.status(500).json({ error: 'Failed to fetch call events' });
    }
});

// Add call event
router.post('/:id/events', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, data, timestamp } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Event type is required' });
        }

        // Get existing call to check permissions
        const existingCall = await Call.findById(id);
        if (!existingCall) {
            return res.status(404).json({ error: 'Call not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCall.companyId) {
            return res.status(403).json({ error: 'Access denied to this call' });
        }

        const event = await Call.addEvent(id, {
            type,
            data: data || {},
            timestamp: timestamp || new Date(),
            userId: req.user.id
        });

        res.status(201).json({
            message: 'Call event added successfully',
            event
        });

    } catch (error) {
        console.error('Add call event error:', error);
        res.status(500).json({ error: 'Failed to add call event' });
    }
});

// Get call statistics
router.get('/stats/overview', authenticateToken, validateDateRange, async (req, res) => {
    try {
        const { companyId, startDate, endDate } = req.query;

        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            companyId = req.user.companyId;
        }

        const stats = await Call.getStats({
            companyId,
            startDate,
            endDate
        });

        res.json({ stats });

    } catch (error) {
        console.error('Get call stats error:', error);
        res.status(500).json({ error: 'Failed to fetch call statistics' });
    }
});

// Get calls by date range
router.get('/stats/date-range', authenticateToken, validateDateRange, async (req, res) => {
    try {
        const { companyId, startDate, endDate, groupBy = 'day' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required' });
        }

        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            companyId = req.user.companyId;
        }

        const calls = await Call.getByDateRange(companyId, startDate, endDate, groupBy);

        res.json({ calls });

    } catch (error) {
        console.error('Get calls by date range error:', error);
        res.status(500).json({ error: 'Failed to fetch calls by date range' });
    }
});

// Get agent call history
router.get('/agent/:agentId/history', authenticateToken, validatePagination, validateDateRange, async (req, res) => {
    try {
        const { agentId } = req.params;
        const { page = 1, limit = 20, startDate, endDate } = req.query;

        const calls = await Call.getAgentHistory(agentId, {
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate
        });

        res.json({
            calls: calls.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: calls.total,
                pages: Math.ceil(calls.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get agent call history error:', error);
        res.status(500).json({ error: 'Failed to fetch agent call history' });
    }
});

// Get queue status
router.get('/queue/status', authenticateToken, async (req, res) => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const queueStatus = await Call.getQueueStatus(companyId);

        res.json({ queueStatus });

    } catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({ error: 'Failed to fetch queue status' });
    }
});

// Search calls
router.get('/search/query', authenticateToken, validatePagination, async (req, res) => {
    try {
        const { q, page = 1, limit = 20, companyId } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            companyId = req.user.companyId;
        }

        const results = await Call.search(q, {
            page: parseInt(page),
            limit: parseInt(limit),
            companyId
        });

        res.json({
            calls: results.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: results.total,
                pages: Math.ceil(results.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Search calls error:', error);
        res.status(500).json({ error: 'Failed to search calls' });
    }
});

// Cleanup old calls
router.post('/cleanup', authenticateToken, requireAgentOrAdmin, async (req, res) => {
    try {
        const { days = 90 } = req.body;

        if (typeof days !== 'number' || days < 1) {
            return res.status(400).json({ error: 'Valid days count is required' });
        }

        const result = await Call.cleanupOldCalls(days);

        res.json({
            message: 'Call cleanup completed successfully',
            deletedCount: result.deletedCount
        });

    } catch (error) {
        console.error('Call cleanup error:', error);
        res.status(500).json({ error: 'Failed to cleanup old calls' });
    }
});

module.exports = router;
