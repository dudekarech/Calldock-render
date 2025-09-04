use actix_web::{get, put, web, HttpResponse};
use shared::{ApiResponse, UserProfile, UpdateProfileRequest, ChangePasswordRequest};
use crate::services::user_service::UserService;
use crate::middleware::auth::get_claims;
use validator::Validate;
use uuid::Uuid;

#[get("/users/profile")]
pub async fn get_profile(
    req: actix_web::HttpRequest,
    user_service: web::Data<UserService>,
) -> HttpResponse {
    // Extract user ID from JWT token
    let claims = match get_claims(&req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    match user_service.get_user_profile(claims.user_id).await {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse::success(profile)),
        Err(e) => HttpResponse::NotFound().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[put("/users/profile")]
pub async fn update_profile(
    req: web::Json<UpdateProfileRequest>,
    http_req: actix_web::HttpRequest,
    user_service: web::Data<UserService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    // Extract user ID from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    match user_service.update_user_profile(claims.user_id, &req.into_inner()).await {
        Ok(profile) => HttpResponse::Ok().json(ApiResponse::success(profile)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[put("/users/change-password")]
pub async fn change_password(
    req: web::Json<ChangePasswordRequest>,
    http_req: actix_web::HttpRequest,
    user_service: web::Data<UserService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    // Extract user ID from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    match user_service.change_password(claims.user_id, &req.current_password, &req.new_password).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("Password changed successfully".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/users")]
pub async fn list_users(
    req: actix_web::HttpRequest,
    user_service: web::Data<UserService>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> HttpResponse {
    // Extract user ID from JWT token
    let claims = match get_claims(&req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Only company admins and super admins can list users
    if !claims.role.is_company_admin() && !claims.role.is_super_admin() {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Insufficient permissions".to_string()));
    }

    // Get query parameters
    let limit = query.get("limit").and_then(|s| s.parse::<i64>().ok()).unwrap_or(100);
    let offset = query.get("offset").and_then(|s| s.parse::<i64>().ok()).unwrap_or(0);

    // For company admins, only show users from their company
    let company_id = if claims.role.is_super_admin() {
        None // Super admins can see all users
    } else {
        claims.company_id // Company admins can only see their company's users
    };

    match user_service.list_users(company_id, limit, offset).await {
        Ok(users) => HttpResponse::Ok().json(ApiResponse::success(users)),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string())),
    }
}
