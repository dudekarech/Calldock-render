use shared::{Result, User, UserRole, LoginRequest, RegisterRequest, AuthToken, Claims};
use crate::config::Config;
use sqlx::PgPool;
use redis::aio::Connection as RedisConnection;
use bcrypt::{hash, verify, DEFAULT_COST};
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey, DecodingKey};
use uuid::Uuid;
use chrono::{Utc, Duration};
use serde_json;

pub struct AuthService {
    db_pool: PgPool,
    redis_conn: RedisConnection,
    config: Config,
}

impl AuthService {
    pub fn new(db_pool: PgPool, redis_conn: RedisConnection, config: Config) -> Self {
        Self {
            db_pool,
            redis_conn,
            config,
        }
    }

    pub async fn register_user(&self, req: &RegisterRequest) -> Result<User> {
        // Check if user already exists
        let existing_user = sqlx::query!(
            "SELECT id FROM users WHERE email = $1",
            req.email
        )
        .fetch_optional(&self.db_pool)
        .await?;

        if existing_user.is_some() {
            return Err(shared::CallDockerError::Authentication("User already exists".to_string()));
        }

        // Check if company UUID is available
        let existing_company = sqlx::query!(
            "SELECT id FROM companies WHERE uuid = $1",
            req.company_uuid
        )
        .fetch_optional(&self.db_pool)
        .await?;

        if existing_company.is_some() {
            return Err(shared::CallDockerError::Validation("Company UUID already taken".to_string()));
        }

        // Hash password
        let password_hash = hash(req.password.as_bytes(), DEFAULT_COST)
            .map_err(|e| shared::CallDockerError::Authentication(format!("Password hashing failed: {}", e)))?;

        // Start transaction
        let mut tx = self.db_pool.begin().await?;

        // Create company
        let company_id = sqlx::query!(
            r#"
            INSERT INTO companies (name, uuid, status, settings)
            VALUES ($1, $2, 'pending', '{}')
            RETURNING id
            "#,
            req.company_name,
            req.company_uuid
        )
        .fetch_one(&mut *tx)
        .await?
        .id;

        // Create user
        let user_id = sqlx::query!(
            r#"
            INSERT INTO users (email, password_hash, role, company_id)
            VALUES ($1, $2, 'company_admin', $3)
            RETURNING id
            "#,
            req.email,
            password_hash,
            company_id
        )
        .fetch_one(&mut *tx)
        .await?
        .id;

        tx.commit().await?;

        // Return user
        Ok(User {
            id: user_id,
            email: req.email.clone(),
            role: UserRole::CompanyAdmin,
            company_id: Some(company_id),
            is_active: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        })
    }

