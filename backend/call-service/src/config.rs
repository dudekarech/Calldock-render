use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub webrtc: WebRTCConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebRTCConfig {
    pub ice_servers: Vec<IceServerConfig>,
    pub max_connections: usize,
    pub connection_timeout: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IceServerConfig {
    pub urls: Vec<String>,
    pub username: Option<String>,
    pub credential: Option<String>,
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        dotenv::dotenv().ok();

        let config = Config {
            server: ServerConfig {
                port: env::var("CALL_SERVICE_PORT")
                    .unwrap_or_else(|_| "8081".to_string())
                    .parse()
                    .unwrap_or(8081),
                host: env::var("CALL_SERVICE_HOST")
                    .unwrap_or_else(|_| "0.0.0.0".to_string()),
            },
            database: DatabaseConfig {
                url: env::var("DATABASE_URL")
                    .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/calldocker".to_string()),
            },
            redis: RedisConfig {
                url: env::var("REDIS_URL")
                    .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            },
            webrtc: WebRTCConfig {
                ice_servers: vec![
                    IceServerConfig {
                        urls: vec!["stun:stun.l.google.com:19302".to_string()],
                        username: None,
                        credential: None,
                    },
                    IceServerConfig {
                        urls: vec!["stun:stun1.l.google.com:19302".to_string()],
                        username: None,
                        credential: None,
                    },
                ],
                max_connections: env::var("WEBRTC_MAX_CONNECTIONS")
                    .unwrap_or_else(|_| "1000".to_string())
                    .parse()
                    .unwrap_or(1000),
                connection_timeout: env::var("WEBRTC_CONNECTION_TIMEOUT")
                    .unwrap_or_else(|_| "30000".to_string())
                    .parse()
                    .unwrap_or(30000),
            },
        };

        Ok(config)
    }
}
