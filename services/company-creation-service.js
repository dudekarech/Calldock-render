const crypto = require('crypto');
const bcrypt = require('bcrypt');

class CompanyCreationService {
    constructor(db, emailService) {
        this.db = db;
        this.emailService = emailService;
    }

    /**
     * Create a new company registration request
     */
    async createCompanyRegistration(registrationData) {
        try {
            const {
                company_name,
                contact_email,
                contact_phone,
                industry,
                company_size,
                website_url,
                description,
                admin_first_name,
                admin_last_name,
                admin_email,
                admin_phone
            } = registrationData;

            // Validate required fields
            if (!company_name || !contact_email || !admin_first_name || !admin_last_name || !admin_email) {
                throw new Error('Missing required fields for company registration');
            }

            // Check if company name already exists
            const existingCompany = await this.db.query(
                'SELECT id FROM companies WHERE name = $1 OR domain = $2',
                [company_name, this.generateDomain(company_name)]
            );

            if (existingCompany.rows.length > 0) {
                throw new Error('Company name already exists');
            }

            // Check if admin email already exists
            const existingUser = await this.db.query(
                'SELECT id FROM users WHERE email = $1',
                [admin_email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('Admin email already exists');
            }

            // Create company registration
            const registration = await this.db.query(
                `INSERT INTO company_registrations (
                    company_name, contact_email, contact_phone, industry, company_size,
                    website_url, description, admin_first_name, admin_last_name,
                    admin_email, admin_phone, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *`,
                [
                    company_name, contact_email, contact_phone, industry, company_size,
                    website_url, description, admin_first_name, admin_last_name,
                    admin_email, admin_phone, 'pending'
                ]
            );

            // Send notification to global admin
            await this.notifyGlobalAdmin(registration.rows[0]);

            // Send confirmation to company contact
            await this.sendRegistrationConfirmation(registration.rows[0]);

            return registration.rows[0];
        } catch (error) {
            console.error('Error creating company registration:', error);
            throw error;
        }
    }

    /**
     * Approve company registration and create company
     */
    async approveCompanyRegistration(registrationId, globalAdminId, planType = 'starter') {
        try {
            // Get registration details
            const registration = await this.db.query(
                'SELECT * FROM company_registrations WHERE id = $1',
                [registrationId]
            );

            if (registration.rows.length === 0) {
                throw new Error('Company registration not found');
            }

            const reg = registration.rows[0];

            // Update registration status
            await this.db.query(
                'UPDATE company_registrations SET status = $1, reviewed_at = $2, reviewed_by = $3 WHERE id = $4',
                ['approved', new Date(), globalAdminId, registrationId]
            );

            // Create company
            const company = await this.createCompany(reg);

            // Create company admin user
            const adminUser = await this.createCompanyAdmin(company.id, reg);

            // Setup default departments
            await this.setupDefaultDepartments(company.id);

            // Setup company plan
            await this.setupCompanyPlan(company.id, planType);

            // Initialize onboarding checklist
            await this.initializeOnboarding(company.id);

            // Update setup progress
            await this.updateSetupProgress(company.id, 'company_created', 'completed');
            await this.updateSetupProgress(company.id, 'admin_setup', 'completed');
            await this.updateSetupProgress(company.id, 'departments_created', 'completed');

            // Send welcome email to company admin
            await this.sendWelcomeEmail(company, adminUser);

            return {
                company,
                adminUser,
                message: 'Company created successfully'
            };
        } catch (error) {
            console.error('Error approving company registration:', error);
            throw error;
        }
    }

    /**
     * Create company record
     */
    async createCompany(registrationData) {
        try {
            const domain = this.generateDomain(registrationData.company_name);
            
            const company = await this.db.query(
                `INSERT INTO companies (
                    name, domain, industry, size, status, logo_url, website_url,
                    billing_email, phone, timezone
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    registrationData.company_name,
                    domain,
                    registrationData.industry,
                    registrationData.company_size,
                    'active',
                    null, // logo_url
                    registrationData.website_url,
                    registrationData.contact_email,
                    registrationData.contact_phone,
                    'UTC'
                ]
            );

            return company.rows[0];
        } catch (error) {
            console.error('Error creating company:', error);
            throw error;
        }
    }

    /**
     * Create company admin user
     */
    async createCompanyAdmin(companyId, registrationData) {
        try {
            // Generate secure password
            const password = this.generateSecurePassword();
            const passwordHash = await bcrypt.hash(password, 12);

            // Create admin user
            const adminUser = await this.db.query(
                `INSERT INTO users (
                    email, password_hash, first_name, last_name, phone, role, status, email_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    registrationData.admin_email,
                    passwordHash,
                    registrationData.admin_first_name,
                    registrationData.admin_last_name,
                    registrationData.admin_phone,
                    'admin',
                    'active',
                    false
                ]
            );

            // Link user to company as owner
            await this.db.query(
                `INSERT INTO company_users (company_id, user_id, role, permissions)
                VALUES ($1, $2, $3, $4)`,
                [
                    companyId,
                    adminUser.rows[0].id,
                    'owner',
                    JSON.stringify({
                        manage_company: true,
                        manage_users: true,
                        manage_departments: true,
                        manage_agents: true,
                        view_analytics: true,
                        manage_widget: true,
                        manage_ivr: true
                    })
                ]
            );

            // Store password for email (in production, this would be sent securely)
            adminUser.rows[0].temporaryPassword = password;

            return adminUser.rows[0];
        } catch (error) {
            console.error('Error creating company admin:', error);
            throw error;
        }
    }

    /**
     * Setup default departments for new company
     */
    async setupDefaultDepartments(companyId) {
        try {
            const defaultDepartments = [
                {
                    name: 'General Support',
                    description: 'General customer inquiries and support',
                    color: '#3B82F6'
                },
                {
                    name: 'Technical Support',
                    description: 'Technical issues and troubleshooting',
                    color: '#EF4444'
                },
                {
                    name: 'Sales',
                    description: 'Sales inquiries and product information',
                    color: '#10B981'
                },
                {
                    name: 'Billing',
                    description: 'Billing and payment support',
                    color: '#F59E0B'
                }
            ];

            for (const dept of defaultDepartments) {
                await this.db.query(
                    `INSERT INTO departments (company_id, name, description, color, status)
                    VALUES ($1, $2, $3, $4, $5)`,
                    [companyId, dept.name, dept.description, dept.color, 'active']
                );
            }

            return defaultDepartments;
        } catch (error) {
            console.error('Error setting up default departments:', error);
            throw error;
        }
    }

    /**
     * Setup company subscription plan
     */
    async setupCompanyPlan(companyId, planType) {
        try {
            const plans = {
                starter: {
                    plan_name: 'Starter Plan',
                    max_agents: 5,
                    max_concurrent_calls: 2,
                    features: ['basic_widget', 'call_routing', 'basic_analytics'],
                    monthly_price: 49.00,
                    setup_fee: 0.00
                },
                professional: {
                    plan_name: 'Professional Plan',
                    max_agents: 20,
                    max_concurrent_calls: 10,
                    features: ['advanced_widget', 'ivr_system', 'call_recording', 'advanced_analytics', 'customization'],
                    monthly_price: 99.00,
                    setup_fee: 0.00
                },
                enterprise: {
                    plan_name: 'Enterprise Plan',
                    max_agents: 100,
                    max_concurrent_calls: 50,
                    features: ['enterprise_widget', 'advanced_ivr', 'call_recording', 'real_time_analytics', 'custom_integration', 'dedicated_support'],
                    monthly_price: 299.00,
                    setup_fee: 199.00
                }
            };

            const plan = plans[planType] || plans.starter;

            const companyPlan = await this.db.query(
                `INSERT INTO company_plans (
                    company_id, plan_type, plan_name, max_agents, max_concurrent_calls,
                    features, monthly_price, setup_fee, start_date, trial_end_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *`,
                [
                    companyId,
                    planType,
                    plan.plan_name,
                    plan.max_agents,
                    plan.max_concurrent_calls,
                    JSON.stringify(plan.features),
                    plan.monthly_price,
                    plan.setup_fee,
                    new Date(),
                    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 day trial
                ]
            );

            return companyPlan.rows[0];
        } catch (error) {
            console.error('Error setting up company plan:', error);
            throw error;
        }
    }

    /**
     * Initialize onboarding checklist
     */
    async initializeOnboarding(companyId) {
        try {
            const onboardingSteps = [
                {
                    step: 'company_created',
                    title: 'Company Created',
                    description: 'Company account has been created successfully',
                    required: true,
                    order_index: 1
                },
                {
                    step: 'admin_setup',
                    title: 'Admin User Setup',
                    description: 'Company administrator account has been created',
                    required: true,
                    order_index: 2
                },
                {
                    step: 'departments_created',
                    title: 'Departments Created',
                    description: 'Default departments have been set up',
                    required: true,
                    order_index: 3
                },
                {
                    step: 'widget_configured',
                    title: 'Widget Configured',
                    description: 'Call widget has been customized and configured',
                    required: true,
                    order_index: 4
                },
                {
                    step: 'agents_added',
                    title: 'Agents Added',
                    description: 'First agents have been added to the system',
                    required: false,
                    order_index: 5
                },
                {
                    step: 'ivr_configured',
                    title: 'IVR Configured',
                    description: 'Interactive voice response system has been set up',
                    required: false,
                    order_index: 6
                },
                {
                    step: 'first_call',
                    title: 'First Call',
                    description: 'First customer call has been received',
                    required: false,
                    order_index: 7
                }
            ];

            for (const step of onboardingSteps) {
                await this.db.query(
                    `INSERT INTO company_onboarding (
                        company_id, step, title, description, required, order_index
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [companyId, step.step, step.title, step.description, step.required, step.order_index]
                );
            }

            return onboardingSteps;
        } catch (error) {
            console.error('Error initializing onboarding:', error);
            throw error;
        }
    }

    /**
     * Update setup progress
     */
    async updateSetupProgress(companyId, stepName, status, notes = null) {
        try {
            const progress = await this.db.query(
                `INSERT INTO company_setup_progress (company_id, step_name, status, notes, completed_at)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (company_id, step_name) 
                DO UPDATE SET status = $3, notes = $4, completed_at = $5, updated_at = CURRENT_TIMESTAMP
                RETURNING *`,
                [
                    companyId,
                    stepName,
                    status,
                    notes,
                    status === 'completed' ? new Date() : null
                ]
            );

            return progress.rows[0];
        } catch (error) {
            console.error('Error updating setup progress:', error);
            throw error;
        }
    }

    /**
     * Generate domain from company name
     */
    generateDomain(companyName) {
        return companyName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20) + '.calldocker.com';
    }

    /**
     * Generate secure password
     */
    generateSecurePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        
        return password;
    }

    /**
     * Notify global admin of new registration
     */
    async notifyGlobalAdmin(registration) {
        try {
            if (this.emailService) {
                await this.emailService.sendEmail({
                    to: process.env.GLOBAL_ADMIN_EMAIL || 'admin@calldocker.com',
                    subject: 'New Company Registration Request',
                    template: 'company-registration-notification',
                    data: registration
                });
            }
        } catch (error) {
            console.error('Error notifying global admin:', error);
        }
    }

    /**
     * Send registration confirmation to company
     */
    async sendRegistrationConfirmation(registration) {
        try {
            if (this.emailService) {
                await this.emailService.sendEmail({
                    to: registration.contact_email,
                    subject: 'Company Registration Received - CallDocker',
                    template: 'company-registration-confirmation',
                    data: registration
                });
            }
        } catch (error) {
            console.error('Error sending registration confirmation:', error);
        }
    }

    /**
     * Send welcome email to company admin
     */
    async sendWelcomeEmail(company, adminUser) {
        try {
            if (this.emailService) {
                await this.emailService.sendEmail({
                    to: adminUser.email,
                    subject: `Welcome to CallDocker - ${company.name}`,
                    template: 'company-welcome',
                    data: {
                        company,
                        adminUser,
                        loginUrl: `${process.env.APP_URL}/admin-login`
                    }
                });
            }
        } catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }

    /**
     * Get company setup overview
     */
    async getCompanySetupOverview() {
        try {
            const overview = await this.db.query(`
                SELECT * FROM company_setup_overview
                ORDER BY created_at DESC
            `);

            return overview.rows;
        } catch (error) {
            console.error('Error getting company setup overview:', error);
            throw error;
        }
    }

    /**
     * Get pending company registrations
     */
    async getPendingRegistrations() {
        try {
            const registrations = await this.db.query(`
                SELECT * FROM company_registrations
                WHERE status = 'pending'
                ORDER BY created_at ASC
            `);

            return registrations.rows;
        } catch (error) {
            console.error('Error getting pending registrations:', error);
            throw error;
        }
    }

    /**
     * Get registration statistics
     */
    async getRegistrationStats() {
        try {
            // Get total registrations
            const totalResult = await this.db.query(`
                SELECT COUNT(*) as total FROM company_registrations
            `);
            
            // Get status counts
            const statusResult = await this.db.query(`
                SELECT status, COUNT(*) as count 
                FROM company_registrations 
                GROUP BY status
            `);
            
            // Get companies created
            const companiesResult = await this.db.query(`
                SELECT COUNT(*) as total FROM companies
            `);
            
            // Get setup progress
            const setupResult = await this.db.query(`
                SELECT 
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(*) as total
                FROM company_setup_progress
            `);
            
            // Calculate averages
            const avgResult = await this.db.query(`
                SELECT AVG(estimated_setup_time) as avg_setup_time
                FROM company_registrations
                WHERE status = 'approved'
            `);
            
            const stats = {
                total_registrations: parseInt(totalResult.rows[0]?.total || 0),
                pending_review: 0,
                approved: 0,
                rejected: 0,
                companies_created: parseInt(companiesResult.rows[0]?.total || 0),
                setup_in_progress: 0,
                fully_setup: parseInt(setupResult.rows[0]?.completed || 0),
                avg_setup_time_hours: parseFloat(avgResult.rows[0]?.avg_setup_time || 0)
            };
            
            // Fill in status counts
            statusResult.rows.forEach(row => {
                if (row.status === 'pending') stats.pending_review = parseInt(row.count);
                else if (row.status === 'approved') stats.approved = parseInt(row.count);
                else if (row.status === 'rejected') stats.rejected = parseInt(row.count);
            });
            
            // Calculate setup in progress
            stats.setup_in_progress = stats.companies_created - stats.fully_setup;
            
            return stats;
        } catch (error) {
            console.error('Error getting registration stats:', error);
            throw error;
        }
    }
}

module.exports = CompanyCreationService;
