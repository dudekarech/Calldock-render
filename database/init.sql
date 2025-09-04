-- CallDocker Database Initialization Script
-- This script sets up the initial database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ========================================
-- CORE TABLES
-- ========================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    industry VARCHAR(100),
    size VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    logo_url VARCHAR(500),
    website_url TEXT,
    billing_email VARCHAR(255),
    phone VARCHAR(50),
    timezone VARCHAR(50) DEFAULT 'UTC',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    avatar_url VARCHAR(500),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company users relationship table
CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'offline',
    skills TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}',
    max_concurrent_calls INTEGER DEFAULT 1,
    current_calls INTEGER DEFAULT 0,
    total_calls_handled BIGINT DEFAULT 0,
    average_call_duration INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, company_id)
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    customer_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'ringing',
    direction VARCHAR(20) NOT NULL,
    caller_number VARCHAR(50),
    called_number VARCHAR(50),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    duration INTEGER,
    recording_url VARCHAR(500),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- COMPANY REGISTRATION SYSTEM TABLES
-- ========================================

-- Company registration requests from landing page
CREATE TABLE IF NOT EXISTS company_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    website_url TEXT,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    admin_first_name VARCHAR(100),
    admin_last_name VARCHAR(100),
    admin_email VARCHAR(255),
    admin_phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES users(id),
    notes TEXT,
    estimated_setup_time INTEGER DEFAULT 24
);

-- Company subscription plans
CREATE TABLE IF NOT EXISTS company_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_type VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    max_agents INTEGER NOT NULL,
    max_concurrent_calls INTEGER NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    monthly_price DECIMAL(10,2) NOT NULL,
    setup_fee DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    trial_end_date DATE,
    auto_renew BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company setup progress tracking
CREATE TABLE IF NOT EXISTS company_setup_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company onboarding checklist
CREATE TABLE IF NOT EXISTS company_onboarding (
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
-- WIDGET SYSTEM TABLES
-- ========================================

-- Widget configurations
CREATE TABLE IF NOT EXISTS widget_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Company users indexes
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- Agents indexes
CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
CREATE INDEX IF NOT EXISTS idx_agents_department ON agents(department_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);

-- Calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_company ON calls(company_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);

-- Company registrations indexes
CREATE INDEX IF NOT EXISTS idx_company_registrations_status ON company_registrations(status);
CREATE INDEX IF NOT EXISTS idx_company_registrations_contact_email ON company_registrations(contact_email);
CREATE INDEX IF NOT EXISTS idx_company_registrations_created_at ON company_registrations(created_at);

-- Company plans indexes
CREATE INDEX IF NOT EXISTS idx_company_plans_company ON company_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_company_plans_status ON company_plans(status);
CREATE INDEX IF NOT EXISTS idx_company_plans_type ON company_plans(plan_type);

-- Setup progress indexes
CREATE INDEX IF NOT EXISTS idx_company_setup_progress_company ON company_setup_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_company_setup_progress_step ON company_setup_progress(step_name);

-- Onboarding indexes
CREATE INDEX IF NOT EXISTS idx_company_onboarding_company ON company_onboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_company_onboarding_completed ON company_onboarding(completed);

-- Widget configs indexes
CREATE INDEX IF NOT EXISTS idx_widget_configs_company ON widget_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_widget_configs_active ON widget_configs(is_active);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Apply triggers to tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('companies', 'users', 'company_users', 'departments', 'agents', 'calls', 'company_plans', 'company_setup_progress', 'widget_configs')
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
            CREATE TRIGGER update_%I_updated_at 
                BEFORE UPDATE ON %I 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- ========================================
-- SAMPLE DATA INSERTS
-- ========================================

-- Insert demo company
INSERT INTO companies (name, domain, industry, size, status, website_url, billing_email, phone) VALUES
('CallDocker Demo', 'calldocker.demo', 'Technology', 'medium', 'active', 'https://calldocker.demo', 'admin@calldocker.demo', '+1-555-0123')
ON CONFLICT (domain) DO NOTHING;

-- Insert global admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified) VALUES
('admin@calldocker.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqQKqK', 'Global', 'Admin', 'superadmin', 'active', true)
ON CONFLICT (email) DO NOTHING;

-- Link admin to demo company
INSERT INTO company_users (company_id, user_id, role, permissions) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), (SELECT id FROM users WHERE email = 'admin@calldocker.com'), 'owner', '{"manage_company": true, "manage_users": true, "manage_departments": true, "manage_agents": true, "view_analytics": true, "manage_widget": true, "manage_ivr": true}')
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Insert default departments
INSERT INTO departments (company_id, name, description, color, status) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'General Support', 'General customer inquiries and support', '#3B82F6', 'active'),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Technical Support', 'Technical issues and troubleshooting', '#EF4444', 'active'),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Sales', 'Sales inquiries and product information', '#10B981', 'active'),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Billing', 'Billing and payment support', '#F59E0B', 'active')
ON CONFLICT DO NOTHING;

-- Insert sample company plan
INSERT INTO company_plans (company_id, plan_type, plan_name, max_agents, max_concurrent_calls, features, monthly_price, start_date) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'professional', 'Professional Plan', 10, 5, '["unlimited_calls", "ivr_system", "call_recording", "analytics", "widget_customization"]', 99.00, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- Insert setup progress for demo company
INSERT INTO company_setup_progress (company_id, step_name, status, completed_at) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'company_created', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'admin_setup', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'departments_created', 'completed', CURRENT_TIMESTAMP),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'widget_configured', 'completed', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Insert onboarding steps
INSERT INTO company_onboarding (company_id, step, title, description, required, order_index) VALUES
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'company_created', 'Company Created', 'Company account has been created successfully', true, 1),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'admin_setup', 'Admin User Setup', 'Company administrator account has been created', true, 2),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'departments_created', 'Departments Created', 'Default departments have been set up', true, 3),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'widget_configured', 'Widget Configured', 'Call widget has been customized and configured', true, 4),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'agents_added', 'Agents Added', 'First agents have been added to the system', false, 5),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'ivr_configured', 'IVR Configured', 'Interactive voice response system has been set up', false, 6),
((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'first_call', 'First Call', 'First customer call has been received', false, 7)
ON CONFLICT DO NOTHING;

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- Company setup overview view
CREATE OR REPLACE VIEW company_setup_overview AS
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
    CASE 
        WHEN COUNT(co.step) > 0 THEN ROUND((COUNT(csp.step_name)::DECIMAL / COUNT(co.step)::DECIMAL) * 100, 2)
        ELSE 0 
    END as setup_progress_percentage
FROM companies c
LEFT JOIN company_registrations cr ON c.name = cr.company_name
LEFT JOIN company_plans cp ON c.id = cp.company_id AND cp.status = 'active'
LEFT JOIN company_setup_progress csp ON c.id = csp.company_id AND csp.status = 'completed'
LEFT JOIN company_onboarding co ON c.id = co.company_id
GROUP BY c.id, c.name, c.domain, c.status, cr.status, cp.plan_type, cp.plan_name, cp.monthly_price;

-- ========================================
-- INITIALIZATION COMPLETE
-- ========================================

SELECT 'CallDocker database initialized successfully!' as status;

