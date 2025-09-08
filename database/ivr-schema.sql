-- CallDocker IVR System Database Schema
-- This script creates all necessary tables for the IVR functionality

-- ========================================
-- IVR FLOWS
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    flow_type VARCHAR(50) NOT NULL DEFAULT 'default', -- default, support, sales, billing
    flow_version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 1,
    nodes JSONB DEFAULT '[]', -- Array of flow nodes
    connections JSONB DEFAULT '[]', -- Array of node connections
    config JSONB DEFAULT '{}', -- Flow configuration
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR NODES
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES ivr_flows(id) ON DELETE CASCADE,
    node_type VARCHAR(50) NOT NULL, -- start, audio_prompt, video_content, menu, condition, agent_transfer
    name VARCHAR(255) NOT NULL,
    description TEXT,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    content_id UUID, -- Reference to ivr_content table
    text TEXT, -- Text content for text nodes
    config JSONB DEFAULT '{}', -- Node-specific configuration
    options JSONB DEFAULT '[]', -- For menu nodes: array of options
    condition JSONB DEFAULT '{}', -- For condition nodes: conditional logic
    next_node_id UUID, -- ID of next node in flow
    default_node_id UUID, -- Default next node for fallback
    timeout INTEGER DEFAULT 30, -- Timeout in seconds
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR CONTENT
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- audio, video, text, image
    file_url VARCHAR(500), -- URL to media file
    thumbnail_url VARCHAR(500), -- URL to thumbnail (for video)
    text TEXT, -- Text content or transcript
    language VARCHAR(10) DEFAULT 'en',
    duration INTEGER, -- Duration in seconds (for audio/video)
    file_size BIGINT, -- File size in bytes
    mime_type VARCHAR(100), -- MIME type of file
    description TEXT,
    tags TEXT[], -- Array of tags for categorization
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR SESSIONS
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL, -- Reference to call (can be external)
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    flow_id UUID NOT NULL REFERENCES ivr_flows(id) ON DELETE CASCADE,
    customer_data JSONB DEFAULT '{}', -- Customer information and preferences
    current_node UUID REFERENCES ivr_nodes(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, abandoned, error
    total_duration INTEGER, -- Total session duration in seconds
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR INTERACTIONS
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ivr_sessions(id) ON DELETE CASCADE,
    from_node UUID REFERENCES ivr_nodes(id),
    to_node UUID REFERENCES ivr_nodes(id),
    customer_input TEXT, -- Customer's input/selection
    interaction_type VARCHAR(50), -- menu_selection, voice_input, timeout, error
    response_time INTEGER, -- Time taken to respond in milliseconds
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR ROUTING RULES
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- Array of conditions to evaluate
    actions JSONB NOT NULL, -- Array of actions to take
    priority INTEGER DEFAULT 1, -- Lower number = higher priority
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- IVR ANALYTICS
-- ========================================

CREATE TABLE IF NOT EXISTS ivr_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    flow_id UUID REFERENCES ivr_flows(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    completed_sessions INTEGER DEFAULT 0,
    abandoned_sessions INTEGER DEFAULT 0,
    avg_session_duration INTEGER DEFAULT 0,
    total_interactions INTEGER DEFAULT 0,
    avg_interactions_per_session DECIMAL(5,2) DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, flow_id, date)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- IVR Flows indexes
CREATE INDEX IF NOT EXISTS idx_ivr_flows_company ON ivr_flows(company_id);
CREATE INDEX IF NOT EXISTS idx_ivr_flows_active ON ivr_flows(is_active);
CREATE INDEX IF NOT EXISTS idx_ivr_flows_type ON ivr_flows(flow_type);
CREATE INDEX IF NOT EXISTS idx_ivr_flows_priority ON ivr_flows(priority);

-- IVR Nodes indexes
CREATE INDEX IF NOT EXISTS idx_ivr_nodes_flow ON ivr_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_ivr_nodes_type ON ivr_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_ivr_nodes_content ON ivr_nodes(content_id);

-- IVR Content indexes
CREATE INDEX IF NOT EXISTS idx_ivr_content_company ON ivr_content(company_id);
CREATE INDEX IF NOT EXISTS idx_ivr_content_type ON ivr_content(content_type);
CREATE INDEX IF NOT EXISTS idx_ivr_content_active ON ivr_content(is_active);
CREATE INDEX IF NOT EXISTS idx_ivr_content_language ON ivr_content(language);

-- IVR Sessions indexes
CREATE INDEX IF NOT EXISTS idx_ivr_sessions_call ON ivr_sessions(call_id);
CREATE INDEX IF NOT EXISTS idx_ivr_sessions_company ON ivr_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_ivr_sessions_flow ON ivr_sessions(flow_id);
CREATE INDEX IF NOT EXISTS idx_ivr_sessions_status ON ivr_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ivr_sessions_start_time ON ivr_sessions(start_time);

-- IVR Interactions indexes
CREATE INDEX IF NOT EXISTS idx_ivr_interactions_session ON ivr_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_ivr_interactions_timestamp ON ivr_interactions(timestamp);

-- IVR Routing Rules indexes
CREATE INDEX IF NOT EXISTS idx_ivr_routing_rules_company ON ivr_routing_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_ivr_routing_rules_active ON ivr_routing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_ivr_routing_rules_priority ON ivr_routing_rules(priority);

-- IVR Analytics indexes
CREATE INDEX IF NOT EXISTS idx_ivr_analytics_company ON ivr_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_ivr_analytics_date ON ivr_analytics(date);
CREATE INDEX IF NOT EXISTS idx_ivr_analytics_flow ON ivr_analytics(flow_id);

-- ========================================
-- TRIGGERS FOR UPDATED_AT
-- ========================================

-- Apply triggers to IVR tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('ivr_flows', 'ivr_nodes', 'ivr_content', 'ivr_sessions', 'ivr_routing_rules', 'ivr_analytics')
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

-- Insert sample IVR flow for demo company
INSERT INTO ivr_flows (company_id, name, description, flow_type, nodes, connections, config) VALUES
(
    (SELECT id FROM companies WHERE domain = 'calldocker.demo' LIMIT 1),
    'Customer Support IVR',
    'Standard customer support IVR flow with audio and video content',
    'support',
    '[
        {
            "id": "start",
            "type": "start",
            "name": "Start",
            "position_x": 100,
            "position_y": 100,
            "next_node_id": "welcome"
        },
        {
            "id": "welcome",
            "type": "audio_prompt",
            "name": "Welcome Message",
            "position_x": 300,
            "position_y": 100,
            "content_id": "welcome-audio",
            "next_node_id": "video-content"
        },
        {
            "id": "video-content",
            "type": "video_content",
            "name": "Company Overview Video",
            "position_x": 500,
            "position_y": 100,
            "content_id": "company-video",
            "next_node_id": "menu"
        },
        {
            "id": "menu",
            "type": "menu",
            "name": "Support Options",
            "position_x": 700,
            "position_y": 100,
            "options": [
                {"value": "1", "label": "Technical Support", "next_node_id": "tech-support"},
                {"value": "2", "label": "Billing Support", "next_node_id": "billing-support"},
                {"value": "3", "label": "General Inquiries", "next_node_id": "general-support"}
            ],
            "default_node_id": "general-support"
        },
        {
            "id": "tech-support",
            "type": "agent_transfer",
            "name": "Tech Support Transfer",
            "position_x": 900,
            "position_y": 50,
            "config": {"department": "technical"}
        },
        {
            "id": "billing-support",
            "type": "agent_transfer",
            "name": "Billing Support Transfer",
            "position_x": 900,
            "position_y": 100,
            "config": {"department": "billing"}
        },
        {
            "id": "general-support",
            "type": "agent_transfer",
            "name": "General Support Transfer",
            "position_x": 900,
            "position_y": 150,
            "config": {"department": "general"}
        }
    ]',
    '[
        {"from": "start", "to": "welcome"},
        {"from": "welcome", "to": "video-content"},
        {"from": "video-content", "to": "menu"},
        {"from": "menu", "to": "tech-support", "condition": "option=1"},
        {"from": "menu", "to": "billing-support", "condition": "option=2"},
        {"from": "menu", "to": "general-support", "condition": "option=3"}
    ]',
    '{"theme": "default", "language": "en", "timeout": 30}'
) ON CONFLICT DO NOTHING;

