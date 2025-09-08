// IVR Experience JavaScript
class IVRExperience {
    constructor() {
        this.currentSession = null;
        this.queuePosition = 1;
        this.estimatedWaitTime = '2-3 minutes';
        this.isAudioPlaying = true;
        this.isVideoPlaying = true;
        this.currentNode = null;
        this.init();
    }

    async init() {
        console.log('🎬 Initializing IVR Experience...');
        await this.loadCustomerData();
        this.setupEventListeners();
        this.startIVRSession();
        this.updateUI();
    }

    async loadCustomerData() {
        try {
            // Simulate loading customer data
            console.log('Loading customer data for IVR experience...');
            
            // In a real implementation, this would fetch from the API
            this.customerData = {
                name: 'John Doe',
                email: 'john@example.com',
                company: 'TechCorp Solutions',
                priority: 'standard'
            };
        } catch (error) {
            console.error('Error loading customer data:', error);
        }
    }

    setupEventListeners() {
        // Audio toggle
        const audioToggle = document.getElementById('audio-toggle');
        if (audioToggle) {
            audioToggle.addEventListener('click', () => this.toggleAudio());
        }

        // Video toggle
        const videoToggle = document.getElementById('video-toggle');
        if (videoToggle) {
            videoToggle.addEventListener('click', () => this.toggleVideo());
        }

        // Quick options
        document.querySelectorAll('.quick-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickOption(action);
            });
        });

        // End call button
        const endCallBtn = document.getElementById('end-call');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => this.endCall());

        // Mute call button
        const muteCallBtn = document.getElementById('mute-call');
        if (muteCallBtn) {
            muteCallBtn.addEventListener('click', () => this.toggleMute());
        }
    }

    startIVRSession() {
        // Start video progress simulation
        this.simulateVideoProgress();
        
        // Start queue position updates
        this.simulateQueueUpdates();
        
        // Start audio IVR
        this.playAudioIVR();
        
        // Update connection status
        this.updateConnectionStatus();
    }

    simulateVideoProgress() {
        const progressBar = document.getElementById('videoProgress');
        if (!progressBar) return;

        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 2;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
        }, 1000);
    }

    simulateQueueUpdates() {
        // Simulate queue position changes
        setInterval(() => {
            if (this.queuePosition > 1) {
                this.queuePosition--;
                this.updateQueueInfo();
            }
        }, 15000); // Every 15 seconds

        // Simulate wait time updates
        setInterval(() => {
            const times = ['1-2 minutes', '2-3 minutes', '1-2 minutes', '30 seconds'];
            this.estimatedWaitTime = times[Math.floor(Math.random() * times.length)];
            this.updateQueueInfo();
        }, 20000); // Every 20 seconds
    }

    playAudioIVR() {
        // Simulate audio IVR playback
        const audioStatus = document.querySelector('.audio-status');
        if (audioStatus) {
            audioStatus.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-volume-up text-indigo-600"></i>
                    <span class="text-sm text-indigo-600">Audio Playing</span>
                    <div class="audio-waveform"></div>
                </div>
            `;
        }
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        // Simulate connection progress
        setTimeout(() => {
            statusElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-sm font-medium text-green-600">Connected to agent!</span>
                </div>
            `;
        }, 5000);
    }

    toggleAudio() {
        this.isAudioPlaying = !this.isAudioPlaying;
        const audioStatus = document.querySelector('.audio-status');
        
        if (audioStatus) {
            if (this.isAudioPlaying) {
                audioStatus.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-volume-up text-indigo-600"></i>
                        <span class="text-sm text-indigo-600">Audio Playing</span>
                    </div>
                `;
            } else {
                audioStatus.innerHTML = `
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-volume-mute text-gray-500"></i>
                        <span class="text-sm text-gray-500">Audio Paused</span>
                    </div>
                `;
            }
        }
    }

    toggleVideo() {
        this.isVideoPlaying = !this.isVideoPlaying;
        const video = document.getElementById('ivr-video');
        
        if (video) {
            if (this.isVideoPlaying) {
                video.play();
                document.querySelector('.video-overlay .audio-controls').innerHTML = `
                    <i class="fas fa-volume-up text-indigo-600"></i>
                    <span class="text-sm text-indigo-600">Audio Playing</span>
                `;
            } else {
                video.pause();
                document.querySelector('.video-overlay .audio-controls').innerHTML = `
                    <i class="fas fa-volume-mute text-gray-500"></i>
                    <span class="text-sm text-gray-500">Audio Paused</span>
                `;
            }
        }
    }

    handleQuickOption(action) {
        switch (action) {
            case 'callback':
                this.requestCallback();
                break;
            case 'chat':
                this.startLiveChat();
                break;
            case 'faq':
                this.showFAQ();
                break;
            case 'email':
                this.sendEmail();
                break;
        }
    }

    requestCallback() {
        this.showNotification('Callback request sent! We\'ll call you back shortly.', 'success');
        
        // Update UI to show callback requested
        const callbackBtn = document.querySelector('[data-action="callback"]');
        if (callbackBtn) {
            callbackBtn.innerHTML = `
                <i class="fas fa-check text-green-600"></i>
                <span class="text-sm font-medium text-green-600">Callback Requested</span>
            `;
            callbackBtn.disabled = true;
        }
    }

    startLiveChat() {
        this.showNotification('Live chat is starting...', 'info');
        
        // Simulate chat window opening
        setTimeout(() => {
            this.showChatWindow();
        }, 1000);
    }

    showFAQ() {
        this.showNotification('Opening FAQ section...', 'info');
        
        // Simulate FAQ modal
        setTimeout(() => {
            this.showFAQModal();
        }, 500);
    }

    sendEmail() {
        this.showNotification('Email form opening...', 'info');
        
        // Simulate email form
        setTimeout(() => {
            this.showEmailForm();
        }, 500);
    }

    showChatWindow() {
        const chatWindow = document.createElement('div');
        chatWindow.className = 'fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50';
        chatWindow.innerHTML = `
            <div class="bg-indigo-600 text-white p-3 rounded-t-lg flex justify-between items-center">
                <h3 class="font-medium">Live Chat</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="p-4 h-80 overflow-y-auto">
                <div class="text-center text-gray-500">
                    <i class="fas fa-comments text-3xl mb-2"></i>
                    <p>Chat window will open here</p>
                </div>
            </div>
        `;
        document.body.appendChild(chatWindow);
    }

    showFAQModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
                <div class="space-y-3">
                    <div class="border-b pb-2">
                        <h4 class="font-medium">How do I reset my password?</h4>
                        <p class="text-sm text-gray-600 mt-1">You can reset your password through the login page...</p>
                    </div>
                    <div class="border-b pb-2">
                        <h4 class="font-medium">What are your business hours?</h4>
                        <p class="text-sm text-gray-600 mt-1">We're available Monday-Friday, 9 AM - 6 PM EST...</p>
                    </div>
                </div>
                <div class="flex justify-end mt-4">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showEmailForm() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">Send us an Email</h3>
                <form class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="How can we help?">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea rows="4" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Please describe your issue..."></textarea>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                            Send Email
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }

    endCall() {
        if (confirm('Are you sure you want to end this call?')) {
            this.showNotification('Call ended. Thank you for contacting us!', 'info');
            
            // Update UI to show call ended
            const endCallBtn = document.getElementById('end-call');
            if (endCallBtn) {
                endCallBtn.innerHTML = `
                    <i class="fas fa-phone-slash text-red-600"></i>
                    <span class="text-sm font-medium text-red-600">Call Ended</span>
                `;
                endCallBtn.disabled = true;
            }

            // Redirect after a delay
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        }
    }

    toggleMute() {
        const muteBtn = document.getElementById('mute-call');
        if (!muteBtn) return;

        const isMuted = muteBtn.classList.contains('muted');
        
        if (isMuted) {
            muteBtn.classList.remove('muted', 'bg-red-600');
            muteBtn.classList.add('bg-gray-600');
            muteBtn.innerHTML = `
                <i class="fas fa-microphone text-white"></i>
                <span class="text-sm font-medium text-white">Mute</span>
            `;
            this.showNotification('Microphone unmuted', 'info');
        } else {
            muteBtn.classList.add('muted', 'bg-red-600');
            muteBtn.classList.remove('bg-gray-600');
            muteBtn.innerHTML = `
                <i class="fas fa-microphone-slash text-white"></i>
                <span class="text-sm font-medium text-white">Unmute</span>
            `;
            this.showNotification('Microphone muted', 'info');
        }
    }

    updateQueueInfo() {
        const queueElement = document.getElementById('queue-position');
        const waitTimeElement = document.getElementById('wait-time');
        
        if (queueElement) {
            queueElement.textContent = this.queuePosition;
        }
        
        if (waitTimeElement) {
            waitTimeElement.textContent = this.estimatedWaitTime;
        }
    }

    updateUI() {
        // Update queue information
        this.updateQueueInfo();
        
        // Update connection status
        this.updateConnectionStatus();
        
        // Start video progress
        this.simulateVideoProgress();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // API integration methods
    async createIVRSession() {
        try {
            const response = await fetch('/api/ivr/sessions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_data: this.customerData,
                    flow_type: 'default',
                    company_id: 'demo-company-id'
                })
            });

            if (response.ok) {
                const session = await response.json();
                this.currentSession = session.data;
                console.log('IVR session created:', this.currentSession);
            }
        } catch (error) {
            console.error('Error creating IVR session:', error);
        }
    }

    async getNextNode() {
        if (!this.currentSession) return;

        try {
            const response = await fetch(`/api/ivr/sessions/${this.currentSession.id}/next`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.currentNode = result.data;
                this.executeNode(this.currentNode);
            }
        } catch (error) {
            console.error('Error getting next node:', error);
        }
    }

    executeNode(node) {
        if (!node) return;

        switch (node.type) {
            case 'audio':
                this.playAudioNode(node);
                break;
            case 'video':
                this.playVideoNode(node);
                break;
            case 'menu':
                this.showMenuNode(node);
                break;
            case 'transfer':
                this.transferToAgent(node);
                break;
        }
    }

    playAudioNode(node) {
        // Play audio content
        console.log('Playing audio node:', node);
        
        // Update audio status
        const audioStatus = document.querySelector('.audio-status');
        if (audioStatus && node.content) {
            audioStatus.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-volume-up text-indigo-600"></i>
                    <span class="text-sm text-indigo-600">${node.content.message || 'Audio Playing'}</span>
                </div>
            `;
        }
    }

    playVideoNode(node) {
        // Play video content
        console.log('Playing video node:', node);
        
        // Update video source if provided
        if (node.content && node.content.video_url) {
            const video = document.getElementById('ivr-video');
            if (video) {
                video.src = node.content.video_url;
                video.play();
            }
        }
    }

    showMenuNode(node) {
        // Show menu options
        console.log('Showing menu node:', node);
        
        if (node.content && node.content.options) {
            // Update quick options based on menu content
            this.updateQuickOptions(node.content.options);
        }
    }

    transferToAgent(node) {
        // Transfer to agent
        console.log('Transferring to agent:', node);
        
        this.showNotification('Connecting you to an agent...', 'info');
        
        // Update connection status
        setTimeout(() => {
            this.updateConnectionStatus();
        }, 2000);
    }

    updateQuickOptions(options) {
        const quickOptionsContainer = document.querySelector('.quick-options');
        if (!quickOptionsContainer) return;

        quickOptionsContainer.innerHTML = options.map(option => `
            <button class="quick-option bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-lg p-4 text-center hover:bg-white hover:bg-opacity-30 transition-all duration-200" data-action="${option.action}">
                <i class="${option.icon} text-2xl mb-2"></i>
                <span class="text-sm font-medium text-white">${option.label}</span>
            </button>
        `).join('');

        // Re-attach event listeners
        document.querySelectorAll('.quick-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickOption(action);
            });
        });
    }
}

// Initialize IVR Experience when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ivrExperience = new IVRExperience();
});

// Export for global access
window.IVRExperience = IVRExperience;







