use sqlx::PgPool;
use uuid::Uuid;
use shared::Result;
use crate::models::{User, CreateUserRequest, UpdateUserRequest, UserProfile};

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, role, company_id, first_name, last_name, 
                   phone, avatar_url, is_active, last_login, created_at, updated_at
            FROM users 
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, role, company_id, first_name, last_name, 
                   phone, avatar_url, is_active, last_login, created_at, updated_at
            FROM users 
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn find_by_company_id(&self, company_id: Uuid) -> Result<Vec<User>> {
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, role, company_id, first_name, last_name, 
                   phone, avatar_url, is_active, last_login, created_at, updated_at
            FROM users 
            WHERE company_id = $1
            ORDER BY created_at DESC
            "#,
            company_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn create(&self, req: &CreateUserRequest, password_hash: &str) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, phone)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email, password_hash, role, company_id, first_name, last_name, 
                      phone, avatar_url, is_active, last_login, created_at, updated_at
            "#,
            req.email,
            password_hash,
            req.role.to_string(),
            req.company_id,
            req.first_name,
            req.last_name,
            req.phone
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update(&self, id: Uuid, req: &UpdateUserRequest) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            UPDATE users 
            SET first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                phone = COALESCE($4, phone),
                avatar_url = COALESCE($5, avatar_url),
                is_active = COALESCE($6, is_active),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, password_hash, role, company_id, first_name, last_name, 
                      phone, avatar_url, is_active, last_login, created_at, updated_at
            "#,
            id,
            req.first_name,
            req.last_name,
            req.phone,
            req.avatar_url,
            req.is_active
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(user)
    }

    pub async fn update_password(&self, id: Uuid, password_hash: &str) -> Result<()> {
        sqlx::query!(
            "UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1",
            id,
            password_hash
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn update_last_login(&self, id: Uuid) -> Result<()> {
        sqlx::query!(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM users WHERE id = $1", id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn list_all(&self, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<User>> {
        let limit = limit.unwrap_or(100);
        let offset = offset.unwrap_or(0);

        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, role, company_id, first_name, last_name, 
                   phone, avatar_url, is_active, last_login, created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }

    pub async fn count_by_company(&self, company_id: Uuid) -> Result<i64> {
        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM users WHERE company_id = $1",
            company_id
        )
        .fetch_one(&self.pool)
        .await?
        .count
        .unwrap_or(0);

        Ok(count)
    }

    pub async fn find_active_by_company(&self, company_id: Uuid) -> Result<Vec<User>> {
        let users = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, role, company_id, first_name, last_name, 
                   phone, avatar_url, is_active, last_login, created_at, updated_at
            FROM users 
            WHERE company_id = $1 AND is_active = true
            ORDER BY created_at DESC
            "#,
            company_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(users)
    }
}
