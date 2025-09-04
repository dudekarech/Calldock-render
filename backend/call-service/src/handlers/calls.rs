use actix_web::{post, get, put, web, HttpResponse};
use shared::{ApiResponse, call::{CreateCallRequest, Call, CallStatus}};
use crate::services::call_service::CallService;
use validator::Validate;
use uuid::Uuid;

#[post("/calls")]
pub async fn create_call(
    request: web::Json<CreateCallRequest>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = request.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match call_service.create_call(&request.into_inner()).await {
        Ok(call) => HttpResponse::Created().json(ApiResponse::success(call)),
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/calls/{call_id}")]
pub async fn get_call(
    path: web::Path<Uuid>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    let call_id = path.into_inner();

    match call_service.get_call(call_id).await {
        Ok(call) => HttpResponse::Ok().json(ApiResponse::success(call)),
        Err(e) => HttpResponse::NotFound().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/calls")]
pub async fn list_calls(
    call_service: web::Data<CallService>,
) -> HttpResponse {
    // This would typically support pagination and filtering
    // For now, return a simple message
    HttpResponse::Ok().json(ApiResponse::message("List calls endpoint - implementation pending".to_string()))
}

#[put("/calls/{call_id}")]
pub async fn update_call(
    path: web::Path<Uuid>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    let call_id = path.into_inner();

    // This would typically update call details
    // For now, return a simple message
    HttpResponse::Ok().json(ApiResponse::message(format!("Update call {} - implementation pending", call_id)))
}

#[post("/calls/{call_id}/end")]
pub async fn end_call(
    path: web::Path<Uuid>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    let call_id = path.into_inner();

    // This would typically end the call and update status
    // For now, return a simple message
    HttpResponse::Ok().json(ApiResponse::message(format!("End call {} - implementation pending", call_id)))
}
