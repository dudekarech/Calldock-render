use actix_web::{get, post, put, web, HttpResponse};
use shared::{ApiResponse, Company, CreateCompanyRequest, UpdateCompanyRequest, PaginatedResponse};
use crate::services::company_service::CompanyService;
use crate::middleware::auth::get_claims;
use validator::Validate;
use uuid::Uuid;

#[post("/companies")]
pub async fn create_company(
    req: web::Json<CreateCompanyRequest>,
    http_req: actix_web::HttpRequest,
    company_service: web::Data<CompanyService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    // Extract user claims from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Only super admins can create companies
    if !claims.role.is_super_admin() {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Only super admins can create companies".to_string()));
    }

    match company_service.create_company(&req.into_inner()).await {
        Ok(company) => HttpResponse::Created().json(ApiResponse::success(company)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/companies/{company_id}")]
pub async fn get_company(
    path: web::Path<uuid::Uuid>,
    http_req: actix_web::HttpRequest,
    company_service: web::Data<CompanyService>,
) -> HttpResponse {
    let company_id = path.into_inner();

    // Extract user claims from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Check if user has access to this company
    if !claims.role.is_super_admin() && claims.company_id != Some(company_id) {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Access denied to this company".to_string()));
    }

    match company_service.get_company(company_id).await {
        Ok(company) => HttpResponse::Ok().json(ApiResponse::success(company)),
        Err(e) => HttpResponse::NotFound().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[put("/companies/{company_id}")]
pub async fn update_company(
    path: web::Path<uuid::Uuid>,
    req: web::Json<UpdateCompanyRequest>,
    http_req: actix_web::HttpRequest,
    company_service: web::Data<CompanyService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    let company_id = path.into_inner();

    // Extract user claims from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Check if user has access to this company
    if !claims.role.is_super_admin() && claims.company_id != Some(company_id) {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Access denied to this company".to_string()));
    }

    match company_service.update_company(company_id, &req.into_inner()).await {
        Ok(company) => HttpResponse::Ok().json(ApiResponse::success(company)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/companies")]
pub async fn list_companies(
    query: web::Query<std::collections::HashMap<String, String>>,
    http_req: actix_web::HttpRequest,
    company_service: web::Data<CompanyService>,
) -> HttpResponse {
    // Extract user claims from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Only super admins can list all companies
    if !claims.role.is_super_admin() {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Only super admins can list all companies".to_string()));
    }

    let page = query.get("page").and_then(|p| p.parse::<u32>().ok()).unwrap_or(1);
    let per_page = query.get("per_page").and_then(|p| p.parse::<u32>().ok()).unwrap_or(10);

    match company_service.list_companies(page, per_page).await {
        Ok(companies) => HttpResponse::Ok().json(ApiResponse::success(companies)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[put("/companies/{company_id}/status")]
pub async fn update_company_status(
    path: web::Path<uuid::Uuid>,
    req: web::Json<serde_json::Value>,
    http_req: actix_web::HttpRequest,
    company_service: web::Data<CompanyService>,
) -> HttpResponse {
    let company_id = path.into_inner();

    // Extract user claims from JWT token
    let claims = match get_claims(&http_req) {
        Ok(claims) => claims,
        Err(e) => return HttpResponse::Unauthorized().json(ApiResponse::<()>::error(e.to_string())),
    };

    // Only super admins can update company status
    if !claims.role.is_super_admin() {
        return HttpResponse::Forbidden().json(ApiResponse::<()>::error("Only super admins can update company status".to_string()));
    }

    let status = req.get("status")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Status field is required".to_string());

    let status = match status {
        Ok(s) => s,
        Err(e) => return HttpResponse::BadRequest().json(ApiResponse::<()>::error(e)),
    };

    // Validate status values
    if !["active", "pending", "suspended"].contains(&status) {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error("Invalid status. Must be 'active', 'pending', or 'suspended'".to_string()));
    }

    match company_service.update_company_status(company_id, status).await {
        Ok(company) => HttpResponse::Ok().json(ApiResponse::success(company)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}
