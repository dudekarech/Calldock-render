use actix_web::{App, HttpServer, middleware::Logger, web};
use actix_cors::Cors;
use actix_web_prom::PrometheusMetricsBuilder;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod handlers;
mod services;
mod websocket;
mod webrtc;

#[cfg(test)]
mod test_webrtc;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = config::Config::load().expect("Failed to load configuration");
    
    info!("Starting CallDocker Call Service on port {}", config.server.port);

    // Initialize database connection
    let db_pool = sqlx::PgPool::connect(&config.database.url)
        .await
        .expect("Failed to connect to database");

    // Initialize Redis connection
    let redis_client = redis::Client::open(config.redis.url.clone())
        .expect("Failed to create Redis client");
    let redis_conn = redis_client.get_async_connection()
        .await
        .expect("Failed to connect to Redis");

    // Initialize services
    let call_service = services::call_service::CallService::new(
        db_pool.clone(),
        redis_conn.clone(),
        config.clone(),
    );

    // Create Prometheus metrics
    let prometheus = PrometheusMetricsBuilder::new("call_service")
        .endpoint("/metrics")
        .build()
        .unwrap();

    // Start HTTP server
    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .wrap(prometheus.clone())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .max_age(3600)
            )
            .app_data(web::Data::new(call_service.clone()))
            .service(handlers::health::health_check)
            .service(handlers::calls::create_call)
            .service(handlers::calls::get_call)
            .service(handlers::calls::list_calls)
            .service(handlers::calls::update_call)
            .service(handlers::calls::end_call)
            .service(handlers::webrtc::offer)
            .service(handlers::webrtc::answer)
            .service(handlers::webrtc::ice_candidate)
            .service(handlers::websocket::ws_route)
    })
    .bind(format!("0.0.0.0:{}", config.server.port))?
    .run()
    .await
}
