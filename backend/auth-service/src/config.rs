use serde::Deserialize;
use std::env;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub jwt: JwtConfig,
    pub email: EmailConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub min_connections: u32,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RedisConfig {
    pub url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JwtConfig {
    pub secret: String,
    pub access_token_expiry: i64,
    pub refresh_token_expiry: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmailConfig {
    pub smtp_url: String,
    pub from_email: String,
    pub from_name: String,
}

impl Config {
    pub fn load() -> Result<Self, config::ConfigError> {
        let mut builder = config::Config::builder();

        // Load from environment variables
        builder = builder.add_source(config::Environment::default().separator("__"));

        // Load from .env file if it exists
        if let Ok(_) = dotenv::dotenv() {
            builder = builder.add_source(config::Environment::default().separator("__"));
        }

        // Set defaults
        builder = builder
            .set_default("server.port", 8080)?
            .set_default("server.host", "0.0.0.0")?
            .set_default("database.max_connections", 10)?
            .set_default("database.min_connections", 1)?
            .set_default("jwt.access_token_expiry", 3600)? // 1 hour
            .set_default("jwt.refresh_token_expiry", 2592000)?; // 30 days

        // Build and deserialize
        let config = builder.build()?;
        config.try_deserialize()
    }

    pub fn from_env() -> Self {
        Self {
            server: ServerConfig {
                port: env::var("PORT")
                    .unwrap_or_else(|_| "8080".to_string())
                    .parse()
                    .unwrap_or(8080),
                host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string()),
            },
            database: DatabaseConfig {
                url: env::var("DATABASE_URL")
                    .expect("DATABASE_URL must be set"),
                max_connections: env::var("DATABASE_MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "10".to_string())
                    .parse()
                    .unwrap_or(10),
                min_connections: env::var("DATABASE_MIN_CONNECTIONS")
                    .unwrap_or_else(|_| "1".to_string())
                    .parse()
                    .unwrap_or(1),
            },
            redis: RedisConfig {
                url: env::var("REDIS_URL")
                    .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            },
            jwt: JwtConfig {
                secret: env::var("JWT_SECRET")
                    .expect("JWT_SECRET must be set"),
                access_token_expiry: env::var("JWT_ACCESS_TOKEN_EXPIRY")
                    .unwrap_or_else(|_| "3600".to_string())
                    .parse()
                    .unwrap_or(3600),
                refresh_token_expiry: env::var("JWT_REFRESH_TOKEN_EXPIRY")
                    .unwrap_or_else(|_| "2592000".to_string())
                    .parse()
                    .unwrap_or(2592000),
            },
            email: EmailConfig {
                smtp_url: env::var("SMTP_URL")
                    .unwrap_or_else(|_| "smtp://localhost:587".to_string()),
                from_email: env::var("FROM_EMAIL")
                    .unwrap_or_else(|_| "noreply@calldocker.com".to_string()),
                from_name: env::var("FROM_NAME")
                    .unwrap_or_else(|_| "CallDocker".to_string()),
            },
        }
    }
}
