use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use shared::UserRole;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub role: String,
    pub company_id: Option<Uuid>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub last_login: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl User {
    pub fn role_enum(&self) -> UserRole {
        match self.role.as_str() {
            "super_admin" => UserRole::SuperAdmin,
            "company_admin" => UserRole::CompanyAdmin,
            "agent" => UserRole::Agent,
            _ => UserRole::Agent, // Default fallback
        }
    }

    pub fn full_name(&self) -> String {
        match (&self.first_name, &self.last_name) {
            (Some(first), Some(last)) => format!("{} {}", first, last),
            (Some(first), None) => first.clone(),
            (None, Some(last)) => last.clone(),
            (None, None) => self.email.clone(),
        }
    }

    pub fn is_super_admin(&self) -> bool {
        matches!(self.role_enum(), UserRole::SuperAdmin)
    }

    pub fn is_company_admin(&self) -> bool {
        matches!(self.role_enum(), UserRole::CompanyAdmin | UserRole::SuperAdmin)
    }

    pub fn can_access_company(&self, company_id: Uuid) -> bool {
        self.is_super_admin() || self.company_id == Some(company_id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: String,
    pub role: UserRole,
    pub company_id: Option<Uuid>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateUserRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub role: UserRole,
    pub company_id: Option<Uuid>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub is_active: bool,
    pub last_login: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<User> for UserProfile {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            role: user.role_enum(),
            company_id: user.company_id,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
        }
    }
}
