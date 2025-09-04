use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IvrFlow {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub welcome_message: Option<String>,
    pub welcome_audio_url: Option<String>,
    pub nodes: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct IvrSession {
    pub id: Uuid,
    pub call_id: Uuid,
    pub flow_id: Uuid,
    pub current_node_id: Uuid,
    pub session_data: Value,
    pub attempts: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
