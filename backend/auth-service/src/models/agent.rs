use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub user_id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub status: String,
    pub skills: Vec<String>,
    pub max_concurrent_calls: i32,
    pub current_calls: i32,
    pub total_calls_handled: i64,
    pub average_call_duration: Option<i32>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Agent {
    pub fn is_online(&self) -> bool {
        self.status == "online" && self.is_active
    }

    pub fn is_offline(&self) -> bool {
        self.status == "offline"
    }

    pub fn is_busy(&self) -> bool {
        self.status == "busy"
    }

    pub fn is_available(&self) -> bool {
        self.is_online() && self.current_calls < self.max_concurrent_calls
    }

    pub fn can_take_call(&self) -> bool {
        self.is_available() && self.is_active
    }

    pub fn has_skill(&self, skill: &str) -> bool {
        self.skills.contains(&skill.to_string())
    }

    pub fn add_skill(&mut self, skill: String) {
        if !self.skills.contains(&skill) {
            self.skills.push(skill);
        }
    }

    pub fn remove_skill(&mut self, skill: &str) {
        self.skills.retain(|s| s != skill);
    }

    pub fn increment_calls(&mut self) {
        self.current_calls += 1;
        self.total_calls_handled += 1;
    }

    pub fn decrement_calls(&mut self) {
        if self.current_calls > 0 {
            self.current_calls -= 1;
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAgentRequest {
    pub user_id: Uuid,
    pub company_id: Uuid,
    pub name: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub skills: Vec<String>,
    pub max_concurrent_calls: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateAgentRequest {
    pub name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub status: Option<String>,
    pub skills: Option<Vec<String>>,
    pub max_concurrent_calls: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStatus {
    pub id: Uuid,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStats {
    pub id: Uuid,
    pub name: String,
    pub total_calls_handled: i64,
    pub average_call_duration: Option<i32>,
    pub current_calls: i32,
    pub max_concurrent_calls: i32,
    pub availability_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentWithUser {
    pub agent: Agent,
    pub user: super::user::User,
}
