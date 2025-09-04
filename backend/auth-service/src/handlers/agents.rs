use actix_web::{get, post, put, delete, web, HttpResponse};
use shared::{ApiResponse, Agent, CreateAgentRequest, UpdateAgentRequest, PaginatedResponse};
use crate::services::agent_service::AgentService;
use validator::Validate;

#[post("/agents")]
pub async fn create_agent(
    req: web::Json<CreateAgentRequest>,
    agent_service: web::Data<AgentService>,
    // TODO: Add authentication middleware
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    match agent_service.create_agent(&req.into_inner()).await {
        Ok(agent) => HttpResponse::Created().json(ApiResponse::success(agent)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/agents/{agent_id}")]
pub async fn get_agent(
    path: web::Path<uuid::Uuid>,
    agent_service: web::Data<AgentService>,
    // TODO: Add authentication middleware
) -> HttpResponse {
    let agent_id = path.into_inner();

    match agent_service.get_agent(agent_id).await {
        Ok(agent) => HttpResponse::Ok().json(ApiResponse::success(agent)),
        Err(e) => HttpResponse::NotFound().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[put("/agents/{agent_id}")]
pub async fn update_agent(
    path: web::Path<uuid::Uuid>,
    req: web::Json<UpdateAgentRequest>,
    agent_service: web::Data<AgentService>,
    // TODO: Add authentication middleware
) -> HttpResponse {
    // Validate request
    if let Err(e) = req.validate() {
        return HttpResponse::BadRequest().json(ApiResponse::<()>::error(format!("Validation error: {}", e)));
    }

    let agent_id = path.into_inner();

    match agent_service.update_agent(agent_id, &req.into_inner()).await {
        Ok(agent) => HttpResponse::Ok().json(ApiResponse::success(agent)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[get("/agents")]
pub async fn list_agents(
    query: web::Query<std::collections::HashMap<String, String>>,
    agent_service: web::Data<AgentService>,
    // TODO: Add authentication middleware
) -> HttpResponse {
    let page = query.get("page").and_then(|p| p.parse::<u32>().ok()).unwrap_or(1);
    let per_page = query.get("per_page").and_then(|p| p.parse::<u32>().ok()).unwrap_or(10);
    let company_id = query.get("company_id").and_then(|id| uuid::Uuid::parse_str(id).ok());

    match agent_service.list_agents(company_id, page, per_page).await {
        Ok(agents) => HttpResponse::Ok().json(ApiResponse::success(agents)),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}

#[delete("/agents/{agent_id}")]
pub async fn delete_agent(
    path: web::Path<uuid::Uuid>,
    agent_service: web::Data<AgentService>,
    // TODO: Add authentication middleware
) -> HttpResponse {
    let agent_id = path.into_inner();

    match agent_service.delete_agent(agent_id).await {
        Ok(_) => HttpResponse::Ok().json(ApiResponse::message("Agent deleted successfully".to_string())),
        Err(e) => HttpResponse::BadRequest().json(ApiResponse::<()>::error(e.to_string())),
    }
}
