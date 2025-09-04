use sqlx::PgPool;
use bcrypt::{hash, DEFAULT_COST};
use uuid::Uuid;
use shared::UserRole;
use tracing::info;

pub async fn seed_database(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    info!("Seeding database with initial data...");

    // Check if super admin already exists
    let existing_admin = sqlx::query!(
        "SELECT id FROM users WHERE email = 'admin@calldocker.com'"
    )
    .fetch_optional(pool)
    .await?;

    if existing_admin.is_some() {
        info!("Super admin already exists, skipping seed data");
        return Ok(());
    }

    // Create default company
    let company_id = sqlx::query!(
        r#"
        INSERT INTO companies (name, uuid, status, settings)
        VALUES ('CallDocker', 'calldocker', 'active', '{}')
        RETURNING id
        "#,
    )
    .fetch_one(pool)
    .await?
    .id;

    info!("Created default company: {}", company_id);

    // Create super admin user
    let password_hash = hash("admin123", DEFAULT_COST)?;
    
    let admin_id = sqlx::query!(
        r#"
        INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, is_active)
        VALUES ('admin@calldocker.com', $1, 'super_admin', $2, 'Super', 'Admin', true)
        RETURNING id
        "#,
        password_hash,
        company_id
    )
    .fetch_one(pool)
    .await?
    .id;

    info!("Created super admin user: {}", admin_id);

    // Create demo company
    let demo_company_id = sqlx::query!(
        r#"
        INSERT INTO companies (name, uuid, status, settings)
        VALUES ('Demo Company', 'demo-company', 'active', '{}')
        RETURNING id
        "#,
    )
    .fetch_one(pool)
    .await?
    .id;

    info!("Created demo company: {}", demo_company_id);

    // Create demo company admin
    let demo_admin_password = hash("demo123", DEFAULT_COST)?;
    
    let demo_admin_id = sqlx::query!(
        r#"
        INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, is_active)
        VALUES ('admin@demo-company.com', $1, 'company_admin', $2, 'Demo', 'Admin', true)
        RETURNING id
        "#,
        demo_admin_password,
        demo_company_id
    )
    .fetch_one(pool)
    .await?
    .id;

    info!("Created demo company admin: {}", demo_admin_id);

    // Create demo agent
    let demo_agent_password = hash("agent123", DEFAULT_COST)?;
    
    let demo_agent_user_id = sqlx::query!(
        r#"
        INSERT INTO users (email, password_hash, role, company_id, first_name, last_name, is_active)
        VALUES ('agent@demo-company.com', $1, 'agent', $2, 'Demo', 'Agent', true)
        RETURNING id
        "#,
        demo_agent_password,
        demo_company_id
    )
    .fetch_one(pool)
    .await?
    .id;

    let demo_agent_id = sqlx::query!(
        r#"
        INSERT INTO agents (user_id, company_id, name, email, phone, status, skills, max_concurrent_calls, is_active)
        VALUES ($1, $2, 'Demo Agent', 'agent@demo-company.com', '+1234567890', 'online', $3, 2, true)
        RETURNING id
        "#,
        demo_agent_user_id,
        demo_company_id,
        &vec!["general".to_string(), "support".to_string()]
    )
    .fetch_one(pool)
    .await?
    .id;

    info!("Created demo agent: {}", demo_agent_id);

    info!("Database seeding completed successfully");
    info!("Default credentials:");
    info!("  Super Admin: admin@calldocker.com / admin123");
    info!("  Demo Admin: admin@demo-company.com / demo123");
    info!("  Demo Agent: agent@demo-company.com / agent123");

    Ok(())
}

pub async fn clear_seed_data(pool: &PgPool) -> Result<(), Box<dyn std::error::Error>> {
    info!("Clearing seed data...");

    // Delete in reverse order to respect foreign key constraints
    sqlx::query!("DELETE FROM agents WHERE email = 'agent@demo-company.com'")
        .execute(pool)
        .await?;

    sqlx::query!("DELETE FROM users WHERE email = 'agent@demo-company.com'")
        .execute(pool)
        .await?;

    sqlx::query!("DELETE FROM users WHERE email = 'admin@demo-company.com'")
        .execute(pool)
        .await?;

    sqlx::query!("DELETE FROM companies WHERE uuid = 'demo-company'")
        .execute(pool)
        .await?;

    sqlx::query!("DELETE FROM users WHERE email = 'admin@calldocker.com'")
        .execute(pool)
        .await?;

    sqlx::query!("DELETE FROM companies WHERE uuid = 'calldocker'")
        .execute(pool)
        .await?;

    info!("Seed data cleared successfully");
    Ok(())
}
