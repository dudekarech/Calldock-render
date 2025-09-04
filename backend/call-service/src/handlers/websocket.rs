use actix_web::{get, web, Error, HttpRequest, HttpResponse};
use actix_web_actors::ws;
use crate::websocket::CallWebSocket;

#[get("/ws/{call_id}")]
pub async fn ws_route(
    req: HttpRequest,
    stream: web::Payload,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    let call_id = path.into_inner();
    
    ws::start(
        CallWebSocket::new(call_id),
        &req,
        stream,
    )
}
