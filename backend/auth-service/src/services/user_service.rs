use shared::{Result, UserProfile, UpdateProfileRequest};
use sqlx::PgPool;
use bcrypt::{hash, verify, DEFAULT_COST};
use uuid::Uuid;
use crate::models::{User, UpdateUserRequest, ChangePasswordRequest};
use crate::repositories::UserRepository;

pub struct UserService {
    db_pool: PgPool,
    user_repo: UserRepository,
}

impl UserService {
    pub fn new(db_pool: PgPool) -> Self {
        Self { 
            db_pool: db_pool.clone(),
            user_repo: UserRepository::new(db_pool),
        }
    }

    pub async fn get_user_profile(&self, user_id: Uuid) -> Result<UserProfile> {
        let user = sqlx::query!(
            r#"
            SELECT u.id, u.email, u.role, u.company_id, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at, u.updated_at
            FROM users u
            WHERE u.id = $1
            "#,
            user_id
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let user = user.ok_or_else(|| {
            shared::CallDockerError::Authentication("User not found".to_string())
        })?;

        // Parse role
        let role = match user.role.as_str() {
            "super_admin" => shared::UserRole::SuperAdmin,
            "company_admin" => shared::UserRole::CompanyAdmin,
            "agent" => shared::UserRole::Agent,
            _ => return Err(shared::CallDockerError::Authentication("Invalid user role".to_string())),
        };

        Ok(UserProfile {
            id: user.id,
            email: user.email,
            role,
            company_id: user.company_id,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
        })
    }

    pub async fn update_user_profile(&self, user_id: Uuid, req: &UpdateProfileRequest) -> Result<UserProfile> {
        // Update user profile
        sqlx::query!(
            r#"
            UPDATE users 
            SET first_name = COALESCE($1, first_name),
                last_name = COALESCE($2, last_name),
                phone = COALESCE($3, phone),
                avatar_url = COALESCE($4, avatar_url),
                updated_at = NOW()
            WHERE id = $5
            "#,
            req.first_name,
            req.last_name,
            req.phone,
            req.avatar_url,
            user_id
        )
        .execute(&self.db_pool)
        .await?;

        // Return updated profile
        self.get_user_profile(user_id).await
    }

    pub async fn change_password(&self, user_id: Uuid, current_password: &str, new_password: &str) -> Result<()> {
        // Get current password hash
        let user = sqlx::query!(
            "SELECT password_hash FROM users WHERE id = $1",
            user_id
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let user = user.ok_or_else(|| {
            shared::CallDockerError::Authentication("User not found".to_string())
        })?;

        // Verify current password
        let valid = verify(current_password.as_bytes(), &user.password_hash)
            .map_err(|e| shared::CallDockerError::Authentication(format!("Password verification failed: {}", e)))?;

        if !valid {
            return Err(shared::CallDockerError::Authentication("Current password is incorrect".to_string()));
        }

        // Hash new password
        let new_password_hash = hash(new_password.as_bytes(), DEFAULT_COST)
            .map_err(|e| shared::CallDockerError::Authentication(format!("Password hashing failed: {}", e)))?;

        // Update password
        sqlx::query!(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            new_password_hash,
            user_id
        )
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    pub async fn list_users(&self, company_id: Option<Uuid>, limit: i64, offset: i64) -> Result<Vec<UserProfile>> {
        let users = if let Some(company_id) = company_id {
            // List users for specific company
            sqlx::query!(
                r#"
                SELECT u.id, u.email, u.role, u.company_id, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at, u.updated_at
                FROM users u
                WHERE u.company_id = $1
                ORDER BY u.created_at DESC
                LIMIT $2 OFFSET $3
                "#,
                company_id,
                limit,
                offset
            )
            .fetch_all(&self.db_pool)
            .await?
        } else {
            // List all users (super admin only)
            sqlx::query!(
                r#"
                SELECT u.id, u.email, u.role, u.company_id, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.last_login, u.created_at, u.updated_at
                FROM users u
                ORDER BY u.created_at DESC
                LIMIT $1 OFFSET $2
                "#,
                limit,
                offset
            )
            .fetch_all(&self.db_pool)
            .await?
        };

        let mut user_profiles = Vec::new();
        for user in users {
            // Parse role
            let role = match user.role.as_str() {
                "super_admin" => shared::UserRole::SuperAdmin,
                "company_admin" => shared::UserRole::CompanyAdmin,
                "agent" => shared::UserRole::Agent,
                _ => return Err(shared::CallDockerError::Authentication("Invalid user role".to_string())),
            };

            user_profiles.push(UserProfile {
                id: user.id,
                email: user.email,
                role,
                company_id: user.company_id,
                first_name: user.first_name,
                last_name: user.last_name,
                phone: user.phone,
                avatar_url: user.avatar_url,
                is_active: user.is_active,
                last_login: user.last_login,
                created_at: user.created_at,
                updated_at: user.updated_at,
            });
        }

        Ok(user_profiles)
    }
}