    pub async fn login_user(&self, req: &LoginRequest) -> Result<AuthToken> {
        // Find user
        let user = sqlx::query!(
            r#"
            SELECT u.id, u.email, u.password_hash, u.role, u.company_id, u.is_active,
                   c.uuid as company_uuid
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = $1
            "#,
            req.email
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let user = user.ok_or_else(|| {
            shared::CallDockerError::Authentication("Invalid credentials".to_string())
        })?;

        if !user.is_active {
            return Err(shared::CallDockerError::Authentication("Account is deactivated".to_string()));
        }

        // Verify password
        let valid = verify(req.password.as_bytes(), &user.password_hash)
            .map_err(|e| shared::CallDockerError::Authentication(format!("Password verification failed: {}", e)))?;

        if !valid {
            return Err(shared::CallDockerError::Authentication("Invalid credentials".to_string()));
        }

        // Parse role
        let role = match user.role.as_str() {
            "super_admin" => UserRole::SuperAdmin,
            "company_admin" => UserRole::CompanyAdmin,
            "agent" => UserRole::Agent,
            _ => return Err(shared::CallDockerError::Authentication("Invalid user role".to_string())),
        };

        // Generate tokens
        let access_token = self.generate_access_token(&user.id, &user.email, &role, user.company_id)?;
        let refresh_token = self.generate_refresh_token(&user.id)?;

        // Store refresh token in Redis
        let key = format!("refresh_token:{}", user.id);
        let _: () = redis::cmd("SETEX")
            .arg(&key)
            .arg(self.config.jwt.refresh_token_expiry)
            .arg(&refresh_token)
            .query_async(&mut self.redis_conn.clone())
            .await
            .map_err(|e| shared::CallDockerError::Authentication(format!("Redis error: {}", e)))?;

        // Update last login
        sqlx::query!(
            "UPDATE users SET last_login = NOW() WHERE id = $1",
            user.id
        )
        .execute(&self.db_pool)
        .await?;

        Ok(AuthToken {
            access_token,
            refresh_token,
            expires_in: self.config.jwt.access_token_expiry,
            token_type: "Bearer".to_string(),
        })
    }

    pub async fn refresh_token(&self, refresh_token: &str) -> Result<AuthToken> {
        // Verify refresh token
        let claims = decode::<Claims>(
            refresh_token,
            &DecodingKey::from_secret(self.config.jwt.secret.as_ref()),
            &Validation::default()
        )
        .map_err(|e| shared::CallDockerError::Authentication(format!("Invalid refresh token: {}", e)))?;

        let user_id = claims.claims.sub;

        // Check if refresh token exists in Redis
        let key = format!("refresh_token:{}", user_id);
        let stored_token: Option<String> = redis::cmd("GET")
            .arg(&key)
            .query_async(&mut self.redis_conn.clone())
            .await
            .map_err(|e| shared::CallDockerError::Authentication(format!("Redis error: {}", e)))?;

        if stored_token.as_ref() != Some(&refresh_token.to_string()) {
            return Err(shared::CallDockerError::Authentication("Invalid refresh token".to_string()));
        }

        // Get user info
        let user = sqlx::query!(
            r#"
            SELECT u.id, u.email, u.role, u.company_id, u.is_active
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

        if !user.is_active {
            return Err(shared::CallDockerError::Authentication("Account is deactivated".to_string()));
        }

        // Parse role
        let role = match user.role.as_str() {
            "super_admin" => UserRole::SuperAdmin,
            "company_admin" => UserRole::CompanyAdmin,
            "agent" => UserRole::Agent,
            _ => return Err(shared::CallDockerError::Authentication("Invalid user role".to_string())),
        };

        // Generate new tokens
        let access_token = self.generate_access_token(&user.id, &user.email, &role, user.company_id)?;
        let new_refresh_token = self.generate_refresh_token(&user.id)?;

        // Update refresh token in Redis
        let _: () = redis::cmd("SETEX")
            .arg(&key)
            .arg(self.config.jwt.refresh_token_expiry)
            .arg(&new_refresh_token)
            .query_async(&mut self.redis_conn.clone())
            .await
            .map_err(|e| shared::CallDockerError::Authentication(format!("Redis error: {}", e)))?;

        Ok(AuthToken {
            access_token,
            refresh_token: new_refresh_token,
            expires_in: self.config.jwt.access_token_expiry,
            token_type: "Bearer".to_string(),
        })
    }

    pub async fn logout_user(&self, access_token: &str) -> Result<()> {
        // Decode token to get user ID
        let claims = decode::<Claims>(
            access_token,
            &DecodingKey::from_secret(self.config.jwt.secret.as_ref()),
            &Validation::default()
        )
        .map_err(|e| shared::CallDockerError::Authentication(format!("Invalid token: {}", e)))?;

        let user_id = claims.claims.sub;

        // Remove refresh token from Redis
        let key = format!("refresh_token:{}", user_id);
        let _: () = redis::cmd("DEL")
            .arg(&key)
            .query_async(&mut self.redis_conn.clone())
            .await
            .map_err(|e| shared::CallDockerError::Authentication(format!("Redis error: {}", e)))?;

        Ok(())
    }

    pub async fn forgot_password(&self, email: &str) -> Result<()> {
        // Check if user exists
        let user = sqlx::query!(
            "SELECT id FROM users WHERE email = $1 AND is_active = true",
            email
        )
        .fetch_optional(&self.db_pool)
        .await?;

        if user.is_none() {
            // Don't reveal if user exists or not
            return Ok(());
        }

        // Generate reset token
        let reset_token = Uuid::new_v4().to_string();
        let expires_at = Utc::now() + Duration::hours(24);

        // Store reset token
        sqlx::query!(
            r#"
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id) DO UPDATE SET
                token = EXCLUDED.token,
                expires_at = EXCLUDED.expires_at,
                used_at = NULL
            "#,
            user.unwrap().id,
            reset_token,
            expires_at
        )
        .execute(&self.db_pool)
        .await?;

        // TODO: Send email with reset link
        // For now, just log the token
        tracing::info!("Password reset token for {}: {}", email, reset_token);

        Ok(())
    }

    pub async fn reset_password(&self, token: &str, new_password: &str) -> Result<()> {
        // Find reset token
        let reset_token = sqlx::query!(
            r#"
            SELECT user_id, expires_at, used_at
            FROM password_reset_tokens
            WHERE token = $1
            "#,
            token
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let reset_token = reset_token.ok_or_else(|| {
            shared::CallDockerError::Authentication("Invalid reset token".to_string())
        })?;

        // Check if token is expired
        if reset_token.expires_at < Utc::now() {
            return Err(shared::CallDockerError::Authentication("Reset token expired".to_string()));
        }

        // Check if token is already used
        if reset_token.used_at.is_some() {
            return Err(shared::CallDockerError::Authentication("Reset token already used".to_string()));
        }

        // Hash new password
        let password_hash = hash(new_password.as_bytes(), DEFAULT_COST)
            .map_err(|e| shared::CallDockerError::Authentication(format!("Password hashing failed: {}", e)))?;

        // Update password and mark token as used
        sqlx::query!(
            r#"
            UPDATE users SET password_hash = $1 WHERE id = $2
            "#,
            password_hash,
            reset_token.user_id
        )
        .execute(&self.db_pool)
        .await?;

        sqlx::query!(
            r#"
            UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1
            "#,
            token
        )
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }

    fn generate_access_token(&self, user_id: &Uuid, email: &str, role: &UserRole, company_id: Option<Uuid>) -> Result<String> {
        let now = Utc::now();
        let expires_at = now + Duration::seconds(self.config.jwt.access_token_expiry);

        let claims = Claims {
            sub: *user_id,
            email: email.to_string(),
            role: role.clone(),
            company_id,
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.jwt.secret.as_ref())
        )
        .map_err(|e| shared::CallDockerError::Authentication(format!("Token encoding failed: {}", e)))
    }

    fn generate_refresh_token(&self, user_id: &Uuid) -> Result<String> {
        let now = Utc::now();
        let expires_at = now + Duration::seconds(self.config.jwt.refresh_token_expiry);

        let claims = Claims {
            sub: *user_id,
            email: "".to_string(), // Not needed for refresh token
            role: UserRole::Agent, // Not needed for refresh token
            company_id: None, // Not needed for refresh token
            exp: expires_at.timestamp(),
            iat: now.timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.config.jwt.secret.as_ref())
        )
        .map_err(|e| shared::CallDockerError::Authentication(format!("Token encoding failed: {}", e)))
    }
}
