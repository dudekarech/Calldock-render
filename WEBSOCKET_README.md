# 🔌 CallDocker WebSocket Implementation

## Overview

This document describes the WebSocket-based real-time communication system that replaces the localStorage-based signaling approach for WebRTC calls.

## 🏗️ Architecture

### Components

1. **`websocket-server.js`** - WebSocket server handling real-time signaling
2. **`frontend/js/websocket-client.js`** - Frontend WebSocket client library
3. **Updated frontend files** - Landing page and agent dashboard with WebSocket integration

### Communication Flow

```
Customer (Landing Page) ←→ WebSocket Server ←→ Agent (Dashboard)
        ↓                           ↓              ↓
   WebRTC Offer              Real-time         WebRTC Answer
   ICE Candidates             Signaling        ICE Candidates
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the WebSocket Server

```bash
# Start WebSocket server only
node websocket-server.js

# Or use the startup scripts
start-servers.bat    # Windows
./start-servers.sh   # Linux/Mac
```

### 3. Start the Main Server

```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file from `env.example`:

```bash
copy env.example .env
```

Key variables:
- `JWT_SECRET` - Secret for JWT token verification
- `PORT` - Main server port (default: 3000)
- WebSocket server runs on port 8081

### JWT Tokens

For development, we use mock JWT tokens:

- **Customer/Anonymous**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFub255bW91cyIsInJvbGUiOiJ1c2VyIiwiY29tcGFueV9pZCI6ImRlZmF1bHQiLCJpYXQiOjE2NzI1NDU2NzB9.mock_signature`
- **Agent**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFnZW50LTEiLCJyb2xlIjoiYWdlbnQiLCJjb21wYW55X2lkIjoiZGVmYXVsdCIsImlhdCI6MTY3MjU0NTY3MH0.mock_signature`

## 📡 WebSocket Server Features

### Message Types

- **`join_room`** - Join a communication room
- **`leave_room`** - Leave current room
- **`webrtc_offer`** - Send WebRTC offer
- **`webrtc_answer`** - Send WebRTC answer
- **`ice_candidate`** - Send ICE candidate
- **`call_started`** - Notify call start
- **`call_ended`** - Notify call end
- **`agent_status`** - Update agent availability
- **`ping`** - Heartbeat/ping

### Room Management

- **`public-calls`** - Public room for incoming calls
- **`agent-room`** - Private room for agents
- **Company-specific rooms** - For multi-tenant setups

### Security

- JWT token verification required
- Room-based access control
- Company isolation for multi-tenant setups

## 🎯 Frontend Integration

### Landing Page (`frontend/index.html`)

```javascript
// Initialize WebSocket
function initializeWebSocket() {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    
    websocketClient = new WebSocketClient(
        mockToken,
        handleWebSocketMessage,
        handleWebSocketConnect,
        handleWebSocketDisconnect
    );
}

// Handle incoming messages
function handleWebSocketMessage(message) {
    switch (message.type) {
        case 'webrtc_answer':
            handleIncomingAnswer(message);
            break;
        case 'ice_candidate':
            handleIncomingICECandidate(message);
            break;
        // ... other cases
    }
}
```

### Agent Dashboard (`frontend/agent-dashboard.html`)

```javascript
// Initialize WebSocket for agents
function initializeWebSocket() {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    
    websocketClient = new WebSocketClient(
        mockToken,
        handleWebSocketMessage,
        handleWebSocketConnect,
        handleWebSocketDisconnect
    );
}

// Join agent room
function handleWebSocketConnect() {
    if (websocketClient) {
        websocketClient.joinRoom('agent-room');
    }
}
```

## 🧪 Testing

### Test WebSocket Server

```bash
# Test basic connectivity
node test-websocket-simple.js

# Test full functionality
node test-websocket.js
```

### Test Frontend

1. Open landing page: `http://localhost:3000`
2. Open agent dashboard: `http://localhost:3000/agent`
3. Check browser console for WebSocket connection logs
4. Try initiating a call to test the flow

## 🔄 Migration from localStorage

### What Changed

- ❌ **Old**: `localStorage.setItem('pendingCall', ...)`
- ✅ **New**: `websocketClient.notifyCallStarted(callId, roomId, callType)`

- ❌ **Old**: `localStorage.getItem('callAnswer')`
- ✅ **New**: WebSocket message handler `handleIncomingAnswer(message)`

- ❌ **Old**: Polling with `setInterval`
- ✅ **New**: Event-driven WebSocket messages

### Benefits

1. **Real-time communication** - No more polling delays
2. **Scalable** - Multiple agents can handle calls simultaneously
3. **Secure** - JWT authentication and room-based access
4. **Reliable** - Automatic reconnection and heartbeat monitoring
5. **Production-ready** - Proper error handling and logging

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket connection failed**
   - Check if server is running on port 8081
   - Verify firewall settings
   - Check browser console for errors

2. **JWT verification failed**
   - Ensure JWT_SECRET is set in .env
   - Check token format and expiration

3. **Messages not received**
   - Verify room membership
   - Check WebSocket connection status
   - Review message format

### Debug Mode

Enable detailed logging in the WebSocket server:

```javascript
// In websocket-server.js
console.log('🔍 Debug: Message received:', JSON.stringify(message, null, 2));
```

## 🔮 Next Steps

### Phase 2: Real-Time Communication - Step 3
- **Call Recording & Storage** - Implement recording functionality
- **Advanced Call Routing** - Skills-based routing and queue management

### Phase 3: Advanced Features
- **CRM Integration** - Customer data and call history
- **Analytics Dashboard** - Real-time call metrics
- **Multi-language Support** - Internationalization

## 📚 API Reference

### WebSocketClient Methods

```javascript
// Connection
websocketClient.connect()
websocketClient.disconnect()
websocketClient.isConnected()

// Messaging
websocketClient.send(message)
websocketClient.joinRoom(roomId)
websocketClient.leaveRoom(roomId)

// WebRTC Signaling
websocketClient.sendWebRTCOffer(targetUserId, offer, callId)
websocketClient.sendWebRTCAnswer(targetUserId, answer, callId)
websocketClient.sendICECandidate(targetUserId, candidate, callId)

// Call Management
websocketClient.notifyCallStarted(callId, roomId, callType)
websocketClient.notifyCallEnded(callId, roomId, reason)
websocketClient.updateAgentStatus(status, availability)
```

### Server Events

```javascript
// Connection events
'connection_established' - User successfully connected
'room_joined' - User joined a room
'user_joined' - Another user joined the room
'user_left' - User left the room

// WebRTC events
'webrtc_offer' - Received offer from peer
'webrtc_answer' - Received answer from peer
'ice_candidate' - Received ICE candidate

// Call events
'call_started' - Call initiated
'call_ended' - Call terminated
'agent_status_changed' - Agent availability updated
```

## 🤝 Contributing

1. Follow the existing code style
2. Add comprehensive error handling
3. Include logging for debugging
4. Test with both valid and invalid inputs
5. Update this documentation for new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
