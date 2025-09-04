const express = require('express');
const { authenticateToken, requireAgentOrAdmin, requireCompanyAccess } = require('../middleware/auth');
const { validateAgent, validateAgentUpdate, validateId, validateCompanyId, validatePagination, validateDateRange } = require('../middleware/validation');
const User = require('../database/models/User');
const Company = require('../database/models/Company');

const router = express.Router();

// Get all agents for a company
router.get('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, validatePagination, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', availability, departmentId } = req.query;

        const filters = { companyId, role: 'agent' };
        if (availability) filters.availability = availability;
        if (departmentId) filters.departmentId = departmentId;

        const agents = await User.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            agents: agents.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: agents.total,
                pages: Math.ceil(agents.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get agents error:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// Get all agents (admin only)
router.get('/', authenticateToken, requireAgentOrAdmin, validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', availability, companyId, departmentId } = req.query;

        const filters = { role: 'agent' };
        if (availability) filters.availability = availability;
        if (companyId) filters.companyId = companyId;
        if (departmentId) filters.departmentId = departmentId;

        const agents = await User.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            agents: agents.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: agents.total,
                pages: Math.ceil(agents.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get all agents error:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// Get agent by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const agent = await User.findById(id);

        if (!agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (agent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== agent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        res.json({ agent });

    } catch (error) {
        console.error('Get agent error:', error);
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

// Create new agent
router.post('/', authenticateToken, validateAgent, async (req, res) => {
    try {
        const agentData = req.body;
        
        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            agentData.companyId = req.user.companyId;
        }

        // Check company exists and is active
        const company = await Company.findById(agentData.companyId);
        if (!company || company.status !== 'active') {
            return res.status(400).json({ error: 'Invalid or inactive company' });
        }

        // Set role to agent
        agentData.role = 'agent';

        // Check if user already exists
        const existingUser = await User.findByEmail(agentData.email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const agent = await User.create(agentData);

        res.status(201).json({
            message: 'Agent created successfully',
            agent: {
                id: agent.id,
                email: agent.email,
                firstName: agent.firstName,
                lastName: agent.lastName,
                role: agent.role,
                companyId: agent.companyId,
                isActive: agent.isActive
            }
        });

    } catch (error) {
        console.error('Create agent error:', error);
        res.status(500).json({ error: 'Failed to create agent' });
    }
});

// Update agent
router.put('/:id', authenticateToken, validateId, validateAgentUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Ensure role cannot be changed to non-agent
        if (updateData.role && updateData.role !== 'agent') {
            return res.status(400).json({ error: 'Agent role cannot be changed' });
        }

        // Ensure companyId cannot be changed by non-admin users
        if (req.user.role !== 'admin') {
            delete updateData.companyId;
        }

        const updatedAgent = await User.update(id, updateData);

        res.json({
            message: 'Agent updated successfully',
            agent: updatedAgent
        });

    } catch (error) {
        console.error('Update agent error:', error);
        res.status(500).json({ error: 'Failed to update agent' });
    }
});

// Delete agent
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.user.id === id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        await User.delete(id);

        res.json({ message: 'Agent deleted successfully' });

    } catch (error) {
        console.error('Delete agent error:', error);
        res.status(500).json({ error: 'Failed to delete agent' });
    }
});

// Update agent availability
router.put('/:id/availability', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { availability } = req.body;

        if (!availability || !['available', 'busy', 'away', 'offline'].includes(availability)) {
            return res.status(400).json({ error: 'Valid availability status is required' });
        }

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Agents can only update their own availability
        if (req.user.role !== 'admin' && req.user.id !== id) {
            return res.status(403).json({ error: 'Can only update your own availability' });
        }

        const updatedAgent = await User.update(id, { availability });

        res.json({
            message: 'Agent availability updated successfully',
            agent: updatedAgent
        });

    } catch (error) {
        console.error('Update agent availability error:', error);
        res.status(500).json({ error: 'Failed to update agent availability' });
    }
});

