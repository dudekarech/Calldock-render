/**
 * CallDocker Widget Integration Script
 * This script creates an interactive widget that can be embedded on any website
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        position: 'bottom-right',
        theme: 'blue',
        flowId: null,
        apiUrl: window.location.origin,
        debug: false
    };

    // Widget state
    let widgetState = {
        isOpen: false,
        currentFlow: null,
        currentStep: 0,
        sessionId: null
    };

    // DOM elements
    let widgetContainer = null;
    let widgetButton = null;
    let widgetPopup = null;

    // Initialize widget
    function init() {
        // Get configuration from script tag attributes
        const script = document.currentScript;
        if (script) {
            CONFIG.position = script.getAttribute('data-position') || CONFIG.position;
            CONFIG.theme = script.getAttribute('data-theme') || CONFIG.theme;
            CONFIG.flowId = script.getAttribute('data-flow-id') || CONFIG.flowId;
            CONFIG.apiUrl = script.getAttribute('data-api-url') || CONFIG.apiUrl;
        }

        // Create widget HTML
        createWidget();
        
        // Load flow data
        loadFlow();
        
        // Setup event listeners
        setupEventListeners();
        
        log('CallDocker widget initialized');
    }

    function createWidget() {
        // Create widget container
        widgetContainer = document.createElement('div');
        widgetContainer.id = 'calldocker-widget';
        widgetContainer.style.cssText = `
            position: fixed;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Set position
        const positions = {
            'bottom-right': 'bottom: 20px; right: 20px;',
            'bottom-left': 'bottom: 20px; left: 20px;',
            'top-right': 'top: 20px; right: 20px;',
            'top-left': 'top: 20px; left: 20px;'
        };
        widgetContainer.style.cssText += positions[CONFIG.position] || positions['bottom-right'];

        // Create widget button
        widgetButton = document.createElement('div');
        widgetButton.className = 'calldocker-widget-button';
        widgetButton.innerHTML = `
            <div style="
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: linear-gradient(135deg, ${getThemeColors().primary}, ${getThemeColors().secondary});
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 24px;
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            ">
                <i class="fas fa-phone"></i>
                <div class="pulse-ring" style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 100%;
                    height: 100%;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                "></div>
            </div>
        `;

        // Create widget popup
        widgetPopup = document.createElement('div');
        widgetPopup.className = 'calldocker-widget-popup';
        widgetPopup.style.cssText = `
            position: absolute;
            bottom: 80px;
            right: 0;
            width: 350px;
            max-width: calc(100vw - 40px);
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            transform: translateY(20px) scale(0.9);
            opacity: 0;
            transition: all 0.3s ease;
            overflow: hidden;
            display: none;
        `;

        widgetPopup.innerHTML = `
            <div class="widget-header" style="
                background: linear-gradient(135deg, ${getThemeColors().primary}, ${getThemeColors().secondary});
                color: white;
                padding: 20px;
                text-align: center;
                position: relative;
            ">
                <button class="close-btn" style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                ">×</button>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600;">CallDocker Support</h3>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">How can we help you today?</p>
            </div>
            <div class="widget-content" style="padding: 20px;">
                <div class="flow-steps"></div>
                <div class="widget-actions" style="text-align: center; margin-top: 20px;">
                    <button class="start-conversation-btn" style="
                        background: linear-gradient(135deg, ${getThemeColors().primary}, ${getThemeColors().secondary});
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">Start Conversation</button>
                </div>
            </div>
        `;

        // Add CSS animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
            }
            .calldocker-widget-button:hover {
                transform: scale(1.1);
            }
            .calldocker-widget-button:active {
                transform: scale(0.95);
            }
            .calldocker-widget-popup.show {
                transform: translateY(0) scale(1);
                opacity: 1;
                display: block;
            }
            .flow-step {
                padding: 15px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                margin-bottom: 15px;
                transition: all 0.3s ease;
            }
            .flow-step:hover {
                border-color: ${getThemeColors().primary};
                background: #f0f9ff;
            }
            .flow-step.active {
                border-color: #10b981;
                background: #ecfdf5;
            }
            .menu-option {
                display: flex;
                align-items: center;
                padding: 10px;
                background: #f9fafb;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .menu-option:hover {
                background: #f3f4f6;
            }
            .option-key {
                width: 24px;
                height: 24px;
                background: ${getThemeColors().primary};
                color: white;
                font-size: 12px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(style);

        // Assemble widget
        widgetContainer.appendChild(widgetButton);
        widgetContainer.appendChild(widgetPopup);
        document.body.appendChild(widgetContainer);
    }

    function setupEventListeners() {
        // Widget button click
        widgetButton.addEventListener('click', toggleWidget);
        
        // Close button click
        const closeBtn = widgetPopup.querySelector('.close-btn');
        closeBtn.addEventListener('click', closeWidget);
        
        // Start conversation button
        const startBtn = widgetPopup.querySelector('.start-conversation-btn');
        startBtn.addEventListener('click', startConversation);
        
        // Close on outside click
        document.addEventListener('click', (e) => {
            if (widgetState.isOpen && !widgetContainer.contains(e.target)) {
                closeWidget();
            }
        });
    }

    async function loadFlow() {
        try {
            if (!CONFIG.flowId) {
                // Load default flow
                widgetState.currentFlow = getDefaultFlow();
                renderFlow();
                return;
            }

            const response = await fetch(`${CONFIG.apiUrl}/api/ivr/flows/${CONFIG.flowId}`);
            if (response.ok) {
                const result = await response.json();
                widgetState.currentFlow = result.data;
                renderFlow();
            } else {
                throw new Error('Failed to load flow');
            }
        } catch (error) {
            log('Error loading flow:', error);
            widgetState.currentFlow = getDefaultFlow();
            renderFlow();
        }
    }

    function getDefaultFlow() {
        return {
            id: 'default',
            name: 'Default Support Flow',
            steps: [
                {
                    id: 1,
                    type: 'audio',
                    title: 'Welcome Message',
                    content: 'Welcome to CallDocker support. How can we help you today?'
                },
                {
                    id: 2,
                    type: 'menu',
                    title: 'Choose Option',
                    content: 'Please select an option:',
                    options: [
                        { key: '1', label: 'Technical Support' },
                        { key: '2', label: 'Sales Inquiry' },
                        { key: '3', label: 'Billing Question' }
                    ]
                },
                {
                    id: 3,
                    type: 'transfer',
                    title: 'Connect to Agent',
                    content: 'Connecting you to a live agent...'
                }
            ]
        };
    }

    function renderFlow() {
        const container = widgetPopup.querySelector('.flow-steps');
        if (!container || !widgetState.currentFlow) return;

        container.innerHTML = widgetState.currentFlow.steps.map(step => {
            if (step.type === 'audio') {
                return `
                    <div class="flow-step" data-step="${step.id}">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <i class="fas fa-microphone" style="color: ${getThemeColors().primary}; margin-right: 8px;"></i>
                            <span style="font-weight: 600;">${step.title}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">${step.content}</p>
                    </div>
                `;
            } else if (step.type === 'menu') {
                return `
                    <div class="flow-step" data-step="${step.id}">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <i class="fas fa-list" style="color: #8b5cf6; margin-right: 8px;"></i>
                            <span style="font-weight: 600;">${step.title}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 12px;">${step.content}</p>
                        <div class="menu-options">
                            ${step.options.map(option => `
                                <div class="menu-option" data-key="${option.key}">
                                    <div class="option-key">${option.key}</div>
                                    <span style="font-size: 14px;">${option.label}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (step.type === 'transfer') {
                return `
                    <div class="flow-step" data-step="${step.id}">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <i class="fas fa-user" style="color: #f59e0b; margin-right: 8px;"></i>
                            <span style="font-weight: 600;">${step.title}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin: 0;">${step.content}</p>
                    </div>
                `;
            }
            return '';
        }).join('');

        // Add click handlers for menu options
        container.querySelectorAll('.menu-option').forEach(option => {
            option.addEventListener('click', () => {
                const key = option.getAttribute('data-key');
                handleMenuSelection(key);
            });
        });
    }

    function handleMenuSelection(key) {
        log('Menu option selected:', key);
        
        // Mark current step as completed
        const currentStep = widgetPopup.querySelector(`[data-step="${widgetState.currentStep + 1}"]`);
        if (currentStep) {
            currentStep.classList.add('active');
        }
        
        // Move to next step
        widgetState.currentStep++;
        
        // Show next step
        const nextStep = widgetPopup.querySelector(`[data-step="${widgetState.currentStep + 1}"]`);
        if (nextStep) {
            nextStep.scrollIntoView({ behavior: 'smooth' });
        }
        
        // If this was the last step, show completion message
        if (widgetState.currentStep >= widgetState.currentFlow.steps.length) {
            showCompletionMessage();
        }
    }

    function showCompletionMessage() {
        const container = widgetPopup.querySelector('.flow-steps');
        container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 60px; height: 60px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <i class="fas fa-check" style="color: white; font-size: 24px;"></i>
                </div>
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">Thank you!</h3>
                <p style="margin: 0; color: #6b7280;">We'll connect you with an agent shortly.</p>
            </div>
        `;
    }

    function startConversation() {
        widgetState.currentStep = 0;
        renderFlow();
        log('Conversation started');
    }

    function toggleWidget() {
        if (widgetState.isOpen) {
            closeWidget();
        } else {
            openWidget();
        }
    }

    function openWidget() {
        widgetState.isOpen = true;
        widgetPopup.style.display = 'block';
        setTimeout(() => {
            widgetPopup.classList.add('show');
        }, 10);
        log('Widget opened');
    }

    function closeWidget() {
        widgetState.isOpen = false;
        widgetPopup.classList.remove('show');
        setTimeout(() => {
            widgetPopup.style.display = 'none';
        }, 300);
        log('Widget closed');
    }

    function getThemeColors() {
        const themes = {
            blue: { primary: '#3b82f6', secondary: '#8b5cf6' },
            green: { primary: '#10b981', secondary: '#059669' },
            purple: { primary: '#8b5cf6', secondary: '#7c3aed' },
            orange: { primary: '#f59e0b', secondary: '#d97706' }
        };
        return themes[CONFIG.theme] || themes.blue;
    }

    function log(...args) {
        if (CONFIG.debug) {
            console.log('[CallDocker Widget]', ...args);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose widget API for external control
    window.CallDockerWidget = {
        open: openWidget,
        close: closeWidget,
        toggle: toggleWidget,
        loadFlow: loadFlow,
        config: CONFIG
    };

})();