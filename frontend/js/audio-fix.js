/**
 * Audio Fix for CallDocker WebRTC Issues
 * This script addresses the audio connectivity problems
 */

// Enhanced audio handling for WebRTC calls
function enhanceAudioHandling() {
    console.log('🔧 Applying audio fixes...');
    
    // Override the default ontrack handler
    if (window.peerConnection) {
        window.peerConnection.ontrack = function(event) {
            console.log('Received remote stream:', event.streams[0]);
            const remoteStream = event.streams[0];
            
            // Handle remote audio with better error handling
            const remoteAudio = document.getElementById('remoteAudio');
            if (remoteAudio) {
                remoteAudio.srcObject = remoteStream;
                remoteAudio.muted = false;
                remoteAudio.volume = 1.0;
                
                // Add comprehensive event listeners
                remoteAudio.addEventListener('loadstart', () => console.log('🔍 Audio loadstart'));
                remoteAudio.addEventListener('loadeddata', () => console.log('🔍 Audio loadeddata'));
                remoteAudio.addEventListener('canplay', () => console.log('🔍 Audio canplay'));
                remoteAudio.addEventListener('play', () => console.log('🔍 Audio playing'));
                remoteAudio.addEventListener('error', (e) => console.error('Audio error:', e));
                remoteAudio.addEventListener('stalled', () => console.log('Audio stalled'));
                remoteAudio.addEventListener('waiting', () => console.log('Audio waiting'));
                
                // Try to play audio with retry logic
                const playAudio = () => {
                    remoteAudio.play().then(() => {
                        console.log('✅ Remote audio playing successfully');
                    }).catch(e => {
                        console.error('Audio play failed:', e);
                        // Retry after a short delay
                        setTimeout(playAudio, 1000);
                    });
                };
                
                // Start playing
                playAudio();
            }
        };
    }
    
    // Enhanced ICE connection monitoring
    if (window.peerConnection) {
        window.peerConnection.oniceconnectionstatechange = function() {
            console.log('ICE connection state:', window.peerConnection.iceConnectionState);
            
            if (window.peerConnection.iceConnectionState === 'connected' || 
                window.peerConnection.iceConnectionState === 'completed') {
                console.log('✅ ICE connection established');
                
                // Force audio to play when connection is established
                setTimeout(() => {
                    const remoteAudio = document.getElementById('remoteAudio');
                    if (remoteAudio && remoteAudio.paused) {
                        remoteAudio.play().catch(e => console.log('Audio play failed:', e));
                    }
                }, 1000);
            } else if (window.peerConnection.iceConnectionState === 'failed' || 
                       window.peerConnection.iceConnectionState === 'disconnected') {
                console.log('❌ ICE connection failed or disconnected');
                
                // Get connection stats for debugging
                window.peerConnection.getStats().then(stats => {
                    console.log('🔍 ICE connection stats on failure:');
                    stats.forEach(report => {
                        if (report.type === 'candidate-pair' && report.state === 'failed') {
                            console.log('Failed candidate pair:', report);
                        }
                    });
                });
            }
        };
    }
    
    // Add audio recovery function
    window.recoverAudio = function() {
        const remoteAudio = document.getElementById('remoteAudio');
        if (remoteAudio) {
            console.log('🔧 Attempting audio recovery...');
            remoteAudio.load();
            remoteAudio.play().catch(e => console.log('Audio recovery failed:', e));
        }
    };
    
    console.log('✅ Audio fixes applied');
}

// Apply fixes when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceAudioHandling);
} else {
    enhanceAudioHandling();
}

// Export for use in other scripts
window.enhanceAudioHandling = enhanceAudioHandling;
