const WebSocket = require('ws');

// Test WebSocket server connection
async function testWebSocketServer() {
    console.log('🧪 Testing WebSocket Server...\n');
    
    try {
        // Test 1: Connection without token (should fail)
        console.log('1️⃣ Testing connection without token (should fail)...');
        const ws1 = new WebSocket('ws://localhost:8081');
        
        await new Promise((resolve) => {
            ws1.on('open', () => {
                console.log('❌ Connection opened without token (unexpected)');
                ws1.close();
                resolve();
            });
            
            ws1.on('close', (code, reason) => {
                if (code === 1008) {
                    console.log('✅ Connection properly rejected without token');
                } else {
                    console.log('⚠️ Connection closed with unexpected code:', code, reason);
                }
                resolve();
            });
            
            ws1.on('error', (error) => {
                console.log('✅ Connection error as expected:', error.message);
                resolve();
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                console.log('⏰ Connection timeout');
                ws1.close();
                resolve();
            }, 5000);
        });
        
        // Test 2: Connection with invalid token (should fail)
        console.log('\n2️⃣ Testing connection with invalid token (should fail)...');
        const ws2 = new WebSocket('ws://localhost:8081?token=invalid_token');
        
        await new Promise((resolve) => {
            ws2.on('open', () => {
                console.log('❌ Connection opened with invalid token (unexpected)');
                ws2.close();
                resolve();
            });
            
            ws2.on('close', (code, reason) => {
                if (code === 1008) {
                    console.log('✅ Connection properly rejected with invalid token');
                } else {
                    console.log('⚠️ Connection closed with unexpected code:', code, reason);
                }
                resolve();
            });
            
            ws2.on('error', (error) => {
                console.log('✅ Connection error as expected:', error.message);
                resolve();
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                console.log('⏰ Connection timeout');
                ws2.close();
                resolve();
            }, 5000);
        });
        
        // Test 3: Connection with valid token (mock)
        console.log('\n3️⃣ Testing connection with valid token (mock)...');
        const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlciIsInJvbGUiOiJhZ2VudCIsImNvbXBhbnlfaWQiOiJ0ZXN0LWNvbXBhbnkiLCJpYXQiOjE2NzI1NDU2NzB9.test_signature';
        const ws3 = new WebSocket(`ws://localhost:8081?token=${mockToken}`);
        
        await new Promise((resolve) => {
            ws3.on('open', () => {
                console.log('✅ Connection opened with valid token');
                
                // Test ping message
                ws3.send(JSON.stringify({
                    type: 'ping',
                    timestamp: new Date().toISOString()
                }));
                
                // Wait for pong response
                setTimeout(() => {
                    ws3.close();
                    resolve();
                }, 2000);
            });
            
            ws3.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log('📨 Message received:', message.type);
                    
                    if (message.type === 'pong') {
                        console.log('✅ Ping-pong working correctly');
                    }
                } catch (error) {
                    console.error('❌ Error parsing message:', error);
                }
            });
            
            ws3.on('close', (code, reason) => {
                console.log('🔌 Connection closed:', code, reason);
                resolve();
            });
            
            ws3.on('error', (error) => {
                console.log('❌ Connection error:', error.message);
                resolve();
            });
            
            // Timeout after 10 seconds
            setTimeout(() => {
                console.log('⏰ Connection timeout');
                ws3.close();
                resolve();
            }, 10000);
        });
        
        console.log('\n✅ WebSocket server tests completed!');
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Test server status
async function testServerStatus() {
    console.log('\n🔍 Testing server status...');
    
    try {
        const response = await fetch('http://localhost:3000/health');
        const data = await response.json();
        console.log('✅ Main server health check:', data.status);
    } catch (error) {
        console.log('⚠️ Main server not responding (may not be started yet)');
    }
}

// Run tests
async function runTests() {
    await testWebSocketServer();
    await testServerStatus();
    
    console.log('\n🎯 Next steps:');
    console.log('1. Start the WebSocket server: node websocket-server.js');
    console.log('2. Start the main server: npm run dev');
    console.log('3. Or use the startup script: start-servers.bat (Windows) / start-servers.sh (Linux/Mac)');
}

runTests();
