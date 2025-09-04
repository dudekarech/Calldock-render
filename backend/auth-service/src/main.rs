use actix_web::{App, HttpServer, middleware::Logger};
use actix_cors::Cors;
use actix_web_prom::PrometheusMetricsBuilder;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod database;
mod handlers;
mod middleware;
mod models;
mod repositories;
mod seed;
mod services;
mod utils;

#[cfg(test)]
mod test_auth;

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
    
    info!("Starting CallDocker Auth Service on port {}", config.server.port);

    // Initialize database connection
    let db_pool = database::initialize_database(&config.database.url, config.database.max_connections)
        .await
        .expect("Failed to initialize database");

    // Seed database with initial data
    seed::seed_database(&db_pool).await.expect("Failed to seed database");

    // Initialize Redis connection
    let redis_client = redis::Client::open(config.redis.url.clone())
        .expect("Failed to create Redis client");
    let redis_conn = redis_client.get_async_connection()
        .await
        .expect("Failed to connect to Redis");

    // Initialize services
    let auth_service = services::auth_service::AuthService::new(
        db_pool.clone(),
        redis_conn.clone(),
        config.clone(),
    );
    let user_service = services::user_service::UserService::new(db_pool.clone());
    let company_service = services::company_service::CompanyService::new(db_pool.clone());
    let agent_service = services::agent_service::AgentService::new(db_pool.clone());

    // Create Prometheus metrics
    let prometheus = PrometheusMetricsBuilder::new("auth_service")
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
            .app_data(actix_web::web::Data::new(auth_service.clone()))
            .app_data(actix_web::web::Data::new(user_service.clone()))
            .app_data(actix_web::web::Data::new(company_service.clone()))
            .app_data(actix_web::web::Data::new(agent_service.clone()))
            .app_data(actix_web::web::Data::new(db_pool.clone()))
            .app_data(actix_web::web::Data::new(redis_conn.clone()))
            .service(handlers::health::health_check)
            .service(handlers::health::detailed_health_check)
            .service(handlers::health::ready_check)
            .service(handlers::auth::register)
            .service(handlers::auth::login)
            .service(handlers::auth::refresh_token)
            .service(handlers::auth::logout)
            .service(handlers::auth::forgot_password)
            .service(handlers::auth::reset_password)
            .service(handlers::users::get_profile)
            .service(handlers::users::update_profile)
            .service(handlers::users::change_password)
            .service(handlers::users::list_users)
            .service(handlers::companies::create_company)
            .service(handlers::companies::get_company)
            .service(handlers::companies::update_company)
            .service(handlers::companies::list_companies)
            .service(handlers::companies::update_company_status)
            .service(handlers::agents::create_agent)
            .service(handlers::agents::get_agent)
            .service(handlers::agents::update_agent)
            .service(handlers::agents::list_agents)
            .service(handlers::agents::delete_agent)
    })
    .bind(format!("0.0.0.0:{}", config.server.port))?
    .run()
    .await
}
