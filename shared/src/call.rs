use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallStatus {
    Ringing,
    Connected,
    Ended,
    Missed,
    Busy,
    Failed,
}

impl std::fmt::Display for CallStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CallStatus::Ringing => write!(f, "ringing"),
            CallStatus::Connected => write!(f, "connected"),
            CallStatus::Ended => write!(f, "ended"),
            CallStatus::Missed => write!(f, "missed"),
            CallStatus::Busy => write!(f, "busy"),
            CallStatus::Failed => write!(f, "failed"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallDirection {
    Inbound,
    Outbound,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Call {
    pub id: Uuid,
    pub company_id: Uuid,
    pub agent_id: Option<Uuid>,
    pub customer_id: Option<Uuid>,
    pub status: CallStatus,
    pub direction: CallDirection,
    pub caller_number: Option<String>,
    pub called_number: Option<String>,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub duration: Option<u64>,
    pub recording_url: Option<String>,
    pub notes: Option<String>,
    pub tags: Vec<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub answered_at: Option<DateTime<Utc>>,
    pub ended_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateCallRequest {
    pub company_id: Uuid,
    pub customer_name: Option<String>,
    pub customer_email: Option<String>,
    pub customer_phone: Option<String>,
    pub direction: CallDirection,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallQueue {
    pub id: Uuid,
    pub company_id: Uuid,
    pub call_id: Uuid,
    pub priority: u32,
    pub skills_required: Vec<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallRouting {
    pub call_id: Uuid,
    pub company_id: Uuid,
    pub routing_type: RoutingType,
    pub target_agent_id: Option<Uuid>,
    pub target_department: Option<String>,
    pub skills_required: Vec<String>,
    pub priority: u32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoutingType {
    RoundRobin,
    SkillsBased,
    PriorityBased,
    Direct,
    IVR,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallRecording {
    pub id: Uuid,
    pub call_id: Uuid,
    pub file_url: String,
    pub file_size: u64,
    pub duration: u64,
    pub format: String,
    pub quality: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallNote {
    pub id: Uuid,
    pub call_id: Uuid,
    pub agent_id: Uuid,
    pub content: String,
    pub is_private: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateCallNoteRequest {
    pub call_id: Uuid,
    pub content: String,
    pub is_private: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallStats {
    pub company_id: Uuid,
    pub total_calls: u64,
    pub answered_calls: u64,
    pub missed_calls: u64,
    pub average_call_duration: u64,
    pub total_talk_time: u64,
    pub average_wait_time: u64,
    pub customer_satisfaction: Option<f32>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CallEvent {
    pub id: Uuid,
    pub call_id: Uuid,
    pub event_type: CallEventType,
    pub data: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CallEventType {
    CallInitiated,
    CallRinging,
    CallAnswered,
    CallEnded,
    CallTransferred,
    CallEscalated,
    CallRecordingStarted,
    CallRecordingStopped,
    AgentJoined,
    AgentLeft,
    CustomerJoined,
    CustomerLeft,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebRTCConnection {
    pub call_id: Uuid,
    pub peer_connection_id: String,
    pub ice_servers: Vec<IceServer>,
    pub local_sdp: Option<String>,
    pub remote_sdp: Option<String>,
    pub ice_candidates: Vec<String>,
    pub connection_state: ConnectionState,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IceServer {
    pub urls: Vec<String>,
    pub username: Option<String>,
    pub credential: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionState {
    New,
    Connecting,
    Connected,
    Disconnected,
    Failed,
    Closed,
}
