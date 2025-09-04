use thiserror::Error;

#[derive(Error, Debug)]
pub enum CallDockerError {
    #[error("Authentication failed: {0}")]
    Authentication(String),

    #[error("Authorization failed: {0}")]
    Authorization(String),

    #[error("Database error: {0}")]
    Database(String),

    #[error("WebRTC error: {0}")]
    WebRTC(String),

    #[error("Call routing error: {0}")]
    CallRouting(String),

    #[error("IVR error: {0}")]
    IVR(String),

    #[error("Company not found: {0}")]
    CompanyNotFound(String),

    #[error("Agent not found: {0}")]
    AgentNotFound(String),

    #[error("Call not found: {0}")]
    CallNotFound(String),

    #[error("Invalid UUID: {0}")]
    InvalidUUID(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("Configuration error: {0}")]
    Configuration(String),

    #[error("Internal server error: {0}")]
    Internal(String),

    #[error("External service error: {0}")]
    External(String),
}

impl From<sqlx::Error> for CallDockerError {
    fn from(err: sqlx::Error) -> Self {
        CallDockerError::Database(err.to_string())
    }
}

impl From<serde_json::Error> for CallDockerError {
    fn from(err: serde_json::Error) -> Self {
        CallDockerError::Validation(err.to_string())
    }
}

impl From<uuid::Error> for CallDockerError {
    fn from(err: uuid::Error) -> Self {
        CallDockerError::InvalidUUID(err.to_string())
    }
}

impl From<jsonwebtoken::errors::Error> for CallDockerError {
    fn from(err: jsonwebtoken::errors::Error) -> Self {
        CallDockerError::Authentication(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, CallDockerError>;
