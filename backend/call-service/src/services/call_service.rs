use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use sqlx::PgPool;
use redis::aio::Connection;
use shared::{
    call::{Call, CallStatus, CallDirection, CreateCallRequest, CallEvent, CallEventType},
    types::{WebRTCSignal, SignalType},
    ApiResponse,
};
use crate::config::Config;
use super::webrtc_service::WebRTCService;
use super::call_routing_service::CallRoutingService;

#[derive(Clone)]
pub struct CallService {
    db_pool: PgPool,
    redis_conn: Arc<RwLock<Connection>>,
    config: Config,
    webrtc_service: WebRTCService,
    routing_service: CallRoutingService,
}

impl CallService {
    pub fn new(
        db_pool: PgPool,
        redis_conn: Connection,
        config: Config,
    ) -> Self {
        let redis_conn = Arc::new(RwLock::new(redis_conn));
        
        Self {
            db_pool,
            redis_conn,
            config,
            webrtc_service: WebRTCService::new(),
            routing_service: CallRoutingService::new(),
        }
    }

    /// Create a new call
    pub async fn create_call(&self, request: &CreateCallRequest) -> Result<Call, Box<dyn std::error::Error>> {
        let call = Call {
            id: Uuid::new_v4(),
            company_id: request.company_id,
            agent_id: None,
            customer_id: None,
            status: CallStatus::Ringing,
            direction: request.direction.clone(),
            caller_number: request.customer_phone.clone(),
            called_number: None,
            customer_name: request.customer_name.clone(),
            customer_email: request.customer_email.clone(),
            duration: None,
            recording_url: None,
            notes: None,
            tags: vec![],
            metadata: request.metadata.clone().unwrap_or_default(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            answered_at: None,
            ended_at: None,
        };

        // Store call in database
        self.store_call(&call).await?;
        
        // Add to routing queue
        self.routing_service.add_to_queue(&call).await?;
        
        // Emit call event
        self.emit_call_event(&call, CallEventType::CallInitiated).await?;

        Ok(call)
    }

    /// Handle WebRTC offer signal
    pub async fn handle_webrtc_offer(&self, signal: &WebRTCSignal) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        // Validate call exists
        let call = self.get_call(signal.call_id).await?;
        
        // Process offer through WebRTC service
        let response = self.webrtc_service.handle_offer(signal).await?;
        
        // Update call status
        self.update_call_status(signal.call_id, CallStatus::Ringing).await?;
        
        // Emit call event
        self.emit_call_event(&call, CallEventType::CallRinging).await?;

        Ok(response)
    }

    /// Handle WebRTC answer signal
    pub async fn handle_webrtc_answer(&self, signal: &WebRTCSignal) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        // Validate call exists
        let call = self.get_call(signal.call_id).await?;
        
        // Process answer through WebRTC service
        let response = self.webrtc_service.handle_answer(signal).await?;
        
        // Update call status
        self.update_call_status(signal.call_id, CallStatus::Connected).await?;
        
        // Emit call event
        self.emit_call_event(&call, CallEventType::CallAnswered).await?;

        Ok(response)
    }

    /// Handle ICE candidate signal
    pub async fn handle_ice_candidate(&self, signal: &WebRTCSignal) -> Result<(), Box<dyn std::error::Error>> {
        // Process ICE candidate through WebRTC service
        self.webrtc_service.handle_ice_candidate(signal).await?;
        Ok(())
    }

    /// Get call by ID
    pub async fn get_call(&self, call_id: Uuid) -> Result<Call, Box<dyn std::error::Error>> {
        // This would typically query the database
        // For now, return a mock call
        Ok(Call {
            id: call_id,
            company_id: Uuid::new_v4(),
            agent_id: None,
            customer_id: None,
            status: CallStatus::Ringing,
            direction: CallDirection::Inbound,
            caller_number: None,
            called_number: None,
            customer_name: None,
            customer_email: None,
            duration: None,
            recording_url: None,
            notes: None,
            tags: vec![],
            metadata: serde_json::Value::Null,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            answered_at: None,
            ended_at: None,
        })
    }

    /// Update call status
    async fn update_call_status(&self, call_id: Uuid, status: CallStatus) -> Result<(), Box<dyn std::error::Error>> {
        // This would typically update the database
        // For now, just log the update
        tracing::info!("Updating call {} status to {:?}", call_id, status);
        Ok(())
    }

    /// Store call in database
    async fn store_call(&self, call: &Call) -> Result<(), Box<dyn std::error::Error>> {
        // This would typically insert into the database
        // For now, just log the storage
        tracing::info!("Storing call {} in database", call.id);
        Ok(())
    }

    /// Emit call event
    async fn emit_call_event(&self, call: &Call, event_type: CallEventType) -> Result<(), Box<dyn std::error::Error>> {
        let event = CallEvent {
            id: Uuid::new_v4(),
            call_id: call.id,
            event_type,
            data: serde_json::Value::Null,
            timestamp: chrono::Utc::now(),
        };

        // This would typically publish to Redis or a message queue
        // For now, just log the event
        tracing::info!("Emitting call event: {:?} for call {}", event_type, call.id);
        Ok(())
    }
}
