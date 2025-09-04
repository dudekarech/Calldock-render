use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CompanyStatus {
    Pending,
    Active,
    Suspended,
    Cancelled,
}

impl std::fmt::Display for CompanyStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CompanyStatus::Pending => write!(f, "pending"),
            CompanyStatus::Active => write!(f, "active"),
            CompanyStatus::Suspended => write!(f, "suspended"),
            CompanyStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Company {
    pub id: Uuid,
    pub name: String,
    pub uuid: String,
    pub status: CompanyStatus,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub logo_url: Option<String>,
    pub settings: CompanySettings,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanySettings {
    pub max_agents: u32,
    pub max_concurrent_calls: u32,
    pub call_recording_enabled: bool,
    pub ivr_enabled: bool,
    pub crm_integration_enabled: bool,
    pub webhook_url: Option<String>,
    pub webhook_secret: Option<String>,
    pub custom_domain: Option<String>,
    pub widget_theme: WidgetTheme,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetTheme {
    pub primary_color: String,
    pub secondary_color: String,
    pub text_color: String,
    pub background_color: String,
    pub border_radius: u8,
    pub font_family: String,
}

impl Default for WidgetTheme {
    fn default() -> Self {
        Self {
            primary_color: "#007bff".to_string(),
            secondary_color: "#6c757d".to_string(),
            text_color: "#333333".to_string(),
            background_color: "#ffffff".to_string(),
            border_radius: 8,
            font_family: "Arial, sans-serif".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateCompanyRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    #[validate(length(min = 2, max = 50))]
    pub uuid: String,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub logo_url: Option<String>,
    pub settings: Option<CompanySettings>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Online,
    Offline,
    Busy,
    Away,
}

impl std::fmt::Display for AgentStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AgentStatus::Online => write!(f, "online"),
            AgentStatus::Offline => write!(f, "offline"),
            AgentStatus::Busy => write!(f, "busy"),
            AgentStatus::Away => write!(f, "away"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: Uuid,
    pub user_id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub status: AgentStatus,
    pub skills: Vec<String>,
    pub max_concurrent_calls: u32,
    pub current_calls: u32,
    pub total_calls_handled: u64,
    pub average_call_duration: Option<u64>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateAgentRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub skills: Vec<String>,
    pub max_concurrent_calls: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct UpdateAgentRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub skills: Option<Vec<String>>,
    pub max_concurrent_calls: Option<u32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStats {
    pub agent_id: Uuid,
    pub total_calls: u64,
    pub answered_calls: u64,
    pub missed_calls: u64,
    pub average_call_duration: u64,
    pub total_talk_time: u64,
    pub customer_satisfaction: Option<f32>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}
