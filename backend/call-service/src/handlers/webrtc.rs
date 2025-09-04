use actix_web::{post, web, HttpResponse};
use shared::{ApiResponse, WebRTCSignal, SignalType};
use crate::services::call_service::CallService;
use validator::Validate;

#[post("/webrtc/offer")]
pub async fn offer(
    signal: web::Json<WebRTCSignal>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = signal.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match call_service.handle_webrtc_offer(&signal.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(ApiResponse::success(response)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/webrtc/answer")]
pub async fn answer(
    signal: web::Json<WebRTCSignal>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = signal.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match call_service.handle_webrtc_answer(&signal.into_inner()).await {
        Ok(response) => HttpResponse::Ok().json(ApiResponse::success(response)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[post("/webrtc/ice-candidate")]
pub async fn ice_candidate(
    signal: web::Json<WebRTCSignal>,
    call_service: web::Data<CallService>,
) -> HttpResponse {
    // Validate request
    if let Err(e) = signal.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match call_service.handle_ice_candidate(&signal.into_inner()).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("ICE candidate processed".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}
