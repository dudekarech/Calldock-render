use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use shared::call::{WebRTCConnection, ConnectionState, IceServer};

/// WebRTC peer connection manager
pub struct WebRTCPeerConnection {
    pub id: String,
    pub call_id: Uuid,
    pub connection_state: ConnectionState,
    pub ice_servers: Vec<IceServer>,
    pub local_sdp: Option<String>,
    pub remote_sdp: Option<String>,
    pub ice_candidates: Vec<String>,
}

impl WebRTCPeerConnection {
    pub fn new(call_id: Uuid, ice_servers: Vec<IceServer>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            call_id,
            connection_state: ConnectionState::New,
            ice_servers,
            local_sdp: None,
            remote_sdp: None,
            ice_candidates: Vec::new(),
        }
    }

    pub fn set_local_sdp(&mut self, sdp: String) {
        self.local_sdp = Some(sdp);
        self.connection_state = ConnectionState::Connecting;
    }

    pub fn set_remote_sdp(&mut self, sdp: String) {
        self.remote_sdp = Some(sdp);
        if self.local_sdp.is_some() {
            self.connection_state = ConnectionState::Connected;
        }
    }

    pub fn add_ice_candidate(&mut self, candidate: String) {
        self.ice_candidates.push(candidate);
    }

    pub fn close(&mut self) {
        self.connection_state = ConnectionState::Closed;
    }

    pub fn is_active(&self) -> bool {
        matches!(self.connection_state, ConnectionState::Connected | ConnectionState::Connecting)
    }
}

/// WebRTC connection manager
pub struct WebRTCManager {
    connections: Arc<RwLock<std::collections::HashMap<Uuid, WebRTCPeerConnection>>>,
}

impl WebRTCManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(std::collections::HashMap::new())),
        }
    }

    pub async fn create_connection(&self, call_id: Uuid, ice_servers: Vec<IceServer>) -> String {
        let mut connections = self.connections.write().await;
        
        let connection = WebRTCPeerConnection::new(call_id, ice_servers);
        let connection_id = connection.id.clone();
        
        connections.insert(call_id, connection);
        connection_id
    }

    pub async fn get_connection(&self, call_id: Uuid) -> Option<WebRTCPeerConnection> {
        let connections = self.connections.read().await;
        connections.get(&call_id).cloned()
    }

    pub async fn update_connection_state(&self, call_id: Uuid, state: ConnectionState) {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&call_id) {
            connection.connection_state = state;
        }
    }

    pub async fn close_connection(&self, call_id: Uuid) {
        let mut connections = self.connections.write().await;
        
        if let Some(connection) = connections.get_mut(&call_id) {
            connection.close();
        }
    }

    pub async fn get_active_connections(&self) -> Vec<WebRTCPeerConnection> {
        let connections = self.connections.read().await;
        connections
            .values()
            .filter(|conn| conn.is_active())
            .cloned()
            .collect()
    }
}