// Get available agents
router.get('/available/list', authenticateToken, async (req, res) => {
    try {
        const { companyId, departmentId, skills } = req.query;

        if (!companyId) {
            return res.status(400).json({ error: 'Company ID is required' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== companyId) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const filters = { 
            companyId, 
            role: 'agent', 
            availability: 'available',
            isActive: true
        };

        if (departmentId) filters.departmentId = departmentId;
        if (skills) filters.skills = skills;

        const agents = await User.findAll({
            filters,
            limit: 100 // Get all available agents
        });

        res.json({ agents: agents.data });

    } catch (error) {
        console.error('Get available agents error:', error);
        res.status(500).json({ error: 'Failed to fetch available agents' });
    }
});

// Get agent performance
router.get('/:id/performance', authenticateToken, validateId, validateDateRange, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Get agent performance data
        const performance = await User.getStats(id, { startDate, endDate });

        res.json({ performance });

    } catch (error) {
        console.error('Get agent performance error:', error);
        res.status(500).json({ error: 'Failed to fetch agent performance' });
    }
});

// Get agent call history
router.get('/:id/calls', authenticateToken, validateId, validatePagination, validateDateRange, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 20, startDate, endDate, status } = req.query;

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Get agent call history
        const calls = await User.getCallHistory(id, {
            page: parseInt(page),
            limit: parseInt(limit),
            startDate,
            endDate,
            status
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

// Get agent schedule
router.get('/:id/schedule', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Get agent schedule
        const schedule = await User.getSchedule(id, { startDate, endDate });

        res.json({ schedule });

    } catch (error) {
        console.error('Get agent schedule error:', error);
        res.status(500).json({ error: 'Failed to fetch agent schedule' });
    }
});

// Update agent schedule
router.put('/:id/schedule', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { schedule } = req.body;

        if (!schedule || !Array.isArray(schedule)) {
            return res.status(400).json({ error: 'Schedule array is required' });
        }

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Update agent schedule
        const updatedAgent = await User.updateSchedule(id, schedule);

        res.json({
            message: 'Agent schedule updated successfully',
            agent: updatedAgent
        });

    } catch (error) {
        console.error('Update agent schedule error:', error);
        res.status(500).json({ error: 'Failed to update agent schedule' });
    }
});

// Get agent skills
router.get('/:id/skills', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        res.json({ skills: existingAgent.skills || [] });

    } catch (error) {
        console.error('Get agent skills error:', error);
        res.status(500).json({ error: 'Failed to fetch agent skills' });
    }
});

// Update agent skills
router.put('/:id/skills', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { skills } = req.body;

        if (!skills || !Array.isArray(skills)) {
            return res.status(400).json({ error: 'Skills array is required' });
        }

        // Get existing agent to check permissions
        const existingAgent = await User.findById(id);
        if (!existingAgent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        if (existingAgent.role !== 'agent') {
            return res.status(400).json({ error: 'User is not an agent' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingAgent.companyId) {
            return res.status(403).json({ error: 'Access denied to this agent' });
        }

        // Update agent skills
        const updatedAgent = await User.update(id, { skills });

        res.json({
            message: 'Agent skills updated successfully',
            agent: updatedAgent
        });

    } catch (error) {
        console.error('Update agent skills error:', error);
        res.status(500).json({ error: 'Failed to update agent skills' });
    }
});

// Bulk update agents
router.put('/bulk/update', authenticateToken, requireAgentOrAdmin, async (req, res) => {
    try {
        const { agentIds, updateData } = req.body;

        if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
            return res.status(400).json({ error: 'Agent IDs array is required' });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Update data is required' });
        }

        const results = [];
        for (const agentId of agentIds) {
            try {
                const updatedAgent = await User.update(agentId, updateData);
                results.push({ agentId, success: true, agent: updatedAgent });
            } catch (error) {
                results.push({ agentId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            message: `Bulk update completed. ${successCount} successful, ${failureCount} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk update agents error:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    }
});

module.exports = router;
