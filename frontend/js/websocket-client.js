class WebSocketClient {
    constructor(token, onMessage, onConnect, onDisconnect) {
        this.token = token;
        this.onMessage = onMessage;
        this.onConnect = onConnect;
        this.onDisconnect = onDisconnect;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isConnecting = false;
        this.heartbeatInterval = null;
        this.connectionId = null;
        
        this.connect();
    }
    
    connect() {
        if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
            return;
        }
        
        this.isConnecting = true;
        
        try {
            // Use production WebSocket URL if available, otherwise fallback to localhost
            const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            
            // For production (Render), use the same host and port as the main app with /ws path
            // For development, use localhost:3000/ws (same port as main server)
            const wsHost = isProduction ? window.location.host : 'localhost:3000';
            const wsUrl = `${wsProtocol}//${wsHost}/ws?token=${encodeURIComponent(this.token)}`;
            console.log('🔌 Connecting to WebSocket server:', wsUrl);
            
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ WebSocket connected successfully');
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                
                if (this.onConnect) {
                    this.onConnect();
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('📨 WebSocket message received:', message.type);
                    
                    if (message.type === 'connection_established') {
                        this.connectionId = message.userId;
                        console.log('🆔 Connection established with ID:', this.connectionId);
                    }
                    
                    if (this.onMessage) {
                        this.onMessage(message);
                    }
                } catch (error) {
                    console.error('❌ Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                this.isConnecting = false;
                this.stopHeartbeat();
                
                if (this.onDisconnect) {
                    this.onDisconnect(event);
                }
                
                // Attempt to reconnect if not a clean close
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.isConnecting = false;
            };
            
        } catch (error) {
            console.error('❌ Error creating WebSocket connection:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (this.ws?.readyState !== WebSocket.OPEN) {
                this.connect();
            }
        }, delay);
    }
    
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.send({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                });
            }
        }, 30000); // Send ping every 30 seconds
    }
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    
    send(message) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message));
                console.log('📤 WebSocket message sent:', message.type);
            } catch (error) {
                console.error('❌ Error sending WebSocket message:', error);
            }
        } else {
            console.warn('⚠️ WebSocket not connected, message not sent:', message.type);
        }
    }
    
    // WebRTC Signaling Methods
    joinRoom(roomId) {
        this.send({
            type: 'join_room',
            roomId,
            timestamp: new Date().toISOString()
        });
    }
    
    leaveRoom(roomId) {
        this.send({
            type: 'leave_room',
            roomId,
            timestamp: new Date().toISOString()
        });
    }
    
    sendWebRTCOffer(targetUserId, offer, callId) {
        this.send({
            type: 'webrtc_offer',
            targetUserId,
            offer,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    sendWebRTCAnswer(targetUserId, answer, callId) {
        this.send({
            type: 'webrtc_answer',
            targetUserId,
            answer,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    sendICECandidate(targetUserId, candidate, callId) {
        this.send({
            type: 'ice_candidate',
            targetUserId,
            candidate,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    notifyCallStarted(callId, roomId, callType) {
        this.send({
            type: 'call_started',
            callId,
            roomId,
            callType,
            timestamp: new Date().toISOString()
        });
    }
    
    notifyCallEnded(callId, roomId, reason = 'user_ended') {
        this.send({
            type: 'call_ended',
            callId,
            roomId,
            reason,
            timestamp: new Date().toISOString()
        });
    }
    
    updateAgentStatus(status, availability = 'available') {
        this.send({
            type: 'agent_status',
            status,
            availability,
            timestamp: new Date().toISOString()
        });
    }
    
    disconnect() {
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
        }
        
        console.log('🔌 WebSocket client disconnected');
    }
    
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    
    getConnectionId() {
        return this.connectionId;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketClient;
}
