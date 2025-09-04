use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Company {
    pub id: Uuid,
    pub name: String,
    pub uuid: String,
    pub status: String,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub logo_url: Option<String>,
    pub settings: Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Company {
    pub fn is_active(&self) -> bool {
        self.status == "active"
    }

    pub fn is_pending(&self) -> bool {
        self.status == "pending"
    }

    pub fn is_suspended(&self) -> bool {
        self.status == "suspended"
    }

    pub fn can_activate(&self) -> bool {
        self.status == "pending"
    }

    pub fn can_suspend(&self) -> bool {
        self.status == "active"
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCompanyRequest {
    pub name: String,
    pub uuid: String,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub logo_url: Option<String>,
    pub settings: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCompanyRequest {
    pub name: Option<String>,
    pub website: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub logo_url: Option<String>,
    pub settings: Option<Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyStatus {
    pub id: Uuid,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyStats {
    pub id: Uuid,
    pub name: String,
    pub total_users: i64,
    pub total_agents: i64,
    pub total_calls: i64,
    pub active_calls: i64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyWithUsers {
    pub company: Company,
    pub users: Vec<super::user::User>,
}
