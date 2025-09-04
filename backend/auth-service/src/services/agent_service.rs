use shared::{Result, Agent, AgentStatus, CreateAgentRequest, UpdateAgentRequest, PaginatedResponse, Pagination};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

pub struct AgentService {
    db_pool: PgPool,
}

impl AgentService {
    pub fn new(db_pool: PgPool) -> Self {
        Self { db_pool }
    }

    pub async fn create_agent(&self, req: &CreateAgentRequest) -> Result<Agent> {
        // Create user for the agent
        let user_id = sqlx::query!(
            r#"
            INSERT INTO users (email, password_hash, role, company_id)
            VALUES ($1, $2, 'agent', $3)
            RETURNING id
            "#,
            req.email,
            "temp_password_hash", // TODO: Generate temporary password
            Uuid::nil() // TODO: Get from context
        )
        .fetch_one(&self.db_pool)
        .await?
        .id;

        // Create agent
        let agent = sqlx::query!(
            r#"
            INSERT INTO agents (user_id, company_id, name, email, phone, avatar_url, skills, max_concurrent_calls, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'offline')
            RETURNING id, user_id, company_id, name, email, phone, avatar_url, status, skills, max_concurrent_calls, current_calls, total_calls_handled, average_call_duration, is_active, created_at, updated_at
            "#,
            user_id,
            Uuid::nil(), // TODO: Get from context
            req.name,
            req.email,
            req.phone,
            req.avatar_url,
            &req.skills,
            req.max_concurrent_calls as i32
        )
        .fetch_one(&self.db_pool)
        .await?;

        // Parse status
        let status = match agent.status.as_str() {
            "online" => AgentStatus::Online,
            "offline" => AgentStatus::Offline,
            "busy" => AgentStatus::Busy,
            "away" => AgentStatus::Away,
            _ => AgentStatus::Offline,
        };

        Ok(Agent {
            id: agent.id,
            user_id: agent.user_id,
            company_id: agent.company_id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            avatar_url: agent.avatar_url,
            status,
            skills: agent.skills,
            max_concurrent_calls: agent.max_concurrent_calls as u32,
            current_calls: agent.current_calls as u32,
            total_calls_handled: agent.total_calls_handled as u64,
            average_call_duration: agent.average_call_duration.map(|d| d as u64),
            is_active: agent.is_active,
            created_at: agent.created_at,
            updated_at: agent.updated_at,
        })
    }

