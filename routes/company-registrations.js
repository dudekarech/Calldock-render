const express = require('express');
const router = express.Router();
const CompanyCreationService = require('../services/company-creation-service');
const databaseManager = require('../database/config');
const { authenticateAdmin, authenticateGlobalAdmin } = require('../middleware/auth');

// Initialize company creation service with real database
const companyCreationService = new CompanyCreationService(databaseManager);

/**
 * @route POST /api/company-registrations
 * @desc Create a new company registration request
 * @access Public (landing page)
 */
router.post('/', async (req, res) => {
    try {
        const registrationData = {
            company_name: req.body.company_name,
            contact_email: req.body.contact_email,
            contact_phone: req.body.contact_phone,
            industry: req.body.industry,
            company_size: req.body.company_size,
            website_url: req.body.website_url,
            description: req.body.description,
            admin_first_name: req.body.admin_first_name,
            admin_last_name: req.body.admin_last_name,
            admin_email: req.body.admin_email,
            admin_phone: req.body.admin_phone
        };

        // Validate required fields
        if (!registrationData.company_name || !registrationData.contact_email || 
            !registrationData.admin_first_name || !registrationData.admin_last_name || 
            !registrationData.admin_email) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
                required: ['company_name', 'contact_email', 'admin_first_name', 'admin_last_name', 'admin_email']
            });
        }

        // Create company registration
        const registration = await companyCreationService.createCompanyRegistration(registrationData);

        res.status(201).json({
            success: true,
            message: 'Company registration submitted successfully',
            data: {
                registration_id: registration.id,
                status: registration.status,
                estimated_setup_time: registration.estimated_setup_time
            }
        });

    } catch (error) {
        console.error('Error creating company registration:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

/**
 * @route GET /api/company-registrations/stats/summary
 * @desc Get summary statistics for company registrations
 * @access Public (temporarily for testing)
 */
router.get('/stats/summary', async (req, res) => {
    try {
        // Get real statistics from database
        const stats = await companyCreationService.getRegistrationStats();
        
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error getting registration stats:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/company-registrations/overview/setup
 * @desc Get company setup overview for all companies
 * @access Public (temporarily for testing)
 */
router.get('/overview/setup', async (req, res) => {
    try {
        const overview = await companyCreationService.getCompanySetupOverview();
        
        res.json({
            success: true,
            data: overview
        });

    } catch (error) {
        console.error('Error getting company setup overview:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/company-registrations
 * @desc Get all company registrations (admin only)
 * @access Private
 */
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const registrations = await companyCreationService.getPendingRegistrations();
        
        res.json({
            success: true,
            data: registrations
        });

    } catch (error) {
        console.error('Error getting company registrations:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/company-registrations/:id
 * @desc Get specific company registration details
 * @access Public (temporarily for testing)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock response for now
        const registration = {
            id,
            company_name: 'Sample Company',
            contact_email: 'contact@sample.com',
            status: 'pending',
            created_at: new Date()
        };

        res.json({
            success: true,
            data: registration
        });

    } catch (error) {
        console.error('Error getting company registration:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route PUT /api/company-registrations/:id/approve
 * @desc Approve company registration and create company
 * @access Public (temporarily for testing)
 */
router.put('/:id/approve', authenticateGlobalAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_type = 'starter' } = req.body;
        const globalAdminId = req.user.id;

        // Approve company registration
        const result = await companyCreationService.approveCompanyRegistration(id, globalAdminId, plan_type);

        res.json({
            success: true,
            message: 'Company registration approved and company created successfully',
            data: {
                company: result.company,
                admin_user: {
                    id: result.adminUser.id,
                    email: result.adminUser.email,
                    first_name: result.adminUser.first_name,
                    last_name: result.adminUser.last_name
                },
                setup_complete: true
            }
        });

    } catch (error) {
        console.error('Error approving company registration:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

/**
 * @route PUT /api/company-registrations/:id/reject
 * @desc Reject company registration
 * @access Public (temporarily for testing)
 */
router.put('/:id/reject', authenticateGlobalAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, notes } = req.body;
        const globalAdminId = req.user.id;

        // Mock rejection for now
        console.log(`Rejecting registration ${id} by admin ${globalAdminId} with reason: ${reason}`);

        res.json({
            success: true,
            message: 'Company registration rejected successfully',
            data: {
                registration_id: id,
                status: 'rejected',
                rejected_at: new Date(),
                rejected_by: globalAdminId,
                reason,
                notes
            }
        });

    } catch (error) {
        console.error('Error rejecting company registration:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/company-registrations/:id/setup-departments
 * @desc Manually setup departments for a company
 * @access Public (temporarily for testing)
 */
router.post('/:id/setup-departments', async (req, res) => {
    try {
        const { id } = req.params;
        const { departments } = req.body;

        // Mock department setup
        console.log(`Setting up departments for company ${id}:`, departments);

        res.json({
            success: true,
            message: 'Departments setup completed successfully',
            data: {
                company_id: id,
                departments_created: departments?.length || 4,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Error setting up departments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/company-registrations/:id/setup-widget
 * @desc Manually setup widget configuration for a company
 * @access Public (temporarily for testing)
 */
router.post('/:id/setup-widget', async (req, res) => {
    try {
        const { id } = req.params;
        const { widget_config } = req.body;

        // Mock widget setup
        console.log(`Setting up widget for company ${id}:`, widget_config);

        res.json({
            success: true,
            message: 'Widget setup completed successfully',
            data: {
                company_id: id,
                widget_configured: true,
                config: widget_config,
                status: 'completed'
            }
        });

    } catch (error) {
        console.error('Error setting up widget:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
