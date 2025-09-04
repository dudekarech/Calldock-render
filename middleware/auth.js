const jwt = require('jsonwebtoken');
const databaseManager = require('../database/config');

/**
 * Verify JWT token and attach user to request
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access token required' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const userResult = await databaseManager.query(
            'SELECT * FROM users WHERE id = $1 AND status = $2',
            [decoded.userId, 'active']
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        }
        
        console.error('Authentication error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

/**
 * Verify admin role (superadmin or company owner)
 */
const authenticateAdmin = async (req, res, next) => {
    try {
        await authenticateToken(req, res, async () => {
            const { role, is_global_admin } = req.user;
            
            // Allow global admin access
            if (is_global_admin || role === 'superadmin') {
                return next();
            }

            // Check if user is company owner
            const companyUserResult = await databaseManager.query(
                'SELECT role FROM company_users WHERE user_id = $1 AND role = $2',
                [req.user.id, 'owner']
            );

            if (companyUserResult.rows.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Admin access required' 
                });
            }

            next();
        });
    } catch (error) {
        console.error('Admin authentication error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

/**
 * Verify global admin role (superadmin only)
 */
const authenticateGlobalAdmin = async (req, res, next) => {
    try {
        await authenticateToken(req, res, async () => {
            if (req.user.role !== 'superadmin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Global admin access required' 
                });
            }
            next();
        });
    } catch (error) {
        console.error('Global admin authentication error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

/**
 * Verify company access (user belongs to company)
 */
const authenticateCompanyAccess = async (req, res, next) => {
    try {
        await authenticateToken(req, res, async () => {
            const companyId = req.params.companyId || req.body.companyId;
            
            if (!companyId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Company ID required' 
                });
            }

            // Check if user has access to company
            const companyUserResult = await databaseManager.query(
                'SELECT * FROM company_users WHERE user_id = $1 AND company_id = $2 AND is_active = $3',
                [req.user.id, companyId, true]
            );

            if (companyUserResult.rows.length === 0) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access to company denied' 
                });
            }

            req.companyUser = companyUserResult.rows[0];
            next();
        });
    } catch (error) {
        console.error('Company access authentication error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Authentication failed' 
        });
    }
};

module.exports = {
    authenticateToken,
    authenticateAdmin,
    authenticateGlobalAdmin,
    authenticateCompanyAccess
};
