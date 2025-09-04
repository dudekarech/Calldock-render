const express = require('express');
const { authenticateToken, requireAdmin, requireCompanyAccess } = require('../middleware/auth');
const { validateCompany, validateCompanyUpdate, validateId, validateCompanyId, validatePagination, validateSearch } = require('../middleware/validation');
const Company = require('../database/models/Company');
const User = require('../database/models/User');

const router = express.Router();

// Get all companies (admin only)
router.get('/', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', status, domain } = req.query;

        const filters = {};
        if (status) filters.status = status;
        if (domain) filters.domain = domain;

        const companies = await Company.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            companies: companies.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: companies.total,
                pages: Math.ceil(companies.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get all companies error:', error);
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});

// Get company by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const company = await Company.findById(id);

        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== company.id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        res.json({ company });

    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ error: 'Failed to fetch company' });
    }
});

// Create new company (admin only)
router.post('/', authenticateToken, requireAdmin, validateCompany, async (req, res) => {
    try {
        const companyData = req.body;

        // Check if company with domain already exists
        if (companyData.domain) {
            const existingCompany = await Company.findByDomain(companyData.domain);
            if (existingCompany) {
                return res.status(400).json({ error: 'Company with this domain already exists' });
            }
        }

        const company = await Company.create(companyData);

        res.status(201).json({
            message: 'Company created successfully',
            company
        });

    } catch (error) {
        console.error('Create company error:', error);
        res.status(500).json({ error: 'Failed to create company' });
    }
});

// Update company
router.put('/:id', authenticateToken, validateId, validateCompanyUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Get existing company to check permissions
        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingCompany.id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        // If changing domain, check if it's already taken
        if (updateData.domain && updateData.domain !== existingCompany.domain) {
            const domainExists = await Company.findByDomain(updateData.domain);
            if (domainExists && domainExists.id !== id) {
                return res.status(400).json({ error: 'Domain already taken by another company' });
            }
        }

        const updatedCompany = await Company.update(id, updateData);

        res.json({
            message: 'Company updated successfully',
            company: updatedCompany
        });

    } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Failed to update company' });
    }
});

// Delete company (admin only)
router.delete('/:id', authenticateToken, requireAdmin, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Get existing company to check if it exists
        const existingCompany = await Company.findById(id);
        if (!existingCompany) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Check if company has active users
        const users = await Company.findWithUsers(id);
        if (users.users && users.users.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete company with active users. Please remove all users first.' 
            });
        }

        await Company.delete(id);

        res.json({ message: 'Company deleted successfully' });

    } catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ error: 'Failed to delete company' });
    }
});

// Get company with users
router.get('/:id/users', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const companyWithUsers = await Company.findWithUsers(id);

        if (!companyWithUsers) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json({ company: companyWithUsers });

    } catch (error) {
        console.error('Get company with users error:', error);
        res.status(500).json({ error: 'Failed to fetch company with users' });
    }
});

// Get company statistics
router.get('/:id/stats', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const stats = await Company.getStats(id);

        res.json({ stats });

    } catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({ error: 'Failed to fetch company statistics' });
    }
});

// Get company departments
router.get('/:id/departments', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const departments = await Company.getDepartments(id);

        res.json({ departments });

    } catch (error) {
        console.error('Get company departments error:', error);
        res.status(500).json({ error: 'Failed to fetch company departments' });
    }
});

// Get company IVR flows
router.get('/:id/ivr-flows', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const ivrFlows = await Company.getIvrFlows(id);

        res.json({ ivrFlows });

    } catch (error) {
        console.error('Get company IVR flows error:', error);
        res.status(500).json({ error: 'Failed to fetch company IVR flows' });
    }
});

// Get company agents
router.get('/:id/agents', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const agents = await Company.getAgents(id);

        res.json({ agents });

    } catch (error) {
        console.error('Get company agents error:', error);
        res.status(500).json({ error: 'Failed to fetch company agents' });
    }
});

