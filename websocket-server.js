const WebSocket = require('ws');
const http = require('http');
const url = require('url');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor(port = 8081) {
        this.port = port;
        this.server = http.createServer();
        this.wss = new WebSocket.Server({ server: this.server });
        
        // Store active connections
        this.connections = new Map(); // userId -> WebSocket
        this.rooms = new Map(); // roomId -> Set of userIds
        this.userRooms = new Map(); // userId -> roomId
        
        this.setupWebSocket();
        this.start();
    }
    
    setupWebSocket() {
        this.wss.on('connection', (ws, req) => {
            console.log('🔌 New WebSocket connection attempt');
            
            // Extract token from query parameters
            const { query } = url.parse(req.url, true);
            const token = query.token;
            
            if (!token) {
                console.log('❌ No token provided, closing connection');
                ws.close(1008, 'Authentication required');
                return;
            }
            
            try {
                // Verify JWT token - accept mock tokens for testing
                let decoded;
                if (token.includes('mock_signature')) {
                    // Mock token for testing - extract data from the token
                    const tokenParts = token.split('.');
                    if (tokenParts.length >= 2) {
                        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                        decoded = payload;
                    } else {
                        throw new Error('Invalid mock token format');
                    }
                } else {
                    // Real JWT token
                    decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                }
                
                const userId = decoded.id;
                const userRole = decoded.role;
                const companyId = decoded.company_id;
                
                console.log(`✅ Authenticated user: ${userId} (${userRole}) from company: ${companyId}`);
                
                // Store connection
                this.connections.set(userId, {
                    ws,
                    role: userRole,
                    companyId,
                    connectedAt: new Date()
                });
                
                // Send welcome message
                ws.send(JSON.stringify({
                    type: 'connection_established',
                    userId,
                    role: userRole,
                    companyId,
                    timestamp: new Date().toISOString()
                }));
                
                // Handle incoming messages
                ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data);
                        this.handleMessage(userId, message);
                    } catch (error) {
                        console.error('❌ Error parsing message:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Invalid message format',
                            timestamp: new Date().toISOString()
                        }));
                    }
                });
                
                // Handle connection close
                ws.on('close', (code, reason) => {
                    console.log(`🔌 User ${userId} disconnected: ${code} - ${reason}`);
                    this.handleDisconnection(userId);
                });
                
                // Handle errors
                ws.on('error', (error) => {
                    console.error(`❌ WebSocket error for user ${userId}:`, error);
                    this.handleDisconnection(userId);
                });
                
            } catch (error) {
                console.error('❌ JWT verification failed:', error.message);
                ws.close(1008, 'Invalid token');
            }
        });
    }
    
    handleMessage(userId, message) {
        console.log(`📨 Message from ${userId}:`, message.type);
        
        switch (message.type) {
            case 'join_room':
                this.handleJoinRoom(userId, message);
                break;
            case 'leave_room':
                this.handleLeaveRoom(userId, message);
                break;
            case 'webrtc_offer':
                this.handleWebRTCOffer(userId, message);
                break;
            case 'webrtc_answer':
                this.handleWebRTCAnswer(userId, message);
                break;
            case 'ice_candidate':
                this.handleICECandidate(userId, message);
                break;
            case 'call_started':
                this.handleCallStarted(userId, message);
                break;
            case 'call_ended':
                this.handleCallEnded(userId, message);
                break;
            case 'agent_status':
                this.handleAgentStatus(userId, message);
                break;
            case 'ping':
                this.handlePing(userId, message);
                break;
            default:
                console.log(`⚠️ Unknown message type: ${message.type}`);
                this.sendToUser(userId, {
                    type: 'error',
                    message: `Unknown message type: ${message.type}`,
                    timestamp: new Date().toISOString()
                });
        }
    }
    
    handleJoinRoom(userId, message) {
        const { roomId } = message;
        
        // Allow users to be in multiple rooms simultaneously
        // Only leave the room if explicitly requested
        
        // Join the room
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        
        this.rooms.get(roomId).add(userId);
        
        // Store user's rooms (allow multiple)
        if (!this.userRooms.has(userId)) {
            this.userRooms.set(userId, new Set());
        }
        this.userRooms.get(userId).add(roomId);
        
        console.log(`🏠 User ${userId} joined room ${roomId}`);
        
        // Notify other users in the room
        this.broadcastToRoom(roomId, {
            type: 'user_joined',
            userId,
            roomId,
            timestamp: new Date().toISOString()
        }, [userId]);
        
        // Send confirmation
        this.sendToUser(userId, {
            type: 'room_joined',
            roomId,
            users: Array.from(this.rooms.get(roomId)),
            timestamp: new Date().toISOString()
        });
    }
    
    handleLeaveRoom(userId, message) {
        const { roomId } = message;
        
        if (roomId) {
            // Leave specific room
            this.leaveSpecificRoom(userId, roomId);
        } else {
            // Leave all rooms (on disconnect)
            const userRooms = this.userRooms.get(userId);
            if (userRooms) {
                for (const roomId of userRooms) {
                    this.leaveSpecificRoom(userId, roomId);
                }
                this.userRooms.delete(userId);
            }
        }
    }
    
    leaveSpecificRoom(userId, roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.delete(userId);
            
            // Remove room if empty
            if (room.size === 0) {
                this.rooms.delete(roomId);
            } else {
                // Notify other users
                this.broadcastToRoom(roomId, {
                    type: 'user_left',
                    userId,
                    roomId,
                    timestamp: new Date().toISOString()
                }, [userId]);
            }
        }
        
        // Remove from user's room list
        const userRooms = this.userRooms.get(userId);
        if (userRooms) {
            userRooms.delete(roomId);
            if (userRooms.size === 0) {
                this.userRooms.delete(userId);
            }
        }
        
        console.log(`🏠 User ${userId} left room ${roomId}`);
    }
    
    handleWebRTCOffer(userId, message) {
        const { targetUserId, offer, callId } = message;
        
        console.log(`📞 WebRTC offer from ${userId} to ${targetUserId} for call ${callId}`);
        
        // Check if targetUserId is a room name (contains 'room' or is a known room)
        if (targetUserId.includes('room') || ['agent-room', 'public-calls'].includes(targetUserId)) {
            // Broadcast to all users in the room
            this.broadcastToRoom(targetUserId, {
                type: 'webrtc_offer',
                fromUserId: userId,
                offer,
                callId,
                timestamp: new Date().toISOString()
            });
            
            console.log(`📡 WebRTC offer broadcasted to room ${targetUserId}`);
        } else {
            // Forward offer to specific target user
            this.sendToUser(targetUserId, {
                type: 'webrtc_offer',
                fromUserId: userId,
                offer,
                callId,
                timestamp: new Date().toISOString()
            });
        }
        
        // Send confirmation to sender
        this.sendToUser(userId, {
            type: 'offer_sent',
            targetUserId,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    handleWebRTCAnswer(userId, message) {
        const { targetUserId, answer, callId } = message;
        
        console.log(`📞 WebRTC answer from ${userId} to ${targetUserId} for call ${callId}`);
        
        // Forward answer to target user
        this.sendToUser(targetUserId, {
            type: 'webrtc_answer',
            fromUserId: userId,
            answer,
            callId,
            timestamp: new Date().toISOString()
        });
        
        // Send confirmation to sender
        this.sendToUser(userId, {
            type: 'answer_sent',
            targetUserId,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    handleICECandidate(userId, message) {
        const { targetUserId, candidate, callId } = message;
        
        // Forward ICE candidate to target user
        this.sendToUser(targetUserId, {
            type: 'ice_candidate',
            fromUserId: userId,
            candidate,
            callId,
            timestamp: new Date().toISOString()
        });
    }
    
    handleCallStarted(userId, message) {
        const { callId, roomId, callType } = message;
        
        console.log(`📞 Call ${callId} started by ${userId} in room ${roomId}`);
        
        // Broadcast to room
        this.broadcastToRoom(roomId, {
            type: 'call_started',
            callId,
            initiatedBy: userId,
            callType,
            timestamp: new Date().toISOString()
        });
    }
    
    handleCallEnded(userId, message) {
        const { callId, roomId, reason } = message;
        
        console.log(`📞 Call ${callId} ended by ${userId} in room ${roomId}, reason: ${reason}`);
        
        // Broadcast to room
        this.broadcastToRoom(roomId, {
            type: 'call_ended',
            callId,
            endedBy: userId,
            reason,
            timestamp: new Date().toISOString()
        });
    }
    
    handleAgentStatus(userId, message) {
        const { status, availability } = message;
        
        console.log(`👤 Agent ${userId} status: ${status}, availability: ${availability}`);
        
        // Broadcast to company (all users in same company)
        const userConnection = this.connections.get(userId);
        if (userConnection) {
            this.broadcastToCompany(userConnection.companyId, {
                type: 'agent_status_changed',
                userId,
                status,
                availability,
                timestamp: new Date().toISOString()
            }, [userId]);
        }
    }
    
    handlePing(userId, message) {
        // Respond with pong
        this.sendToUser(userId, {
            type: 'pong',
            timestamp: new Date().toISOString()
        });
    }
    
    handleDisconnection(userId) {
        // Leave all rooms
        this.handleLeaveRoom(userId, {});
        
        // Remove connection
        this.connections.delete(userId);
        
        console.log(`🔌 User ${userId} fully disconnected`);
    }
    
    sendToUser(userId, message) {
        const connection = this.connections.get(userId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            try {
                connection.ws.send(JSON.stringify(message));
            } catch (error) {
                console.error(`❌ Error sending message to ${userId}:`, error);
                this.handleDisconnection(userId);
            }
        } else {
            console.log(`⚠️ User ${userId} not connected, message not sent`);
        }
    }
    
    broadcastToRoom(roomId, message, excludeUsers = []) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        room.forEach(userId => {
            if (!excludeUsers.includes(userId)) {
                this.sendToUser(userId, message);
            }
        });
    }
    
    broadcastToCompany(companyId, message, excludeUsers = []) {
        this.connections.forEach((connection, userId) => {
            if (connection.companyId === companyId && !excludeUsers.includes(userId)) {
                this.sendToUser(userId, message);
            }
        });
    }
    
    getConnectionStats() {
        return {
            totalConnections: this.connections.size,
            totalRooms: this.rooms.size,
            connections: Array.from(this.connections.entries()).map(([userId, conn]) => ({
                userId,
                role: conn.role,
                companyId: conn.companyId,
                connectedAt: conn.connectedAt,
                roomId: this.userRooms.get(userId)
            })),
            rooms: Array.from(this.rooms.entries()).map(([roomId, users]) => ({
                roomId,
                userCount: users.size,
                users: Array.from(users)
            }))
        };
    }
    
    start() {
        this.server.listen(this.port, () => {
            console.log(`🚀 WebSocket server running on port ${this.port}`);
            console.log(`📡 Ready for real-time WebRTC signaling`);
        });
    }
    
    stop() {
        this.wss.close();
        this.server.close();
        console.log('🛑 WebSocket server stopped');
    }
}

module.exports = WebSocketServer;

// Start server if run directly
if (require.main === module) {
    const server = new WebSocketServer();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('🛑 Shutting down WebSocket server...');
        server.stop();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        console.log('🛑 Shutting down WebSocket server...');
        server.stop();
        process.exit(0);
    });
}
