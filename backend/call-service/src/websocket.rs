use actix::{Actor, StreamHandler, Handler, Message};
use actix_web_actors::ws;
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use uuid::Uuid;

pub struct CallWebSocket {
    pub call_id: String,
    pub connections: Arc<Mutex<HashMap<String, actix::Addr<CallWebSocket>>>>,
}

impl CallWebSocket {
    pub fn new(call_id: String) -> Self {
        Self {
            call_id,
            connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Actor for CallWebSocket {
    type Context = ws::WebsocketContext<Self>;

    fn started(&mut self, ctx: &mut Self::Context) {
        let session_id = Uuid::new_v4().to_string();
        
        // Store this connection
        if let Ok(mut connections) = self.connections.lock() {
            connections.insert(session_id.clone(), ctx.address());
        }

        // Send welcome message
        let welcome_msg = serde_json::json!({
            "type": "connected",
            "session_id": session_id,
            "call_id": self.call_id
        });
        
        ctx.text(serde_json::to_string(&welcome_msg).unwrap());
    }

    fn stopped(&mut self, _: &mut Self::Context) {
        // Clean up connection when stopped
        if let Ok(mut connections) = self.connections.lock() {
            connections.retain(|_, addr| addr.connected());
        }
    }
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for CallWebSocket {
    fn handle(
        &mut self,
        msg: Result<ws::Message, ws::ProtocolError>,
        ctx: &mut Self::Context,
    ) {
        match msg {
            Ok(ws::Message::Text(text)) => {
                // Parse the incoming message
                if let Ok(data) = serde_json::from_str::<Value>(&text) {
                    // Handle different message types
                    if let Some(msg_type) = data.get("type").and_then(|v| v.as_str()) {
                        match msg_type {
                            "offer" | "answer" | "ice-candidate" => {
                                // Broadcast to other participants in the same call
                                self.broadcast_to_call(&text, ctx);
                            }
                            "ping" => {
                                // Respond with pong
                                let pong = serde_json::json!({
                                    "type": "pong",
                                    "timestamp": chrono::Utc::now().timestamp()
                                });
                                ctx.text(serde_json::to_string(&pong).unwrap());
                            }
                            _ => {
                                // Unknown message type
                                let error = serde_json::json!({
                                    "type": "error",
                                    "message": "Unknown message type"
                                });
                                ctx.text(serde_json::to_string(&error).unwrap());
                            }
                        }
                    }
                }
            }
            Ok(ws::Message::Binary(bin)) => {
                // Handle binary messages (e.g., audio/video data)
                ctx.binary(bin);
            }
            Ok(ws::Message::Ping(msg)) => {
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                // Handle pong
            }
            Ok(ws::Message::Close(reason)) => {
                ctx.close(reason);
            }
            _ => {}
        }
    }
}

impl CallWebSocket {
    fn broadcast_to_call(&self, message: &str, ctx: &mut ws::WebsocketContext<Self>) {
        if let Ok(connections) = self.connections.lock() {
            for (session_id, addr) in connections.iter() {
                // Don't send to self
                if addr != &ctx.address() {
                    let _ = addr.do_send(BroadcastMessage {
                        message: message.to_string(),
                    });
                }
            }
        }
    }
}

#[derive(Message)]
#[rtype(result = "()")]
struct BroadcastMessage {
    message: String,
}

impl Handler<BroadcastMessage> for CallWebSocket {
    type Result = ();

    fn handle(&mut self, msg: BroadcastMessage, ctx: &mut Self::Context) {
        ctx.text(msg.message);
    }
}
