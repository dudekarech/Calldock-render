const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const databaseManager = require('../database/config');

class AuthService {
    constructor() {
        this.saltRounds = 12;
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    }

    /**
     * Hash a password
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, this.saltRounds);
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate JWT token
     */
    generateToken(userId, role) {
        return jwt.sign(
            { 
                userId, 
                role,
                iat: Math.floor(Date.now() / 1000)
            },
            this.jwtSecret,
            { expiresIn: this.jwtExpiresIn }
        );
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    /**
     * Authenticate user login
     */
    async authenticateUser(email, password) {
        try {
            // Get user from database
            const userResult = await databaseManager.query(
                'SELECT * FROM users WHERE email = $1 AND status = $2',
                [email, 'active']
            );

            if (userResult.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = userResult.rows[0];

            // Verify password
            const isValidPassword = await this.comparePassword(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }

            // Update last login
            await databaseManager.query(
                'UPDATE users SET last_login = $1 WHERE id = $2',
                [new Date(), user.id]
            );

            // Generate token
            const token = this.generateToken(user.id, user.role);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role,
                    status: user.status
                },
                token
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Create new user
     */
    async createUser(userData) {
        try {
            const { email, password, first_name, last_name, role = 'user', phone } = userData;

            // Check if user already exists
            const existingUser = await databaseManager.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const passwordHash = await this.hashPassword(password);

            // Create user
            const userResult = await databaseManager.query(
                `INSERT INTO users (
                    email, password_hash, first_name, last_name, role, phone, status, email_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, email, first_name, last_name, role, status, created_at`,
                [email, passwordHash, first_name, last_name, role, phone, 'active', false]
            );

            return userResult.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Link user to company
     */
    async linkUserToCompany(userId, companyId, role = 'member', permissions = {}) {
        try {
            const result = await databaseManager.query(
                `INSERT INTO company_users (
                    company_id, user_id, role, permissions, is_active
                ) VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [companyId, userId, role, JSON.stringify(permissions), true]
            );

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user permissions for a company
     */
    async getUserCompanyPermissions(userId, companyId) {
        try {
            const result = await databaseManager.query(
                'SELECT role, permissions FROM company_users WHERE user_id = $1 AND company_id = $2 AND is_active = $3',
                [userId, companyId, true]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    /**
     * Generate secure password for company admins
     */
    generateSecurePassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        // Ensure at least one character from each category
        password += charset[Math.floor(Math.random() * 26)]; // lowercase
        password += charset[26 + Math.floor(Math.random() * 26)]; // uppercase
        password += charset[52 + Math.floor(Math.random() * 10)]; // number
        password += charset[62 + Math.floor(Math.random() * 8)]; // special
        
        // Fill the rest randomly
        for (let i = 4; i < length; i++) {
            password += charset[Math.floor(Math.random() * charset.length)];
        }
        
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    /**
     * Validate password strength
     */
    validatePasswordStrength(password) {
        const minLength = 8;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return { isValid: false, message: `Password must be at least ${minLength} characters long` };
        }

        if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
            return { 
                isValid: false, 
                message: 'Password must contain lowercase, uppercase, number, and special character' 
            };
        }

        return { isValid: true, message: 'Password meets strength requirements' };
    }

    /**
     * Refresh user token
     */
    async refreshToken(userId) {
        try {
            const userResult = await databaseManager.query(
                'SELECT id, role FROM users WHERE id = $1 AND status = $2',
                [userId, 'active']
            );

            if (userResult.rows.length === 0) {
                throw new Error('User not found or inactive');
            }

            const user = userResult.rows[0];
            return this.generateToken(user.id, user.role);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AuthService;

