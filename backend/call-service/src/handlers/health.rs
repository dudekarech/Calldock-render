use actix_web::{get, HttpResponse};
use shared::{ApiResponse, HealthCheck, ServiceHealth};
use chrono::Utc;

#[get("/health")]
pub async fn health_check() -> HttpResponse {
    let health = HealthCheck {
        status: "healthy".to_string(),
        timestamp: Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        services: vec![
            ServiceHealth {
                name: "call_service".to_string(),
                status: "healthy".to_string(),
                response_time: Some(0),
                error: None,
            },
            ServiceHealth {
                name: "webrtc_service".to_string(),
                status: "healthy".to_string(),
                response_time: Some(0),
                error: None,
            },
            ServiceHealth {
                name: "routing_service".to_string(),
                status: "healthy".to_string(),
                response_time: Some(0),
                error: None,
            },
        ],
    };

    HttpResponse::Ok().json(ApiResponse::success(health))
}
