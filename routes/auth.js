const express = require('express');
const router = express.Router();
const AuthService = require('../services/auth-service');
const { authenticateToken } = require('../middleware/auth');

const authService = new AuthService();

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return JWT token
 * @access Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Authenticate user
        const authResult = await authService.authenticateUser(email, password);

        res.json({
            success: true,
            message: 'Login successful',
            data: authResult
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Authentication failed'
        });
    }
});

/**
 * @route POST /api/auth/register
 * @desc Register new user
 * @access Public
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, phone } = req.body;

        // Validate input
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'Email, password, first name, and last name are required'
            });
        }

        // Validate password strength
        const passwordValidation = authService.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Create user
        const user = await authService.createUser({
            email,
            password,
            first_name,
            last_name,
            phone,
            role: 'user'
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Registration failed'
        });
    }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', authenticateToken, async (req, res) => {
    try {
        const newToken = await authService.refreshToken(req.user.id);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token: newToken
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Token refresh failed'
        });
    }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    first_name: req.user.first_name,
                    last_name: req.user.last_name,
                    role: req.user.role,
                    status: req.user.status
                }
            }
        });

    } catch (error) {
        console.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user information'
        });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // In a stateless JWT system, logout is handled client-side
        // You could implement a blacklist here if needed
        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password strength
        const passwordValidation = authService.validatePasswordStrength(new_password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.message
            });
        }

        // Verify current password
        const isValidPassword = await authService.comparePassword(current_password, req.user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const newPasswordHash = await authService.hashPassword(new_password);

        // Update password in database
        await databaseManager.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newPasswordHash, req.user.id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to change password'
        });
    }
});

module.exports = router;