// Get company recent calls
router.get('/:id/recent-calls', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { limit = 10 } = req.query;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const calls = await Company.getRecentCalls(id, parseInt(limit));

        res.json({ calls });

    } catch (error) {
        console.error('Get company recent calls error:', error);
        res.status(500).json({ error: 'Failed to fetch company recent calls' });
    }
});

// Get company analytics
router.get('/:id/analytics', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate, groupBy = 'day' } = req.query;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const analytics = await Company.getAnalytics(id, { startDate, endDate, groupBy });

        res.json({ analytics });

    } catch (error) {
        console.error('Get company analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch company analytics' });
    }
});

// Get company settings
router.get('/:id/settings', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const settings = await Company.getSettings(id);

        res.json({ settings });

    } catch (error) {
        console.error('Get company settings error:', error);
        res.status(500).json({ error: 'Failed to fetch company settings' });
    }
});

// Update company settings
router.put('/:id/settings', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { settings } = req.body;

        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const updatedSettings = await Company.updateSettings(id, settings);

        res.json({
            message: 'Company settings updated successfully',
            settings: updatedSettings
        });

    } catch (error) {
        console.error('Update company settings error:', error);
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});

// Get company webhooks
router.get('/:id/webhooks', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const webhooks = await Company.getWebhooks(id);

        res.json({ webhooks });

    } catch (error) {
        console.error('Get company webhooks error:', error);
        res.status(500).json({ error: 'Failed to fetch company webhooks' });
    }
});

// Add company webhook
router.post('/:id/webhooks', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { url, events, isActive = true } = req.body;

        if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'URL and events array are required' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const webhook = await Company.addWebhook(id, { url, events, isActive });

        res.status(201).json({
            message: 'Webhook added successfully',
            webhook
        });

    } catch (error) {
        console.error('Add company webhook error:', error);
        res.status(500).json({ error: 'Failed to add webhook' });
    }
});

// Get company dashboard data
router.get('/:id/dashboard', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== id) {
            return res.status(403).json({ error: 'Access denied to this company' });
        }

        const dashboardData = await Company.getDashboardData(id, { startDate, endDate });

        res.json({ dashboardData });

    } catch (error) {
        console.error('Get company dashboard data error:', error);
        res.status(500).json({ error: 'Failed to fetch company dashboard data' });
    }
});

// Search companies
router.get('/search/query', authenticateToken, requireAdmin, validateSearch, validatePagination, async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        const results = await Company.search(q, {
            page: parseInt(page),
            limit: parseInt(limit)
        });

        res.json({
            companies: results.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: results.total,
                pages: Math.ceil(results.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Search companies error:', error);
        res.status(500).json({ error: 'Failed to search companies' });
    }
});

// Bulk update companies
router.put('/bulk/update', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { companyIds, updateData } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({ error: 'Company IDs array is required' });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Update data is required' });
        }

        const results = [];
        for (const companyId of companyIds) {
            try {
                const updatedCompany = await Company.update(companyId, updateData);
                results.push({ companyId, success: true, company: updatedCompany });
            } catch (error) {
                results.push({ companyId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            message: `Bulk update completed. ${successCount} successful, ${failureCount} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk update companies error:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    }
});

// Bulk delete companies
router.delete('/bulk/delete', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { companyIds } = req.body;

        if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
            return res.status(400).json({ error: 'Company IDs array is required' });
        }

        const results = [];
        for (const companyId of companyIds) {
            try {
                // Check if company has active users
                const users = await Company.findWithUsers(companyId);
                if (users.users && users.users.length > 0) {
                    results.push({ 
                        companyId, 
                        success: false, 
                        error: 'Company has active users' 
                    });
                    continue;
                }

                await Company.delete(companyId);
                results.push({ companyId, success: true });
            } catch (error) {
                results.push({ companyId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            message: `Bulk delete completed. ${successCount} successful, ${failureCount} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk delete companies error:', error);
        res.status(500).json({ error: 'Failed to perform bulk delete' });
    }
});

module.exports = router;
