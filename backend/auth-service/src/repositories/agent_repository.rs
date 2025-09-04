use sqlx::PgPool;
use uuid::Uuid;
use shared::Result;
use crate::models::{Agent, CreateAgentRequest, UpdateAgentRequest, AgentStatus};

#[derive(Clone)]
pub struct AgentRepository {
    pool: PgPool,
}

impl AgentRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Agent>> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, user_id, company_id, name, email, phone, avatar_url, status, 
                   skills, max_concurrent_calls, current_calls, total_calls_handled, 
                   average_call_duration, is_active, created_at, updated_at
            FROM agents 
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn find_by_user_id(&self, user_id: Uuid) -> Result<Option<Agent>> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, user_id, company_id, name, email, phone, avatar_url, status, 
                   skills, max_concurrent_calls, current_calls, total_calls_handled, 
                   average_call_duration, is_active, created_at, updated_at
            FROM agents 
            WHERE user_id = $1
            "#,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn find_by_company_id(&self, company_id: Uuid) -> Result<Vec<Agent>> {
        let agents = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, user_id, company_id, name, email, phone, avatar_url, status, 
                   skills, max_concurrent_calls, current_calls, total_calls_handled, 
                   average_call_duration, is_active, created_at, updated_at
            FROM agents 
            WHERE company_id = $1
            ORDER BY created_at DESC
            "#,
            company_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(agents)
    }

    pub async fn find_available_by_company(&self, company_id: Uuid) -> Result<Vec<Agent>> {
        let agents = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, user_id, company_id, name, email, phone, avatar_url, status, 
                   skills, max_concurrent_calls, current_calls, total_calls_handled, 
                   average_call_duration, is_active, created_at, updated_at
            FROM agents 
            WHERE company_id = $1 AND is_active = true AND status = 'online' 
                  AND current_calls < max_concurrent_calls
            ORDER BY current_calls ASC, total_calls_handled ASC
            "#,
            company_id
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(agents)
    }

    pub async fn create(&self, req: &CreateAgentRequest) -> Result<Agent> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            INSERT INTO agents (user_id, company_id, name, email, phone, avatar_url, 
                               skills, max_concurrent_calls)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, 
                      skills, max_concurrent_calls, current_calls, total_calls_handled, 
                      average_call_duration, is_active, created_at, updated_at
            "#,
            req.user_id,
            req.company_id,
            req.name,
            req.email,
            req.phone,
            req.avatar_url,
            &req.skills,
            req.max_concurrent_calls.unwrap_or(1)
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn update(&self, id: Uuid, req: &UpdateAgentRequest) -> Result<Agent> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            UPDATE agents 
            SET name = COALESCE($2, name),
                phone = COALESCE($3, phone),
                avatar_url = COALESCE($4, avatar_url),
                status = COALESCE($5, status),
                skills = COALESCE($6, skills),
                max_concurrent_calls = COALESCE($7, max_concurrent_calls),
                is_active = COALESCE($8, is_active),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, 
                      skills, max_concurrent_calls, current_calls, total_calls_handled, 
                      average_call_duration, is_active, created_at, updated_at
            "#,
            id,
            req.name,
            req.phone,
            req.avatar_url,
            req.status,
            req.skills.as_ref(),
            req.max_concurrent_calls,
            req.is_active
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<Agent> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            UPDATE agents 
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, 
                      skills, max_concurrent_calls, current_calls, total_calls_handled, 
                      average_call_duration, is_active, created_at, updated_at
            "#,
            id,
            status
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn increment_calls(&self, id: Uuid) -> Result<Agent> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            UPDATE agents 
            SET current_calls = current_calls + 1,
                total_calls_handled = total_calls_handled + 1,
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, 
                      skills, max_concurrent_calls, current_calls, total_calls_handled, 
                      average_call_duration, is_active, created_at, updated_at
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn decrement_calls(&self, id: Uuid) -> Result<Agent> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            UPDATE agents 
            SET current_calls = GREATEST(current_calls - 1, 0),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, 
                      skills, max_concurrent_calls, current_calls, total_calls_handled, 
                      average_call_duration, is_active, created_at, updated_at
            "#,
            id
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(agent)
    }

    pub async fn delete(&self, id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM agents WHERE id = $1", id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn count_by_company(&self, company_id: Uuid) -> Result<i64> {
        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM agents WHERE company_id = $1",
            company_id
        )
        .fetch_one(&self.pool)
        .await?
        .count
        .unwrap_or(0);

        Ok(count)
    }

    pub async fn count_available_by_company(&self, company_id: Uuid) -> Result<i64> {
        let count = sqlx::query!(
            r#"
            SELECT COUNT(*) as count FROM agents 
            WHERE company_id = $1 AND is_active = true AND status = 'online' 
                  AND current_calls < max_concurrent_calls
            "#,
            company_id
        )
        .fetch_one(&self.pool)
        .await?
        .count
        .unwrap_or(0);

        Ok(count)
    }
}
