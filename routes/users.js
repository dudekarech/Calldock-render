const express = require('express');
const { authenticateToken, requireAdmin, requireCompanyAccess } = require('../middleware/auth');
const { validateUser, validateUserUpdate, validateId, validateCompanyId, validatePagination, validateSearch } = require('../middleware/validation');
const User = require('../database/models/User');
const Company = require('../database/models/Company');

const router = express.Router();

// Get all users for a company
router.get('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, validatePagination, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', role, isActive } = req.query;

        const filters = { companyId };
        if (role) filters.role = role;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const users = await User.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            users: users.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: users.total,
                pages: Math.ceil(users.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', role, companyId, isActive } = req.query;

        const filters = {};
        if (role) filters.role = role;
        if (companyId) filters.companyId = companyId;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const users = await User.findAll({
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder,
            filters
        });

        res.json({
            users: users.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: users.total,
                pages: Math.ceil(users.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
router.get('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== user.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/', authenticateToken, validateUser, async (req, res) => {
    try {
        const userData = req.body;
        
        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            userData.companyId = req.user.companyId;
        }

        // Check if user already exists
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check company exists and is active
        const company = await Company.findById(userData.companyId);
        if (!company || company.status !== 'active') {
            return res.status(400).json({ error: 'Invalid or inactive company' });
        }

        const user = await User.create(userData);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyId: user.companyId,
                isActive: user.isActive
            }
        });

    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', authenticateToken, validateId, validateUserUpdate, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Get existing user to check permissions
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingUser.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        // Ensure companyId cannot be changed by non-admin users
        if (req.user.role !== 'admin') {
            delete updateData.companyId;
        }

        // If changing email, check if it's already taken
        if (updateData.email && updateData.email !== existingUser.email) {
            const emailExists = await User.findByEmail(updateData.email);
            if (emailExists && emailExists.id !== id) {
                return res.status(400).json({ error: 'Email already taken by another user' });
            }
        }

        const updatedUser = await User.update(id, updateData);

        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (req.user.id === id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Get existing user to check permissions
        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== existingUser.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        await User.delete(id);

        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get users by role
router.get('/role/:role', authenticateToken, validatePagination, async (req, res) => {
    try {
        const { role } = req.params;
        const { page = 1, limit = 20, companyId } = req.query;

        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            companyId = req.user.companyId;
        }

        const users = await User.findByRole(role, {
            page: parseInt(page),
            limit: parseInt(limit),
            companyId
        });

        res.json({
            users: users.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: users.total,
                pages: Math.ceil(users.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get users by role error:', error);
        res.status(500).json({ error: 'Failed to fetch users by role' });
    }
});

// Get users by company
router.get('/company/:companyId/users', authenticateToken, requireCompanyAccess, validateCompanyId, validatePagination, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { page = 1, limit = 20, role, isActive } = req.query;

        const filters = { companyId };
        if (role) filters.role = role;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const users = await User.findByCompany(companyId, {
            page: parseInt(page),
            limit: parseInt(limit),
            filters
        });

        res.json({
            users: users.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: users.total,
                pages: Math.ceil(users.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get company users error:', error);
        res.status(500).json({ error: 'Failed to fetch company users' });
    }
});

// Add user to company
router.post('/:id/company/:companyId', authenticateToken, requireAdmin, validateId, validateCompanyId, async (req, res) => {
    try {
        const { id, companyId } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        await User.addToCompany(id, companyId);

        res.json({ message: 'User added to company successfully' });

    } catch (error) {
        console.error('Add user to company error:', error);
        res.status(500).json({ error: 'Failed to add user to company' });
    }
});

// Remove user from company
router.delete('/:id/company/:companyId', authenticateToken, requireAdmin, validateId, validateCompanyId, async (req, res) => {
    try {
        const { id, companyId } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await User.removeFromCompany(id, companyId);

        res.json({ message: 'User removed from company successfully' });

    } catch (error) {
        console.error('Remove user from company error:', error);
        res.status(500).json({ error: 'Failed to remove user from company' });
    }
});

// Get user companies
router.get('/:id/companies', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== user.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        const companies = await User.getCompanies(id);

        res.json({ companies });

    } catch (error) {
        console.error('Get user companies error:', error);
        res.status(500).json({ error: 'Failed to fetch user companies' });
    }
});

// Check user permissions
router.get('/:id/permissions/:permission', authenticateToken, validateId, async (req, res) => {
    try {
        const { id, permission } = req.params;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== user.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        const hasPermission = await User.hasPermission(id, permission);

        res.json({ hasPermission });

    } catch (error) {
        console.error('Check user permission error:', error);
        res.status(500).json({ error: 'Failed to check user permission' });
    }
});

// Get user statistics
router.get('/:id/stats', authenticateToken, validateId, async (req, res) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;

        // Check if user exists
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check company access
        if (req.user.role !== 'admin' && req.user.companyId !== user.companyId) {
            return res.status(403).json({ error: 'Access denied to this user' });
        }

        const stats = await User.getStats(id, { startDate, endDate });

        res.json({ stats });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});

// Search users
router.get('/search/query', authenticateToken, validateSearch, validatePagination, async (req, res) => {
    try {
        const { q, page = 1, limit = 20, companyId } = req.query;

        // Ensure companyId matches user's company (unless admin)
        if (req.user.role !== 'admin') {
            companyId = req.user.companyId;
        }

        const results = await User.search(q, {
            page: parseInt(page),
            limit: parseInt(limit),
            companyId
        });

        res.json({
            users: results.data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: results.total,
                pages: Math.ceil(results.total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Bulk update users
router.put('/bulk/update', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userIds, updateData } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'User IDs array is required' });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Update data is required' });
        }

        const results = [];
        for (const userId of userIds) {
            try {
                const updatedUser = await User.update(userId, updateData);
                results.push({ userId, success: true, user: updatedUser });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            message: `Bulk update completed. ${successCount} successful, ${failureCount} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk update users error:', error);
        res.status(500).json({ error: 'Failed to perform bulk update' });
    }
});

// Bulk delete users
router.delete('/bulk/delete', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ error: 'User IDs array is required' });
        }

        // Prevent self-deletion
        if (userIds.includes(req.user.id)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const results = [];
        for (const userId of userIds) {
            try {
                await User.delete(userId);
                results.push({ userId, success: true });
            } catch (error) {
                results.push({ userId, success: false, error: error.message });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;

        res.json({
            message: `Bulk delete completed. ${successCount} successful, ${failureCount} failed.`,
            results
        });

    } catch (error) {
        console.error('Bulk delete users error:', error);
        res.status(500).json({ error: 'Failed to perform bulk delete' });
    }
});

module.exports = router;
