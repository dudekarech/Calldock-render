use sqlx::PgPool;
use uuid::Uuid;
use shared::Result;
use crate::models::{Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyStatus};

#[derive(Clone)]
pub struct CompanyRepository {
    pool: PgPool,
}

impl CompanyRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Company>> {
        let company = sqlx::query_as!(
            Company,
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, 
                   settings, created_at, updated_at
            FROM companies 
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn find_by_uuid(&self, uuid: &str) -> Result<Option<Company>> {
        let company = sqlx::query_as!(
            Company,
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, 
                   settings, created_at, updated_at
            FROM companies 
            WHERE uuid = $1
            "#,
            uuid
        )
        .fetch_optional(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn create(&self, req: &CreateCompanyRequest) -> Result<Company> {
        let company = sqlx::query_as!(
            Company,
            r#"
            INSERT INTO companies (name, uuid, website, phone, address, logo_url, settings)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, name, uuid, status, website, phone, address, logo_url, 
                      settings, created_at, updated_at
            "#,
            req.name,
            req.uuid,
            req.website,
            req.phone,
            req.address,
            req.logo_url,
            req.settings.as_ref().unwrap_or(&serde_json::json!({}))
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn update(&self, id: Uuid, req: &UpdateCompanyRequest) -> Result<Company> {
        let company = sqlx::query_as!(
            Company,
            r#"
            UPDATE companies 
            SET name = COALESCE($2, name),
                website = COALESCE($3, website),
                phone = COALESCE($4, phone),
                address = COALESCE($5, address),
                logo_url = COALESCE($6, logo_url),
                settings = COALESCE($7, settings),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, uuid, status, website, phone, address, logo_url, 
                      settings, created_at, updated_at
            "#,
            id,
            req.name,
            req.website,
            req.phone,
            req.address,
            req.logo_url,
            req.settings.as_ref()
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn update_status(&self, id: Uuid, status: &str) -> Result<Company> {
        let company = sqlx::query_as!(
            Company,
            r#"
            UPDATE companies 
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, uuid, status, website, phone, address, logo_url, 
                      settings, created_at, updated_at
            "#,
            id,
            status
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(company)
    }

    pub async fn delete(&self, id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM companies WHERE id = $1", id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn list_all(&self, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Company>> {
        let limit = limit.unwrap_or(100);
        let offset = offset.unwrap_or(0);

        let companies = sqlx::query_as!(
            Company,
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, 
                   settings, created_at, updated_at
            FROM companies 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(companies)
    }

    pub async fn list_by_status(&self, status: &str) -> Result<Vec<Company>> {
        let companies = sqlx::query_as!(
            Company,
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, 
                   settings, created_at, updated_at
            FROM companies 
            WHERE status = $1
            ORDER BY created_at DESC
            "#,
            status
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(companies)
    }

    pub async fn count_all(&self) -> Result<i64> {
        let count = sqlx::query!("SELECT COUNT(*) as count FROM companies")
            .fetch_one(&self.pool)
            .await?
            .count
            .unwrap_or(0);

        Ok(count)
    }

    pub async fn count_by_status(&self, status: &str) -> Result<i64> {
        let count = sqlx::query!(
            "SELECT COUNT(*) as count FROM companies WHERE status = $1",
            status
        )
        .fetch_one(&self.pool)
        .await?
        .count
        .unwrap_or(0);

        Ok(count)
    }
}
