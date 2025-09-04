use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingRule {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub priority: u32,
    pub is_active: bool,
    pub conditions: Vec<RoutingCondition>,
    pub actions: Vec<RoutingAction>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingCondition {
    pub field: RoutingField,
    pub operator: RoutingOperator,
    pub value: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoutingField {
    CustomerPhone,
    CustomerEmail,
    CustomerName,
    CallTime,
    CallDuration,
    AgentSkills,
    AgentStatus,
    QueueLength,
    CallPriority,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoutingOperator {
    Equals,
    NotEquals,
    Contains,
    NotContains,
    StartsWith,
    EndsWith,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    In,
    NotIn,
    IsNull,
    IsNotNull,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingAction {
    pub action_type: RoutingActionType,
    pub parameters: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoutingActionType {
    RouteToAgent,
    RouteToDepartment,
    RouteToQueue,
    RouteToIVR,
    RouteToVoicemail,
    RouteToExternal,
    SetPriority,
    AddTag,
    SetMetadata,
    SendWebhook,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingQueue {
    pub id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub strategy: QueueStrategy,
    pub max_wait_time: Option<u32>,
    pub max_queue_size: Option<u32>,
    pub overflow_action: OverflowAction,
    pub agents: Vec<Uuid>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum QueueStrategy {
    RoundRobin,
    LeastBusy,
    MostSkilled,
    Priority,
    Random,
    Custom(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum OverflowAction {
    RouteToFallback,
    RouteToVoicemail,
    RouteToIVR,
    Hangup,
    RouteToExternal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueItem {
    pub id: Uuid,
    pub queue_id: Uuid,
    pub call_id: Uuid,
    pub priority: u32,
    pub wait_start: DateTime<Utc>,
    pub estimated_wait_time: Option<u32>,
    pub position: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingResult {
    pub call_id: Uuid,
    pub target_type: RoutingTargetType,
    pub target_id: Uuid,
    pub priority: u32,
    pub estimated_wait_time: Option<u32>,
    pub routing_reason: String,
    pub applied_rules: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RoutingTargetType {
    Agent,
    Queue,
    IVR,
    Voicemail,
    External,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAvailability {
    pub agent_id: Uuid,
    pub status: AgentStatus,
    pub current_calls: u32,
    pub max_calls: u32,
    pub skills: Vec<String>,
    pub last_activity: DateTime<Utc>,
    pub is_available: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AgentStatus {
    Online,
    Offline,
    Busy,
    Away,
    Break,
    Training,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoutingStats {
    pub company_id: Uuid,
    pub total_routed_calls: u64,
    pub successful_routes: u64,
    pub failed_routes: u64,
    pub average_routing_time: u64,
    pub queue_stats: Vec<QueueStats>,
    pub agent_stats: Vec<AgentRoutingStats>,
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    pub queue_id: Uuid,
    pub queue_name: String,
    pub total_calls: u64,
    pub answered_calls: u64,
    pub abandoned_calls: u64,
    pub average_wait_time: u64,
    pub max_wait_time: u64,
    pub average_queue_length: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentRoutingStats {
    pub agent_id: Uuid,
    pub agent_name: String,
    pub total_calls_routed: u64,
    pub answered_calls: u64,
    pub average_answer_time: u64,
    pub average_call_duration: u64,
    pub availability_percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateRoutingRuleRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub description: Option<String>,
    pub priority: u32,
    pub conditions: Vec<RoutingCondition>,
    pub actions: Vec<RoutingAction>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
pub struct CreateRoutingQueueRequest {
    #[validate(length(min = 2, max = 100))]
    pub name: String,
    pub description: Option<String>,
    pub strategy: QueueStrategy,
    pub max_wait_time: Option<u32>,
    pub max_queue_size: Option<u32>,
    pub overflow_action: OverflowAction,
    pub agents: Vec<Uuid>,
}
