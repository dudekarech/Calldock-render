use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Call {
    pub id: Uuid,
    pub company_id: Uuid,
    pub agent_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub status: String,
    pub direction: String,
    pub caller_number: Option<String>,
    pub called_number: Option<String>,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub duration: Option<i32>,
    pub recording_url: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub metadata: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub answered_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
}

impl Call {
    pub fn is_active(&self) -> bool {
        matches!(self.status.as_str(), "ringing" | "answered" | "in_progress")
    }

    pub fn is_completed(&self) -> bool {
        matches!(self.status.as_str(), "completed" | "ended" | "failed")
    }

    pub fn is_missed(&self) -> bool {
        self.status == "missed"
    }
}
