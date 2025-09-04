use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRFlow {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub welcome_message: Option<String>,
    pub welcome_audio_url: Option<String>,
    pub nodes: Vec<IVRNode>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRNode {
    pub id: Uuid,
    pub node_type: IVRNodeType,
    pub name: String,
    pub description: Option<String>,
    pub audio_url: Option<String>,
    pub text_to_speech: Option<String>,
    pub options: Vec<IVROption>,
    pub timeout_seconds: Option<u32>,
    pub max_attempts: Option<u32>,
    pub next_node_id: Option<Uuid>,
    pub position: IVRPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IVRNodeType {
    Menu,
    Input,
    Transfer,
    Voicemail,
    Hangup,
    Playback,
    Condition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVROption {
    pub key: String,
    pub label: String,
    pub next_node_id: Uuid,
    pub action: IVRAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IVRAction {
    TransferToAgent,
    TransferToDepartment,
    TransferToPhone,
    PlayMessage,
    RecordVoicemail,
    Hangup,
    GoToNode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRPosition {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateIVRFlowRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub description: Option<String>,
    pub welcome_message: Option<String>,
    pub welcome_audio_url: Option<String>,
    pub nodes: Vec<CreateIVRNodeRequest>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateIVRNodeRequest {
    pub node_type: IVRNodeType,
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub description: Option<String>,
    pub audio_url: Option<String>,
    pub text_to_speech: Option<String>,
    pub options: Vec<CreateIVROptionRequest>,
    pub timeout_seconds: Option<u32>,
    pub max_attempts: Option<u32>,
    pub position: IVRPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateIVROptionRequest {
    #[validate(length(min = 1, max = 10))]
    pub key: String,
    #[validate(length(min = 2, max = 100))]
    pub label: String,
    pub next_node_id: Uuid,
    pub action: IVRAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRSession {
    pub id: Uuid,
    pub call_id: Uuid,
    pub flow_id: Uuid,
    pub current_node_id: Uuid,
    pub session_data: serde_json::Value,
    pub attempts: u32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRInteraction {
    pub id: Uuid,
    pub session_id: Uuid,
    pub node_id: Uuid,
    pub input: Option<String>,
    pub selected_option: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRTemplate {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: IVRCategory,
    pub template_data: serde_json::Value,
    pub is_public: bool,
    pub created_by: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IVRCategory {
    CustomerService,
    Sales,
    Support,
    Appointment,
    Information,
    Custom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRAudio {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub file_url: String,
    pub file_size: u64,
    pub duration: Option<u32>,
    pub format: String,
    pub is_public: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateIVRAudioRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub description: Option<String>,
    pub file_url: String,
    pub is_public: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVRStats {
    pub flow_id: Uuid,
    pub total_sessions: u64,
    pub completed_sessions: u64,
    pub abandoned_sessions: u64,
    pub average_session_duration: u64,
    pub most_used_options: Vec<IVROptionStats>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IVROptionStats {
    pub option_key: String,
    pub option_label: String,
    pub usage_count: u64,
    pub percentage: f32,
}
