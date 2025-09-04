#!/usr/bin/env node

/*
================================================================================
AUDIO FUNCTIONALITY TEST SCRIPT
================================================================================
Use this script to verify that the core 2-way audio functionality is working
after making any changes to the codebase.

Run this script before and after any modifications to ensure audio still works.
================================================================================
*/

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Audio Functionality Integrity...\n');

// Check if backup files exist
const backupFiles = [
    'frontend/index-working-audio.html',
    'frontend/agent-dashboard-working-audio.html',
    'websocket-server-working-audio.js'
];

console.log('📁 Checking backup files:');
backupFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`  ✅ ${file} - Available for revert`);
    } else {
        console.log(`  ❌ ${file} - MISSING! Create backup immediately`);
    }
});

// Check if current files have the checkpoint comments
console.log('\n🔒 Checking checkpoint protection:');
const currentFiles = [
    'frontend/index.html',
    'frontend/agent-dashboard.html',
    'websocket-server.js'
];

currentFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('CHECKPOINT: 2-WAY AUDIO WORKING')) {
            console.log(`  ✅ ${file} - Protected with checkpoint`);
        } else {
            console.log(`  ⚠️  ${file} - Missing checkpoint protection`);
        }
    } else {
        console.log(`  ❌ ${file} - File not found`);
    }
});

// Check for critical functions in landing page
console.log('\n🚨 Checking critical functions (Landing Page):');
const landingPageFunctions = [
    'handleIncomingAnswer',
    'handleIncomingICECandidate',
    'startRealCall'
];

const landingPageContent = fs.readFileSync('frontend/index.html', 'utf8');
landingPageFunctions.forEach(func => {
    if (landingPageContent.includes(func)) {
        console.log(`  ✅ ${func}() - Function exists in landing page`);
    } else {
        console.log(`  ❌ ${func}() - CRITICAL FUNCTION MISSING from landing page!`);
    }
});

// Check for critical functions in agent dashboard
console.log('\n🚨 Checking critical functions (Agent Dashboard):');
const agentDashboardFunctions = [
    'startIncomingCall',
    'handleIncomingOffer'
];

const agentDashboardContent = fs.readFileSync('frontend/agent-dashboard.html', 'utf8');
agentDashboardFunctions.forEach(func => {
    if (agentDashboardContent.includes(func)) {
        console.log(`  ✅ ${func}() - Function exists in agent dashboard`);
    } else {
        console.log(`  ❌ ${func}() - CRITICAL FUNCTION MISSING from agent dashboard!`);
    }
});

// Check for WebRTC and WebSocket components
console.log('\n🔧 Checking WebRTC components:');
const webrtcComponents = [
    'RTCPeerConnection',
    'RTCSessionDescription',
    'RTCIceCandidate',
    'getUserMedia'
];

webrtcComponents.forEach(component => {
    if (landingPageContent.includes(component)) {
        console.log(`  ✅ ${component} - WebRTC component found`);
    } else {
        console.log(`  ❌ ${component} - WebRTC component missing`);
    }
});

console.log('\n📋 Manual Testing Required:');
console.log('1. Open landing page: http://localhost:3000/');
console.log('2. Open agent dashboard: http://localhost:3000/agent');
console.log('3. Make a call from landing page');
console.log('4. Answer call from agent dashboard');
console.log('5. Verify 2-way audio works');
console.log('6. If audio fails → REVERT IMMEDIATELY');

console.log('\n🔧 Quick Revert Commands:');
console.log('copy frontend\\index-working-audio.html frontend\\index.html');
console.log('copy frontend\\agent-dashboard-working-audio.html frontend\\agent-dashboard.html');
console.log('copy websocket-server-working-audio.js websocket-server.js');

console.log('\n🏆 Audio Functionality Test Complete!');
console.log('Always test audio manually after any code changes.');
