use actix_web::{post, get, web, HttpResponse, HttpRequest};
use shared::{ApiResponse, LoginRequest, RegisterRequest, AuthToken, User, UserRole};
use crate::services::auth_service::AuthService;
use crate::config::Config;
use validator::Validate;

#[post("/auth/register")]
pub async fn register(
    req: web::Json<RegisterRequest>,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match auth_service.register_user(&req.into_inner()).await {
        Ok(user) => HttpResponse::Created().json(ApiResponse::success(user)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/auth/login")]
pub async fn login(
    req: web::Json<LoginRequest>,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match auth_service.login_user(&req.into_inner()).await {
        Ok(token) => HttpResponse::Ok().json(ApiResponse::success(token)),
        Err(e) => HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/auth/refresh")]
pub async fn refresh_token(
    req: HttpRequest,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    // Extract refresh token from Authorization header
    let auth_header = req.headers().get("Authorization");
    let token = match auth_header {
        Some(header) => {
            let header_str = header.to_str().unwrap_or("");
            if header_str.starts_with("Bearer ") {
                header_str[7..].to_string()
            } else {
                return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Invalid authorization header".to_string()));
            }
        }
        None => return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Missing authorization header".to_string())),
    };

    match auth_service.refresh_token(&token).await {
        Ok(new_token) => HttpResponse::Ok().json(ApiResponse::success(new_token)),
        Err(e) => HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/auth/logout")]
pub async fn logout(
    req: HttpRequest,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    // Extract token from Authorization header
    let auth_header = req.headers().get("Authorization");
    let token = match auth_header {
        Some(header) => {
            let header_str = header.to_str().unwrap_or("");
            if header_str.starts_with("Bearer ") {
                header_str[7..].to_string()
            } else {
                return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Invalid authorization header".to_string()));
            }
        }
        None => return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Missing authorization header".to_string())),
    };

    match auth_service.logout_user(&token).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("Successfully logged out".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/auth/forgot-password")]
pub async fn forgot_password(
    req: web::Json<shared::PasswordResetRequest>,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    match auth_service.forgot_password(&req.email).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("Password reset email sent".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/auth/reset-password")]
pub async fn reset_password(
    req: web::Json<shared::PasswordResetConfirm>,
    auth_service: web::Data<AuthService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match auth_service.reset_password(&req.token, &req.new_password).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("Password successfully reset".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}
