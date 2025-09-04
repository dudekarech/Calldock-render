use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use shared::{
    types::{WebRTCSignal, SignalType},
    call::{WebRTCConnection, ConnectionState, IceServer},
};

#[derive(Clone)]
pub struct WebRTCService {
    connections: Arc<RwLock<HashMap<Uuid, WebRTCConnection>>>,
}

impl WebRTCService {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Handle WebRTC offer signal
    pub async fn handle_offer(&self, signal: &WebRTCSignal) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let mut connections = self.connections.write().await;
        
        // Create or update connection
        let connection = connections.entry(signal.call_id).or_insert_with(|| WebRTCConnection {
            call_id: signal.call_id,
            peer_connection_id: Uuid::new_v4().to_string(),
            ice_servers: vec![
                IceServer {
                    urls: vec!["stun:stun.l.google.com:19302".to_string()],
                    username: None,
                    credential: None,
                },
                IceServer {
                    urls: vec!["stun:stun1.l.google.com:19302".to_string()],
                    username: None,
                    credential: None,
                },
            ],
            local_sdp: None,
            remote_sdp: None,
            ice_candidates: vec![],
            connection_state: ConnectionState::New,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        });

        // Update connection state
        connection.connection_state = ConnectionState::Connecting;
        connection.remote_sdp = Some(signal.data["sdp"].as_str().unwrap_or("").to_string());
        connection.updated_at = chrono::Utc::now();

        // Generate response with ICE servers and connection info
        let response = serde_json::json!({
            "connection_id": connection.peer_connection_id,
            "ice_servers": connection.ice_servers,
            "status": "offer_received",
            "call_id": signal.call_id,
        });

        Ok(response)
    }

    /// Handle WebRTC answer signal
    pub async fn handle_answer(&self, signal: &WebRTCSignal) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&signal.call_id) {
            // Update connection with answer SDP
            connection.remote_sdp = Some(signal.data["sdp"].as_str().unwrap_or("").to_string());
            connection.connection_state = ConnectionState::Connected;
            connection.updated_at = chrono::Utc::now();

            // Generate response
            let response = serde_json::json!({
                "connection_id": connection.peer_connection_id,
                "status": "answer_received",
                "call_id": signal.call_id,
                "connection_state": "connected",
            });

            Ok(response)
        } else {
            Err("Connection not found".into())
        }
    }

    /// Handle ICE candidate signal
    pub async fn handle_ice_candidate(&self, signal: &WebRTCSignal) -> Result<(), Box<dyn std::error::Error>> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&signal.call_id) {
            // Add ICE candidate
            if let Some(candidate) = signal.data["candidate"].as_str() {
                connection.ice_candidates.push(candidate.to_string());
                connection.updated_at = chrono::Utc::now();
            }
        }

        Ok(())
    }

    /// Get connection by call ID
    pub async fn get_connection(&self, call_id: Uuid) -> Option<WebRTCConnection> {
        let connections = self.connections.read().await;
        connections.get(&call_id).cloned()
    }

    /// Update connection state
    pub async fn update_connection_state(&self, call_id: Uuid, state: ConnectionState) -> Result<(), Box<dyn std::error::Error>> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&call_id) {
            connection.connection_state = state;
            connection.updated_at = chrono::Utc::now();
        }

        Ok(())
    }

    /// Close connection
    pub async fn close_connection(&self, call_id: Uuid) -> Result<(), Box<dyn std::error::Error>> {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&call_id) {
            connection.connection_state = ConnectionState::Closed;
            connection.updated_at = chrono::Utc::now();
        }

        Ok(())
    }

    /// Get all active connections
    pub async fn get_active_connections(&self) -> Vec<WebRTCConnection> {
        let connections = self.connections.read().await;
        connections
            .values()
            .filter(|conn| conn.connection_state != ConnectionState::Closed)
            .cloned()
            .collect()
    }
}
