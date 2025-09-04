const WebSocket = require('ws');

// Create WebSocket server on port 8081
const wss = new WebSocket.Server({ port: 8081 });

console.log('WebRTC Signaling Server running on port 8081');

// Store active connections
const connections = new Map();
const calls = new Map();

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    const connectionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    connections.set(connectionId, ws);
    
    ws.connectionId = connectionId;
    ws.role = null; // 'customer' or 'agent'
    ws.callId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received message:', data.type);
            
            switch (data.type) {
                case 'register':
                    ws.role = data.role;
                    ws.callId = data.callId;
                    console.log(`${data.role} registered for call ${data.callId}`);
                    break;
                    
                case 'offer':
                    // Customer sends offer, forward to agent
                    ws.callId = data.callId;
                    ws.role = 'customer';
                    
                    // Store call info
                    calls.set(data.callId, {
                        customer: ws,
                        agent: null,
                        offer: data.offer,
                        callerName: data.callerName,
                        callerPhone: data.callerPhone,
                        callReason: data.callReason
                    });
                    
                    // Notify all agents about incoming call
                    broadcastToAgents({
                        type: 'incoming-call',
                        callId: data.callId,
                        callerName: data.callerName,
                        callerPhone: data.callerPhone,
                        callReason: data.callReason
                    });
                    break;
                    
                case 'answer':
                    // Agent sends answer, forward to customer
                    if (ws.role === 'agent' && ws.callId) {
                        const call = calls.get(ws.callId);
                        if (call && call.customer) {
                            call.customer.send(JSON.stringify({
                                type: 'answer',
                                answer: data.answer,
                                callId: ws.callId
                            }));
                        }
                    }
                    break;
                    
                case 'ice-candidate':
                    // Forward ICE candidates between peers
                    if (ws.callId) {
                        const call = calls.get(ws.callId);
                        if (call) {
                            const target = ws.role === 'customer' ? call.agent : call.customer;
                            if (target) {
                                target.send(JSON.stringify({
                                    type: 'ice-candidate',
                                    candidate: data.candidate,
                                    callId: ws.callId
                                }));
                            }
                        }
                    }
                    break;
                    
                case 'agent-ready':
                    // Agent is ready to take calls
                    ws.role = 'agent';
                    console.log('Agent ready to take calls');
                    break;
                    
                case 'end-call':
                    // End call and cleanup
                    if (ws.callId) {
                        const call = calls.get(ws.callId);
                        if (call) {
                            if (call.customer) {
                                call.customer.send(JSON.stringify({
                                    type: 'call-ended',
                                    callId: ws.callId
                                }));
                            }
                            if (call.agent) {
                                call.agent.send(JSON.stringify({
                                    type: 'call-ended',
                                    callId: ws.callId
                                }));
                            }
                            calls.delete(ws.callId);
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed:', connectionId);
        connections.delete(connectionId);
        
        // Cleanup calls if this was a participant
        if (ws.callId) {
            const call = calls.get(ws.callId);
            if (call) {
                if (call.customer === ws) {
                    call.customer = null;
                }
                if (call.agent === ws) {
                    call.agent = null;
                }
                
                // If both participants are gone, remove the call
                if (!call.customer && !call.agent) {
                    calls.delete(ws.callId);
                }
            }
        }
    });
});

function broadcastToAgents(message) {
    connections.forEach((ws) => {
        if (ws.role === 'agent' && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down WebRTC Signaling Server...');
    wss.close();
    process.exit(0);
});
