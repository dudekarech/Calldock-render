-- CallDocker Database Schema
-- PostgreSQL Database Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- USERS & AUTHENTICATION
-- ========================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- admin, user, agent
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, suspended
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- ========================================
-- COMPANIES & ORGANIZATIONS
-- ========================================

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    industry VARCHAR(100),
    size VARCHAR(50), -- small, medium, large, enterprise
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, suspended
    logo_url TEXT,
    website_url TEXT,
    billing_email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company users (many-to-many relationship)
CREATE TABLE company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member, agent
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, user_id)
);

-- ========================================
-- IVR SYSTEM
-- ========================================

-- IVR Flows
CREATE TABLE ivr_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, active, inactive
    welcome_message TEXT NOT NULL,
    hold_music VARCHAR(100) DEFAULT 'default',
    hold_video TEXT,
    estimated_wait_time INTEGER DEFAULT 180, -- seconds
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IVR Menu Options
CREATE TABLE ivr_menu_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ivr_flow_id UUID NOT NULL REFERENCES ivr_flows(id) ON DELETE CASCADE,
    key_press VARCHAR(10) NOT NULL, -- 1, 2, 3, 0, etc.
    label VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL, -- route, message, callback
    target VARCHAR(255) NOT NULL, -- department name, message text, etc.
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ivr_flow_id, key_press)
);

-- ========================================
-- AGENTS & DEPARTMENTS
-- ========================================

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- hex color
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agents (users with agent role)
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    agent_code VARCHAR(50) UNIQUE,
    skills JSONB DEFAULT '[]', -- array of skill strings
    max_concurrent_calls INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'available', -- available, busy, offline, break
    availability_schedule JSONB DEFAULT '{}', -- working hours, timezone
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Agent availability history
CREATE TABLE agent_availability_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    duration_minutes INTEGER
);

-- ========================================
-- CALLS & COMMUNICATIONS
-- ========================================

-- Calls table
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id VARCHAR(255) UNIQUE NOT NULL, -- WebRTC call ID
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    caller_name VARCHAR(255) NOT NULL,
    caller_phone VARCHAR(20),
    caller_email VARCHAR(255),
    call_type VARCHAR(20) NOT NULL DEFAULT 'voice', -- voice, video, screen_share
    call_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'initiated', -- initiated, queued, connected, completed, failed, missed
    ivr_flow_id UUID REFERENCES ivr_flows(id),
    department_id UUID REFERENCES departments(id),
    agent_id UUID REFERENCES agents(id),
    queue_position INTEGER,
    wait_time_seconds INTEGER,
    call_duration_seconds INTEGER,
    recording_url TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Call events/logs
CREATE TABLE call_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- initiated, queued, agent_assigned, connected, ended, etc.
    event_data JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Call queue
CREATE TABLE call_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    priority INTEGER DEFAULT 0,
    queue_position INTEGER NOT NULL,
    wait_start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estimated_wait_time INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'waiting', -- waiting, assigned, completed, abandoned
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_at TIMESTAMP WITH TIME ZONE
);

-- ========================================
-- ANALYTICS & REPORTING
-- ========================================

-- Call analytics (aggregated data)
CREATE TABLE call_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    avg_wait_time_seconds INTEGER DEFAULT 0,
    avg_call_duration_seconds INTEGER DEFAULT 0,
    total_wait_time_seconds INTEGER DEFAULT 0,
    total_call_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, date)
);

-- Agent performance metrics
CREATE TABLE agent_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls_handled INTEGER DEFAULT 0,
    avg_call_duration_seconds INTEGER DEFAULT 0,
    total_talk_time_seconds INTEGER DEFAULT 0,
    total_wait_time_seconds INTEGER DEFAULT 0,
    customer_satisfaction_score DECIMAL(3,2), -- 1.00 to 5.00
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date)
);

-- ========================================
-- INTEGRATIONS & SETTINGS
-- ========================================

-- Company settings
CREATE TABLE company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, setting_key)
);

-- Webhook configurations
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    events JSONB NOT NULL, -- array of event types
    secret_key VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Companies indexes
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_status ON companies(status);

-- IVR indexes
CREATE INDEX idx_ivr_flows_company ON ivr_flows(company_id);
CREATE INDEX idx_ivr_flows_status ON ivr_flows(status);
CREATE INDEX idx_ivr_menu_options_flow ON ivr_menu_options(ivr_flow_id);

-- Agents indexes
CREATE INDEX idx_agents_company ON agents(company_id);
CREATE INDEX idx_agents_department ON agents(department_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_user ON agents(user_id);

-- Calls indexes
CREATE INDEX idx_calls_company ON calls(company_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_created_at ON calls(created_at);
CREATE INDEX idx_calls_call_id ON calls(call_id);

-- Queue indexes
CREATE INDEX idx_call_queue_company ON call_queue(company_id);
CREATE INDEX idx_call_queue_status ON call_queue(status);
CREATE INDEX idx_call_queue_position ON call_queue(queue_position);

-- Analytics indexes
CREATE INDEX idx_call_analytics_company_date ON call_analytics(company_id, date);
CREATE INDEX idx_agent_performance_agent_date ON agent_performance(agent_id, date);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ivr_flows_updated_at BEFORE UPDATE ON ivr_flows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_analytics_updated_at BEFORE UPDATE ON call_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_performance_updated_at BEFORE UPDATE ON agent_performance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SAMPLE DATA INSERTS
-- ========================================

-- Insert sample company
INSERT INTO companies (name, domain, industry, size, status) 
VALUES ('CallDocker Demo', 'calldocker.demo', 'Technology', 'medium', 'active');

-- Insert sample admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, status, email_verified) 
VALUES ('admin@calldocker.demo', '$2b$10$sample.hash.for.demo', 'Admin', 'User', 'admin', 'active', true);

-- Link admin to company
INSERT INTO company_users (company_id, user_id, role) 
VALUES ((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 
        (SELECT id FROM users WHERE email = 'admin@calldocker.demo'), 
        'owner');

-- Insert sample departments
INSERT INTO departments (company_id, name, description, color) 
VALUES 
    ((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Technical Support', 'Technical support and troubleshooting', '#EF4444'),
    ((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Sales', 'Sales inquiries and product information', '#10B981'),
    ((SELECT id FROM companies WHERE domain = 'calldocker.demo'), 'Billing', 'Billing and payment support', '#F59E0B');

-- Insert sample IVR flow
INSERT INTO ivr_flows (company_id, name, description, status, welcome_message, hold_music, estimated_wait_time) 
VALUES (
    (SELECT id FROM companies WHERE domain = 'calldocker.demo'),
    'Main Support IVR',
    'Primary support line with routing to different departments',
    'active',
    'Welcome to CallDocker Support. Please press 1 for technical support, 2 for sales, 3 for billing, or 0 to speak with an operator.',
    'default',
    180
);

-- Insert sample menu options
INSERT INTO ivr_menu_options (ivr_flow_id, key_press, label, action, target, order_index) 
VALUES 
    ((SELECT id FROM ivr_flows WHERE name = 'Main Support IVR'), '1', 'Technical Support', 'route', 'technical_support', 1),
    ((SELECT id FROM ivr_flows WHERE name = 'Main Support IVR'), '2', 'Sales', 'route', 'sales', 2),
    ((SELECT id FROM ivr_flows WHERE name = 'Main Support IVR'), '3', 'Billing', 'route', 'billing', 3),
    ((SELECT id FROM ivr_flows WHERE name = 'Main Support IVR'), '0', 'Operator', 'route', 'operator', 4);
