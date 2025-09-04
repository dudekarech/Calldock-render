-- Migration: Company Registration System
-- Date: 2025-09-01
-- Description: Add company registration and subscription management

-- ========================================
-- COMPANY REGISTRATION SYSTEM
-- ========================================

-- Company registration requests from landing page
CREATE TABLE company_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    industry VARCHAR(100),
    company_size VARCHAR(50), -- small, medium, large, enterprise
    website_url TEXT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, in_progress
    admin_first_name VARCHAR(100),
    admin_last_name VARCHAR(100),
    admin_email VARCHAR(255),
    admin_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT,
    estimated_setup_time INTEGER DEFAULT 24 -- hours
);

-- Company subscription plans
CREATE TABLE company_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL, -- starter, professional, enterprise
    plan_name VARCHAR(100) NOT NULL,
    max_agents INTEGER NOT NULL,
    max_concurrent_calls INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    monthly_price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, cancelled
    start_date DATE NOT NULL,
    end_date DATE,
    trial_end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company setup progress tracking
CREATE TABLE company_setup_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL, -- company_created, admin_setup, departments_created, widget_configured, agents_added
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, failed
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company onboarding checklist
CREATE TABLE company_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    step VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    required BOOLEAN DEFAULT true,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Company registrations indexes
CREATE INDEX idx_company_registrations_status ON company_registrations(status);
CREATE INDEX idx_company_registrations_contact_email ON company_registrations(contact_email);
CREATE INDEX idx_company_registrations_created_at ON company_registrations(created_at);

-- Company plans indexes
CREATE INDEX idx_company_plans_company ON company_plans(company_id);
CREATE INDEX idx_company_plans_status ON company_plans(status);
CREATE INDEX idx_company_plans_type ON company_plans(plan_type);

-- Setup progress indexes
CREATE INDEX idx_company_setup_progress_company ON company_setup_progress(company_id);
CREATE INDEX idx_company_setup_progress_step ON company_setup_progress(step_name);

-- Onboarding indexes
CREATE INDEX idx_company_onboarding_company ON company_onboarding(company_id);
CREATE INDEX idx_company_onboarding_completed ON company_onboarding(completed);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Apply triggers to new tables
CREATE TRIGGER update_company_plans_updated_at BEFORE UPDATE ON company_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_setup_progress_updated_at BEFORE UPDATE ON company_setup_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATA INSERTS
-- ========================================

-- Insert default onboarding steps
INSERT INTO company_onboarding (company_id, step, title, description, required, order_index) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'company_created', 'Company Created', 'Company account has been created successfully', true, 1),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'admin_setup', 'Admin User Setup', 'Company administrator account has been created', true, 2),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'departments_created', 'Departments Created', 'Default departments have been set up', true, 3),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'widget_configured', 'Widget Configured', 'Call widget has been customized and configured', true, 4),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'agents_added', 'Agents Added', 'First agents have been added to the system', false, 5),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'ivr_configured', 'IVR Configured', 'Interactive voice response system has been set up', false, 6),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'first_call', 'First Call', 'First customer call has been received', false, 7);

-- Insert sample company plan
INSERT INTO company_plans (company_id, plan_type, plan_name, max_agents, max_concurrent_calls, features, monthly_price, start_date) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'professional', 'Professional Plan', 10, 5, '["unlimited_calls", "ivr_system", "call_recording", "analytics", "widget_customization"]', 99.00, CURRENT_DATE);

-- Insert setup progress for demo company
INSERT INTO company_setup_progress (company_id, step_name, status, completed_at) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'company_created', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'admin_setup', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'departments_created', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'widget_configured', 'completed', CURRENT_TIMESTAMP);

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- Company setup overview view
CREATE VIEW company_setup_overview AS
SELECT 
    c.id,
    c.name,
    c.domain,
    c.status as company_status,
    cr.status as registration_status,
    cp.plan_type,
    cp.plan_name,
    cp.monthly_price,
    COUNT(csp.step_name) as completed_steps,
    COUNT(co.step) as total_steps,
    ROUND((COUNT(csp.step_name)::DECIMAL / COUNT(co.step)::DECIMAL) * 100, 2) as setup_progress_percentage
FROM companies c
LEFT JOIN company_registrations cr ON c.name = cr.company_name
LEFT JOIN company_plans cp ON c.id = cp.company_id AND cp.status = 'active'
LEFT JOIN company_setup_progress csp ON c.id = csp.company_id AND csp.status = 'completed'
LEFT JOIN company_onboarding co ON c.id = co.company_id
GROUP BY c.id, c.name, c.domain, c.status, cr.status, cp.plan_type, cp.plan_name, cp.monthly_price;

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

