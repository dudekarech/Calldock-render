const { body, param, query, validationResult } = require('express-validator');

// Helper function to check validation results
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

// User validation rules
const validateUser = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('role').isIn(['admin', 'agent', 'user']).withMessage('Invalid role'),
    validate
];

const validateUserUpdate = [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    body('role').optional().isIn(['admin', 'agent', 'user']).withMessage('Invalid role'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    validate
];

// Company validation rules
const validateCompany = [
    body('name').trim().isLength({ min: 1 }).withMessage('Company name is required'),
    body('domain').optional().isURL().withMessage('Valid domain URL is required'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Valid phone number is required'),
    body('address').optional().isLength({ min: 1 }).withMessage('Address cannot be empty'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    validate
];

const validateCompanyUpdate = [
    body('name').optional().trim().isLength({ min: 1 }).withMessage('Company name cannot be empty'),
    body('domain').optional().isURL().withMessage('Valid domain URL is required'),
    body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Valid phone number is required'),
    body('address').optional().isLength({ min: 1 }).withMessage('Address cannot be empty'),
    body('settings').optional().isObject().withMessage('Settings must be an object'),
    validate
];

// IVR validation rules
const validateIvrFlow = [
    body('name').trim().isLength({ min: 1 }).withMessage('IVR flow name is required'),
    body('companyId').isUUID().withMessage('Valid company ID is required'),
    body('status').isIn(['active', 'inactive', 'draft']).withMessage('Invalid status'),
    body('welcomeMessage').optional().isLength({ min: 1 }).withMessage('Welcome message cannot be empty'),
    body('holdMusic').optional().isURL().withMessage('Hold music must be a valid URL'),
    body('holdVideo').optional().isURL().withMessage('Hold video must be a valid URL'),
    body('estimatedWaitTime').optional().isInt({ min: 0 }).withMessage('Estimated wait time must be a positive integer'),
    body('menuOptions').optional().isArray().withMessage('Menu options must be an array'),
    body('menuOptions.*.key').optional().matches(/^[0-9*#]$/).withMessage('Menu option key must be 0-9, *, or #'),
    body('menuOptions.*.label').optional().isLength({ min: 1 }).withMessage('Menu option label cannot be empty'),
    body('menuOptions.*.action').optional().isIn(['transfer', 'message', 'queue']).withMessage('Invalid menu action'),
    validate
];

const validateIvrFlowUpdate = [
    body('name').optional().trim().isLength({ min: 1 }).withMessage('IVR flow name cannot be empty'),
    body('status').optional().isIn(['active', 'inactive', 'draft']).withMessage('Invalid status'),
    body('welcomeMessage').optional().isLength({ min: 1 }).withMessage('Welcome message cannot be empty'),
    body('holdMusic').optional().isURL().withMessage('Hold music must be a valid URL'),
    body('holdVideo').optional().isURL().withMessage('Hold video must be a valid URL'),
    body('estimatedWaitTime').optional().isInt({ min: 0 }).withMessage('Estimated wait time must be a positive integer'),
    body('menuOptions').optional().isArray().withMessage('Menu options must be an array'),
    body('menuOptions.*.key').optional().matches(/^[0-9*#]$/).withMessage('Menu option key must be 0-9, *, or #'),
    body('menuOptions.*.label').optional().isLength({ min: 1 }).withMessage('Menu option label cannot be empty'),
    body('menuOptions.*.action').optional().isIn(['transfer', 'message', 'queue']).withMessage('Invalid menu action'),
    validate
];

// Call validation rules
const validateCall = [
    body('callerName').trim().isLength({ min: 1 }).withMessage('Caller name is required'),
    body('callerPhone').trim().isLength({ min: 1 }).withMessage('Caller phone is required'),
    body('callType').isIn(['voice', 'video']).withMessage('Invalid call type'),
    body('companyId').isUUID().withMessage('Valid company ID is required'),
    body('ivrFlowId').optional().isUUID().withMessage('Valid IVR flow ID is required'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
    validate
];

const validateCallUpdate = [
    body('status').optional().isIn(['queued', 'ringing', 'answered', 'completed', 'failed', 'cancelled']).withMessage('Invalid call status'),
    body('agentId').optional().isUUID().withMessage('Valid agent ID is required'),
    body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive integer'),
    body('notes').optional().isLength({ min: 1 }).withMessage('Notes cannot be empty'),
    validate
];

// Agent validation rules
const validateAgent = [
    body('userId').isUUID().withMessage('Valid user ID is required'),
    body('companyId').isUUID().withMessage('Valid company ID is required'),
    body('departmentId').optional().isUUID().withMessage('Valid department ID is required'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('maxConcurrentCalls').optional().isInt({ min: 1, max: 10 }).withMessage('Max concurrent calls must be 1-10'),
    body('availability').optional().isIn(['available', 'busy', 'away', 'offline']).withMessage('Invalid availability status'),
    validate
];

const validateAgentUpdate = [
    body('departmentId').optional().isUUID().withMessage('Valid department ID is required'),
    body('skills').optional().isArray().withMessage('Skills must be an array'),
    body('maxConcurrentCalls').optional().isInt({ min: 1, max: 10 }).withMessage('Max concurrent calls must be 1-10'),
    body('availability').optional().isIn(['available', 'busy', 'away', 'offline']).withMessage('Invalid availability status'),
    validate
];

// Authentication validation rules
const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 1 }).withMessage('Password is required'),
    validate
];

const validateRegister = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
    body('companyName').trim().isLength({ min: 1 }).withMessage('Company name is required'),
    validate
];

// ID parameter validation
const validateId = [
    param('id').isUUID().withMessage('Valid ID is required'),
    validate
];

const validateCompanyId = [
    param('companyId').isUUID().withMessage('Valid company ID is required'),
    validate
];

// Query parameter validation
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('sortBy').optional().isLength({ min: 1 }).withMessage('Sort field cannot be empty'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
    validate
];

const validateDateRange = [
    query('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be a valid ISO date'),
    validate
];

// Search validation
const validateSearch = [
    query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
    validate
];

// File upload validation
const validateFileUpload = [
    body('file').custom((value, { req }) => {
        if (!req.file) {
            throw new Error('File is required');
        }
        
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'audio/mpeg', 'audio/wav', 'video/mp4'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            throw new Error('Invalid file type. Allowed: images, audio, video');
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            throw new Error('File size too large. Maximum: 10MB');
        }
        
        return true;
    }),
    validate
];

module.exports = {
    validate,
    validateUser,
    validateUserUpdate,
    validateCompany,
    validateCompanyUpdate,
    validateIvrFlow,
    validateIvrFlowUpdate,
    validateCall,
    validateCallUpdate,
    validateAgent,
    validateAgentUpdate,
    validateLogin,
    validateRegister,
    validateId,
    validateCompanyId,
    validatePagination,
    validateDateRange,
    validateSearch,
    validateFileUpload
};