    pub async fn get_agent(&self, agent_id: Uuid) -> Result<Agent> {
        let agent = sqlx::query!(
            r#"
            SELECT id, user_id, company_id, name, email, phone, avatar_url, status, skills, max_concurrent_calls, current_calls, total_calls_handled, average_call_duration, is_active, created_at, updated_at
            FROM agents
            WHERE id = $1
            "#,
            agent_id
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let agent = agent.ok_or_else(|| {
            shared::CallDockerError::AgentNotFound(agent_id.to_string())
        })?;

        // Parse status
        let status = match agent.status.as_str() {
            "online" => AgentStatus::Online,
            "offline" => AgentStatus::Offline,
            "busy" => AgentStatus::Busy,
            "away" => AgentStatus::Away,
            _ => AgentStatus::Offline,
        };

        Ok(Agent {
            id: agent.id,
            user_id: agent.user_id,
            company_id: agent.company_id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            avatar_url: agent.avatar_url,
            status,
            skills: agent.skills,
            max_concurrent_calls: agent.max_concurrent_calls as u32,
            current_calls: agent.current_calls as u32,
            total_calls_handled: agent.total_calls_handled as u64,
            average_call_duration: agent.average_call_duration.map(|d| d as u64),
            is_active: agent.is_active,
            created_at: agent.created_at,
            updated_at: agent.updated_at,
        })
    }

    pub async fn update_agent(&self, agent_id: Uuid, req: &UpdateAgentRequest) -> Result<Agent> {
        // Update agent
        sqlx::query!(
            r#"
            UPDATE agents 
            SET name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                avatar_url = COALESCE($3, avatar_url),
                skills = COALESCE($4, skills),
                max_concurrent_calls = COALESCE($5, max_concurrent_calls),
                is_active = COALESCE($6, is_active),
                updated_at = NOW()
            WHERE id = $7
            "#,
            req.name,
            req.phone,
            req.avatar_url,
            req.skills.as_ref(),
            req.max_concurrent_calls.map(|c| c as i32),
            req.is_active,
            agent_id
        )
        .execute(&self.db_pool)
        .await?;

        // Return updated agent
        self.get_agent(agent_id).await
    }

    pub async fn list_agents(&self, company_id: Option<Uuid>, page: u32, per_page: u32) -> Result<PaginatedResponse<Agent>> {
        let offset = (page - 1) * per_page;

        // Build query based on company_id filter
        let (total_query, agents_query) = if let Some(cid) = company_id {
            (
                "SELECT COUNT(*) as count FROM agents WHERE company_id = $1",
                r#"
                SELECT id, user_id, company_id, name, email, phone, avatar_url, status, skills, max_concurrent_calls, current_calls, total_calls_handled, average_call_duration, is_active, created_at, updated_at
                FROM agents
                WHERE company_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
                "#
            )
        } else {
            (
                "SELECT COUNT(*) as count FROM agents",
                r#"
                SELECT id, user_id, company_id, name, email, phone, avatar_url, status, skills, max_concurrent_calls, current_calls, total_calls_handled, average_call_duration, is_active, created_at, updated_at
                FROM agents
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2
                "#
            )
        };

        // Get total count
        let total = if let Some(cid) = company_id {
            sqlx::query!(total_query, cid)
                .fetch_one(&self.db_pool)
                .await?
                .count
        } else {
            sqlx::query!(total_query)
                .fetch_one(&self.db_pool)
                .await?
                .count
        };

        // Get agents
        let agents = if let Some(cid) = company_id {
            sqlx::query!(agents_query, cid, per_page as i64, offset as i64)
                .fetch_all(&self.db_pool)
                .await?
        } else {
            sqlx::query!(agents_query, per_page as i64, offset as i64)
                .fetch_all(&self.db_pool)
                .await?
        };

        let agents: Vec<Agent> = agents
            .into_iter()
            .map(|a| {
                let status = match a.status.as_str() {
                    "online" => AgentStatus::Online,
                    "offline" => AgentStatus::Offline,
                    "busy" => AgentStatus::Busy,
                    "away" => AgentStatus::Away,
                    _ => AgentStatus::Offline,
                };

                Agent {
                    id: a.id,
                    user_id: a.user_id,
                    company_id: a.company_id,
                    name: a.name,
                    email: a.email,
                    phone: a.phone,
                    avatar_url: a.avatar_url,
                    status,
                    skills: a.skills,
                    max_concurrent_calls: a.max_concurrent_calls as u32,
                    current_calls: a.current_calls as u32,
                    total_calls_handled: a.total_calls_handled as u64,
                    average_call_duration: a.average_call_duration.map(|d| d as u64),
                    is_active: a.is_active,
                    created_at: a.created_at,
                    updated_at: a.updated_at,
                }
            })
            .collect();

        let total_pages = (total as f64 / per_page as f64).ceil() as u32;

        Ok(PaginatedResponse {
            data: agents,
            pagination: Pagination {
                page,
                per_page,
                total: total as u64,
                total_pages,
            },
        })
    }

    pub async fn delete_agent(&self, agent_id: Uuid) -> Result<()> {
        // Get agent to find user_id
        let agent = sqlx::query!(
            "SELECT user_id FROM agents WHERE id = $1",
            agent_id
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let agent = agent.ok_or_else(|| {
            shared::CallDockerError::AgentNotFound(agent_id.to_string())
        })?;

        // Delete agent and associated user
        sqlx::query!(
            "DELETE FROM agents WHERE id = $1",
            agent_id
        )
        .execute(&self.db_pool)
        .await?;

        sqlx::query!(
            "DELETE FROM users WHERE id = $1",
            agent.user_id
        )
        .execute(&self.db_pool)
        .await?;

        Ok(())
    }
}
