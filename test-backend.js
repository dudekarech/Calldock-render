const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'admin@calldocker.com';
const TEST_PASSWORD = 'admin123';

async function testBackend() {
    console.log('🧪 Testing CallDocker Backend API...\n');
    
    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get('http://localhost:3000/health');
        console.log('✅ Health Check:', healthResponse.data);
        
        // Test 2: Authentication
        console.log('\n2️⃣ Testing Authentication...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        if (loginResponse.data.success) {
            const token = loginResponse.data.data.accessToken;
            console.log('✅ Login successful, token received');
            
            // Test 3: Get User Profile
            console.log('\n3️⃣ Testing User Profile...');
            const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ User Profile:', profileResponse.data.data);
            
            // Test 4: Get System Settings
            console.log('\n4️⃣ Testing System Settings...');
            const settingsResponse = await axios.get(`${BASE_URL}/settings/system`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ System Settings:', settingsResponse.data.data.general);
            
            // Test 5: Get Available Themes
            console.log('\n5️⃣ Testing Available Themes...');
            const themesResponse = await axios.get(`${BASE_URL}/settings/themes`);
            console.log('✅ Available Themes:', themesResponse.data.data.length, 'themes found');
            
            // Test 6: Get Available Languages
            console.log('\n6️⃣ Testing Available Languages...');
            const languagesResponse = await axios.get(`${BASE_URL}/settings/languages`);
            console.log('✅ Available Languages:', languagesResponse.data.data.length, 'languages found');
            
            // Test 7: Get System Status
            console.log('\n7️⃣ Testing System Status...');
            const statusResponse = await axios.get(`${BASE_URL}/settings/system/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('✅ System Status:', statusResponse.data.data.status);
            
        } else {
            console.log('❌ Login failed:', loginResponse.data);
        }
        
    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else if (error.code === 'ECONNREFUSED') {
            console.error('❌ Connection refused. Is the server running on port 3000?');
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

// Run the test
testBackend();
