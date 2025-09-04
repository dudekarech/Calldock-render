use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;
use tracing::{info, error};

pub struct Database {
    pub pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str, max_connections: u32) -> Result<Self, sqlx::Error> {
        info!("Connecting to database...");
        
        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect(database_url)
            .await?;

        info!("Database connection established successfully");

        Ok(Self { pool })
    }

    pub async fn run_migrations(&self) -> Result<(), sqlx::Error> {
        info!("Running database migrations...");
        
        sqlx::migrate!("../../migrations")
            .run(&self.pool)
            .await?;

        info!("Database migrations completed successfully");
        Ok(())
    }

    pub async fn health_check(&self) -> Result<(), sqlx::Error> {
        sqlx::query("SELECT 1").execute(&self.pool).await?;
        Ok(())
    }

    pub async fn create_connection_pool(
        database_url: &str,
        max_connections: u32,
    ) -> Result<PgPool, sqlx::Error> {
        let pool = PgPoolOptions::new()
            .max_connections(max_connections)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(30))
            .idle_timeout(Duration::from_secs(600))
            .max_lifetime(Duration::from_secs(1800))
            .connect(database_url)
            .await?;

        Ok(pool)
    }
}

pub async fn initialize_database(
    database_url: &str,
    max_connections: u32,
) -> Result<PgPool, Box<dyn std::error::Error>> {
    info!("Initializing database...");

    // Create database instance
    let db = Database::new(database_url, max_connections).await?;

    // Run migrations
    db.run_migrations().await?;

    // Health check
    db.health_check().await?;

    info!("Database initialization completed successfully");

    Ok(db.pool)
}

#[cfg(test)]
pub async fn create_test_database() -> Result<PgPool, Box<dyn std::error::Error>> {
    use std::env;
    
    let database_url = env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://calldocker:calldocker_dev@localhost:5432/calldocker_test".to_string());
    
    let pool = Database::create_connection_pool(&database_url, 5).await?;
    
    // Run migrations for test database
    sqlx::migrate!("../../migrations")
        .run(&pool)
        .await?;
    
    Ok(pool)
}
