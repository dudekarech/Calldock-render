use shared::{Result, Company, CompanyStatus, CreateCompanyRequest, UpdateCompanyRequest, PaginatedResponse, Pagination};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

pub struct CompanyService {
    db_pool: PgPool,
}

impl CompanyService {
    pub fn new(db_pool: PgPool) -> Self {
        Self { db_pool }
    }

    pub async fn create_company(&self, req: &CreateCompanyRequest) -> Result<Company> {
        // Check if company UUID is available
        let existing_company = sqlx::query!(
            "SELECT id FROM companies WHERE uuid = $1",
            req.uuid
        )
        .fetch_optional(&self.db_pool)
        .await?;

        if existing_company.is_some() {
            return Err(shared::CallDockerError::Validation("Company UUID already taken".to_string()));
        }

        // Create company
        let company = sqlx::query!(
            r#"
            INSERT INTO companies (name, uuid, website, phone, address, status, settings)
            VALUES ($1, $2, $3, $4, $5, 'pending', '{}')
            RETURNING id, name, uuid, status, website, phone, address, logo_url, settings, created_at, updated_at
            "#,
            req.name,
            req.uuid,
            req.website,
            req.phone,
            req.address
        )
        .fetch_one(&self.db_pool)
        .await?;

        // Parse status
        let status = match company.status.as_str() {
            "pending" => CompanyStatus::Pending,
            "active" => CompanyStatus::Active,
            "suspended" => CompanyStatus::Suspended,
            "cancelled" => CompanyStatus::Cancelled,
            _ => CompanyStatus::Pending,
        };

        // Parse settings
        let settings: serde_json::Value = serde_json::from_str(&company.settings)
            .unwrap_or_else(|_| serde_json::json!({}));

        Ok(Company {
            id: company.id,
            name: company.name,
            uuid: company.uuid,
            status,
            website: company.website,
            phone: company.phone,
            address: company.address,
            logo_url: company.logo_url,
            settings: serde_json::from_value(settings).unwrap_or_default(),
            created_at: company.created_at,
            updated_at: company.updated_at,
        })
    }

    pub async fn get_company(&self, company_id: Uuid) -> Result<Company> {
        let company = sqlx::query!(
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, settings, created_at, updated_at
            FROM companies
            WHERE id = $1
            "#,
            company_id
        )
        .fetch_optional(&self.db_pool)
        .await?;

        let company = company.ok_or_else(|| {
            shared::CallDockerError::CompanyNotFound(company_id.to_string())
        })?;

        // Parse status
        let status = match company.status.as_str() {
            "pending" => CompanyStatus::Pending,
            "active" => CompanyStatus::Active,
            "suspended" => CompanyStatus::Suspended,
            "cancelled" => CompanyStatus::Cancelled,
            _ => CompanyStatus::Pending,
        };

        // Parse settings
        let settings: serde_json::Value = serde_json::from_str(&company.settings)
            .unwrap_or_else(|_| serde_json::json!({}));

        Ok(Company {
            id: company.id,
            name: company.name,
            uuid: company.uuid,
            status,
            website: company.website,
            phone: company.phone,
            address: company.address,
            logo_url: company.logo_url,
            settings: serde_json::from_value(settings).unwrap_or_default(),
            created_at: company.created_at,
            updated_at: company.updated_at,
        })
    }

    pub async fn update_company(&self, company_id: Uuid, req: &UpdateCompanyRequest) -> Result<Company> {
        // Update company
        sqlx::query!(
            r#"
            UPDATE companies 
            SET name = COALESCE($1, name),
                website = COALESCE($2, website),
                phone = COALESCE($3, phone),
                address = COALESCE($4, address),
                logo_url = COALESCE($5, logo_url),
                updated_at = NOW()
            WHERE id = $6
            "#,
            req.name,
            req.website,
            req.phone,
            req.address,
            req.logo_url,
            company_id
        )
        .execute(&self.db_pool)
        .await?;

        // Return updated company
        self.get_company(company_id).await
    }

    pub async fn list_companies(&self, page: u32, per_page: u32) -> Result<PaginatedResponse<Company>> {
        let offset = (page - 1) * per_page;

        // Get total count
        let total = sqlx::query!(
            "SELECT COUNT(*) as count FROM companies"
        )
        .fetch_one(&self.db_pool)
        .await?
        .count;

        // Get companies
        let companies = sqlx::query!(
            r#"
            SELECT id, name, uuid, status, website, phone, address, logo_url, settings, created_at, updated_at
            FROM companies
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
            "#,
            per_page as i64,
            offset as i64
        )
        .fetch_all(&self.db_pool)
        .await?;

        let companies: Vec<Company> = companies
            .into_iter()
            .map(|c| {
                let status = match c.status.as_str() {
                    "pending" => CompanyStatus::Pending,
                    "active" => CompanyStatus::Active,
                    "suspended" => CompanyStatus::Suspended,
                    "cancelled" => CompanyStatus::Cancelled,
                    _ => CompanyStatus::Pending,
                };

                let settings: serde_json::Value = serde_json::from_str(&c.settings)
                    .unwrap_or_else(|_| serde_json::json!({}));

                Company {
                    id: c.id,
                    name: c.name,
                    uuid: c.uuid,
                    status,
                    website: c.website,
                    phone: c.phone,
                    address: c.address,
                    logo_url: c.logo_url,
                    settings: serde_json::from_value(settings).unwrap_or_default(),
                    created_at: c.created_at,
                    updated_at: c.updated_at,
                }
            })
            .collect();

        let total_pages = (total as f64 / per_page as f64).ceil() as u32;

        Ok(PaginatedResponse {
            data: companies,
            pagination: Pagination {
                page,
                per_page,
                total: total as u64,
                total_pages,
            },
        })
    }

    pub async fn update_company_status(&self, company_id: Uuid, status: &str) -> Result<Company> {
        // Update company status
        sqlx::query!(
            r#"
            UPDATE companies 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            "#,
            status,
            company_id
        )
        .execute(&self.db_pool)
        .await?;

        // Return updated company
        self.get_company(company_id).await
    }
}
