use actix_web::{get, HttpResponse, web};
use shared::{ApiResponse, HealthCheck, ServiceHealth};
use chrono::Utc;
use sqlx::PgPool;
use redis::aio::Connection;

#[get("/health")]
pub async fn health_check(
    db_pool: web::Data<PgPool>,
    redis_conn: web::Data<Connection>,
) -> HttpResponse {
    let mut services = vec![
        ServiceHealth {
            name: "auth_service".to_string(),
            status: "healthy".to_string(),
            response_time: None,
            error: None,
        }
    ];

    // Check database health
    let db_start = std::time::Instant::now();
    let db_result = sqlx::query("SELECT 1").execute(db_pool.get_ref()).await;
    let db_response_time = db_start.elapsed().as_millis() as u64;
    
    match db_result {
        Ok(_) => {
            services.push(ServiceHealth {
                name: "database".to_string(),
                status: "healthy".to_string(),
                response_time: Some(db_response_time),
                error: None,
            });
        }
        Err(e) => {
            services.push(ServiceHealth {
                name: "database".to_string(),
                status: "unhealthy".to_string(),
                response_time: Some(db_response_time),
                error: Some(e.to_string()),
            });
        }
    }

    // Check Redis health
    let redis_start = std::time::Instant::now();
    let redis_result = redis::cmd("PING").execute_async(redis_conn.get_ref()).await;
    let redis_response_time = redis_start.elapsed().as_millis() as u64;
    
    match redis_result {
        Ok(_) => {
            services.push(ServiceHealth {
                name: "redis".to_string(),
                status: "healthy".to_string(),
                response_time: Some(redis_response_time),
                error: None,
            });
        }
        Err(e) => {
            services.push(ServiceHealth {
                name: "redis".to_string(),
                status: "unhealthy".to_string(),
                response_time: Some(redis_response_time),
                error: Some(e.to_string()),
            });
        }
    }

    // Determine overall status
    let overall_status = if services.iter().all(|s| s.status == "healthy") {
        "healthy"
    } else {
        "degraded"
    };

    let health = HealthCheck {
        status: overall_status.to_string(),
        timestamp: Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        services,
    };

    let status_code = if overall_status == "healthy" {
        actix_web::http::StatusCode::OK
    } else {
        actix_web::http::StatusCode::SERVICE_UNAVAILABLE
    };

    HttpResponse::build(status_code).json(ApiResponse::success(health))
}

#[get("/health/detailed")]
pub async fn detailed_health_check(
    db_pool: web::Data<PgPool>,
    redis_conn: web::Data<Connection>,
) -> HttpResponse {
    let mut detailed_services = vec![];

    // Database detailed check
    let db_start = std::time::Instant::now();
    let db_result = sqlx::query("SELECT version()").fetch_one(db_pool.get_ref()).await;
    let db_response_time = db_start.elapsed().as_millis() as u64;
    
    match db_result {
        Ok(row) => {
            let version: String = row.get(0);
            detailed_services.push(ServiceHealth {
                name: "database".to_string(),
                status: "healthy".to_string(),
                response_time: Some(db_response_time),
                error: None,
            });
        }
        Err(e) => {
            detailed_services.push(ServiceHealth {
                name: "database".to_string(),
                status: "unhealthy".to_string(),
                response_time: Some(db_response_time),
                error: Some(e.to_string()),
            });
        }
    }

    // Redis detailed check
    let redis_start = std::time::Instant::now();
    let redis_result = redis::cmd("INFO").execute_async(redis_conn.get_ref()).await;
    let redis_response_time = redis_start.elapsed().as_millis() as u64;
    
    match redis_result {
        Ok(_) => {
            detailed_services.push(ServiceHealth {
                name: "redis".to_string(),
                status: "healthy".to_string(),
                response_time: Some(redis_response_time),
                error: None,
            });
        }
        Err(e) => {
            detailed_services.push(ServiceHealth {
                name: "redis".to_string(),
                status: "unhealthy".to_string(),
                response_time: Some(redis_response_time),
                error: Some(e.to_string()),
            });
        }
    }

    let overall_status = if detailed_services.iter().all(|s| s.status == "healthy") {
        "healthy"
    } else {
        "degraded"
    };

    let health = HealthCheck {
        status: overall_status.to_string(),
        timestamp: Utc::now(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        services: detailed_services,
    };

    let status_code = if overall_status == "healthy" {
        actix_web::http::StatusCode::OK
    } else {
        actix_web::http::StatusCode::SERVICE_UNAVAILABLE
    };

    HttpResponse::build(status_code).json(ApiResponse::success(health))
}

#[get("/ready")]
pub async fn ready_check(
    db_pool: web::Data<PgPool>,
    redis_conn: web::Data<Connection>,
) -> HttpResponse {
    // Check if all critical services are ready
    let db_ready = sqlx::query("SELECT 1").execute(db_pool.get_ref()).await.is_ok();
    let redis_ready = redis::cmd("PING").execute_async(redis_conn.get_ref()).await.is_ok();
    
    if db_ready && redis_ready {
        HttpResponse::Ok().json(ApiResponse::success("ready"))
    } else {
        HttpResponse::ServiceUnavailable().json(ApiResponse::<()>::error("not ready"))
    }
}