-- Insert sample content
INSERT INTO ivr_content (company_id, name, content_type, file_url, text, language, duration) VALUES
(
    (SELECT id FROM companies WHERE domain = 'calldocker.demo' LIMIT 1),
    'Welcome Message',
    'audio',
    '/content/audio/welcome-message.mp3',
    'Welcome to CallDocker support. Please wait while we connect you to an agent.',
    'en',
    15
),
(
    (SELECT id FROM companies WHERE domain = 'calldocker.demo' LIMIT 1),
    'Company Overview Video',
    'video',
    '/content/video/company-overview.mp4',
    'Learn about CallDocker and our mission to revolutionize customer support.',
    'en',
    120
) ON CONFLICT DO NOTHING;

-- Insert sample routing rule
INSERT INTO ivr_routing_rules (company_id, name, description, conditions, actions, priority) VALUES
(
    (SELECT id FROM companies WHERE domain = 'calldocker.demo' LIMIT 1),
    'VIP Customer Route',
    'Route VIP customers directly to senior agents',
    '[
        {
            "field": "customer_type",
            "operator": "equals",
            "value": "vip"
        }
    ]',
    '[
        {
            "action": "set_priority",
            "value": "high"
        },
        {
            "action": "route_to_department",
            "value": "senior_support"
        }
    ]',
    1
) ON CONFLICT DO NOTHING;

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE ivr_flows IS 'IVR flow definitions for different companies and use cases';
COMMENT ON TABLE ivr_nodes IS 'Individual nodes within IVR flows (start, audio, video, menu, etc.)';
COMMENT ON TABLE ivr_content IS 'Audio, video, and text content used in IVR flows';
COMMENT ON TABLE ivr_sessions IS 'Active IVR sessions for customer calls';
COMMENT ON TABLE ivr_interactions IS 'Customer interactions within IVR sessions';
COMMENT ON TABLE ivr_routing_rules IS 'Rules for routing calls based on conditions';
COMMENT ON TABLE ivr_analytics IS 'Daily analytics for IVR performance';

COMMENT ON COLUMN ivr_flows.nodes IS 'JSON array of flow nodes with positions and connections';
COMMENT ON COLUMN ivr_flows.connections IS 'JSON array of node connections and routing logic';
COMMENT ON COLUMN ivr_nodes.config IS 'Node-specific configuration (timeout, retries, etc.)';
COMMENT ON COLUMN ivr_nodes.options IS 'Menu options for menu-type nodes';
COMMENT ON COLUMN ivr_nodes.condition IS 'Conditional logic for condition-type nodes';
COMMENT ON COLUMN ivr_content.file_url IS 'URL to media file (audio, video, image)';
COMMENT ON COLUMN ivr_sessions.customer_data IS 'Customer information and preferences in JSON format';
COMMENT ON COLUMN ivr_routing_rules.conditions IS 'JSON array of conditions to evaluate for routing';
COMMENT ON COLUMN ivr_routing_rules.actions IS 'JSON array of actions to take when conditions are met';







