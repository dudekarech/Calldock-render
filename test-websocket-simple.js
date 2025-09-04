const WebSocket = require('ws');

console.log('🧪 Simple WebSocket Test...\n');

// Test 1: Try to connect to WebSocket server
console.log('1️⃣ Testing WebSocket connection...');

try {
    const ws = new WebSocket('ws://localhost:8081?token=test_token');
    
    ws.on('open', () => {
        console.log('✅ WebSocket connection opened');
        
        // Send a test message
        ws.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
        }));
        
        // Close after 2 seconds
        setTimeout(() => {
            ws.close();
        }, 2000);
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log('📨 Message received:', message.type);
        } catch (error) {
            console.log('📨 Raw message received:', data.toString());
        }
    });
    
    ws.on('close', (code, reason) => {
        console.log('🔌 WebSocket closed:', code, reason);
    });
    
    ws.on('error', (error) => {
        console.log('❌ WebSocket error:', error.message);
    });
    
} catch (error) {
    console.error('❌ Error creating WebSocket:', error.message);
}

console.log('\n🎯 If you see connection errors, make sure the WebSocket server is running:');
console.log('   node websocket-server.js');
