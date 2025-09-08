// IVR Dashboard JavaScript
class IVRDashboard {
    constructor() {
        this.currentFlow = null;
        this.flows = [];
        this.content = [];
        this.routingRules = [];
        this.init();
    }

    async init() {
        console.log('🚀 Initializing IVR Dashboard...');
        await this.loadData();
        this.setupEventListeners();
        this.initializeFlowBuilder();
        this.updateDashboard();
    }

    async loadData() {
        try {
            // Load IVR flows
            const flowsResponse = await fetch('/api/ivr/flows');
            if (flowsResponse.ok) {
                this.flows = await flowsResponse.json();
            }

            // Load content library
            const contentResponse = await fetch('/api/ivr/content');
            if (contentResponse.ok) {
                this.content = await contentResponse.json();
            }

            // Load routing rules
            const rulesResponse = await fetch('/api/ivr/routing-rules');
            if (rulesResponse.ok) {
                this.routingRules = await rulesResponse.json();
            }

            console.log('✅ Data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
        }
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Create new flow button
        const createFlowBtn = document.getElementById('create-flow-btn');
        if (createFlowBtn) {
            createFlowBtn.addEventListener('click', () => this.createNewFlow());
        }

        // Content upload
        const contentUpload = document.getElementById('content-upload');
        if (contentUpload) {
            contentUpload.addEventListener('change', (e) => this.handleContentUpload(e));
        }

        // Save flow button
        const saveFlowBtn = document.getElementById('save-flow-btn');
        if (saveFlowBtn) {
            saveFlowBtn.addEventListener('click', () => this.saveCurrentFlow());
        }
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Remove active class from all tabs
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.remove('bg-indigo-600', 'text-white');
            tab.classList.add('bg-gray-100', 'text-gray-700');
        });

        // Show selected tab content
        const selectedContent = document.getElementById(`${tabName}-tab`);
        if (selectedContent) {
            selectedContent.classList.remove('hidden');
        }

        // Activate selected tab
        const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedTab) {
            selectedTab.classList.remove('bg-gray-100', 'text-gray-700');
            selectedTab.classList.add('bg-indigo-600', 'text-white');
        }
    }

    initializeFlowBuilder() {
        const canvas = document.getElementById('flow-canvas');
        if (!canvas) return;

        // Initialize drag and drop
        this.setupDragAndDrop(canvas);

        // Add sample flow if none exists
        if (this.flows.length === 0) {
            this.createSampleFlow();
        }
    }

    setupDragAndDrop(canvas) {
        // Make canvas a drop zone
        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            canvas.classList.add('border-indigo-400');
        });

        canvas.addEventListener('dragleave', () => {
            canvas.classList.remove('border-indigo-400');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('border-indigo-400');
            const nodeType = e.dataTransfer.getData('text/plain');
            this.addNodeToCanvas(nodeType, e.offsetX, e.offsetY);
        });

        // Make palette items draggable
        document.querySelectorAll('.flow-element').forEach(element => {
            element.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', element.dataset.type);
            });
        });
    }

    addNodeToCanvas(nodeType, x, y) {
        const canvas = document.getElementById('flow-canvas');
        const node = this.createFlowNode(nodeType, x, y);
        canvas.appendChild(node);
        this.connectNodes();
    }

    createFlowNode(type, x, y) {
        const node = document.createElement('div');
        node.className = 'flow-node absolute bg-white border-2 border-gray-300 rounded-lg p-3 shadow-md cursor-move';
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        node.style.width = '120px';
        node.style.height = '80px';

        const icon = this.getNodeIcon(type);
        const label = this.getNodeLabel(type);

        node.innerHTML = `
            <div class="text-center">
                <i class="${icon} text-2xl mb-2"></i>
                <p class="text-sm font-medium">${label}</p>
            </div>
        `;

        // Make node draggable
        this.makeNodeDraggable(node);

        return node;
    }

    getNodeIcon(type) {
        const icons = {
            'audio': 'fas fa-microphone text-blue-500',
            'video': 'fas fa-video text-green-500',
            'menu': 'fas fa-list text-purple-500',
            'transfer': 'fas fa-user text-orange-500'
        };
        return icons[type] || 'fas fa-circle text-gray-500';
    }

    getNodeLabel(type) {
        const labels = {
            'audio': 'Audio Prompt',
            'video': 'Video Content',
            'menu': 'Menu Options',
            'transfer': 'Agent Transfer'
        };
        return labels[type] || 'Unknown';
    }

    makeNodeDraggable(node) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        node.addEventListener('mousedown', (e) => {
            isDragging = true;
            initialX = e.clientX - node.offsetLeft;
            initialY = e.clientY - node.offsetTop;
            node.style.zIndex = '1000';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            node.style.left = `${currentX}px`;
            node.style.top = `${currentY}px`;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            node.style.zIndex = '1';
        });
    }

    createSampleFlow() {
        const canvas = document.getElementById('flow-canvas');
        if (!canvas) return;

        // Create sample nodes
        const startNode = this.createFlowNode('audio', 50, 50);
        const welcomeNode = this.createFlowNode('video', 250, 50);
        const menuNode = this.createFlowNode('menu', 450, 50);
        const transferNode = this.createFlowNode('transfer', 650, 50);

        canvas.appendChild(startNode);
        canvas.appendChild(welcomeNode);
        canvas.appendChild(menuNode);
        canvas.appendChild(transferNode);

        // Add connections
        this.drawConnection(startNode, welcomeNode);
        this.drawConnection(welcomeNode, menuNode);
        this.drawConnection(menuNode, transferNode);
    }

    drawConnection(fromNode, toNode) {
        const canvas = document.getElementById('flow-canvas');
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '0';

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#3B82F6');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');

        // Position line between nodes
        const fromRect = fromNode.getBoundingClientRect();
        const toRect = toNode.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - canvasRect.top;
        const x2 = toRect.left + toRect.width / 2 - canvasRect.left;
        const y2 = toRect.top + toRect.height / 2 - canvasRect.top;

        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);

        svg.appendChild(line);
        canvas.appendChild(svg);
    }

    async createNewFlow() {
        const flowName = prompt('Enter flow name:');
        if (!flowName) return;

        try {
            const response = await fetch('/api/ivr/flows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: flowName,
                    description: 'New IVR flow',
                    flow_type: 'default',
                    nodes: [],
                    connections: [],
                    config: {}
                })
            });

            if (response.ok) {
                const newFlow = await response.json();
                this.flows.push(newFlow.data);
                this.currentFlow = newFlow.data;
                this.updateDashboard();
                this.showNotification('Flow created successfully!', 'success');
            }
        } catch (error) {
            console.error('Error creating flow:', error);
            this.showNotification('Failed to create flow', 'error');
        }
    }

    async saveCurrentFlow() {
        if (!this.currentFlow) {
            this.showNotification('No flow selected', 'error');
            return;
        }

        try {
            const canvas = document.getElementById('flow-canvas');
            const nodes = Array.from(canvas.querySelectorAll('.flow-node')).map(node => ({
                id: node.dataset.id || Math.random().toString(36).substr(2, 9),
                type: node.dataset.type,
                position: {
                    x: parseInt(node.style.left),
                    y: parseInt(node.style.top)
                },
                config: node.dataset.config || {}
            }));

            const response = await fetch(`/api/ivr/flows/${this.currentFlow.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nodes: nodes,
                    connections: this.getConnections(),
                    config: this.currentFlow.config
                })
            });

            if (response.ok) {
                this.showNotification('Flow saved successfully!', 'success');
            }
        } catch (error) {
            console.error('Error saving flow:', error);
            this.showNotification('Failed to save flow', 'error');
        }
    }

    getConnections() {
        // Extract connections from SVG lines
        const canvas = document.getElementById('flow-canvas');
        const lines = canvas.querySelectorAll('svg line');
        const connections = [];

        lines.forEach(line => {
            connections.push({
                from: line.dataset.from,
                to: line.dataset.to,
                type: 'default'
            });
        });

        return connections;
    }

    async handleContentUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', this.getContentType(file));
        formData.append('name', file.name);

        try {
            const response = await fetch('/api/ivr/content', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.content.push(result.data);
                this.updateContentLibrary();
                this.showNotification('Content uploaded successfully!', 'success');
            }
        } catch (error) {
            console.error('Error uploading content:', error);
            this.showNotification('Failed to upload content', 'error');
        }
    }

    getContentType(file) {
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('video/')) return 'video';
        return 'other';
    }

    updateDashboard() {
        this.updateFlowsList();
        this.updateContentLibrary();
        this.updateAnalytics();
    }

    updateFlowsList() {
        const flowsContainer = document.getElementById('flows-list');
        if (!flowsContainer) return;

        flowsContainer.innerHTML = this.flows.map(flow => `
            <div class="flow-item bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer" data-flow-id="${flow.id}">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-semibold text-gray-900">${flow.name}</h3>
                        <p class="text-sm text-gray-600">${flow.description || 'No description'}</p>
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${flow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${flow.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="ivrDashboard.editFlow('${flow.id}')" class="text-indigo-600 hover:text-indigo-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="ivrDashboard.deleteFlow('${flow.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateContentLibrary() {
        const contentContainer = document.getElementById('content-library');
        if (!contentContainer) return;

        contentContainer.innerHTML = this.content.map(item => `
            <div class="content-item bg-white p-4 rounded-lg border border-gray-200">
                <div class="flex items-center space-x-3">
                    <i class="${this.getContentIcon(item.type)} text-2xl"></i>
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${item.name}</h4>
                        <p class="text-sm text-gray-600">${item.type} • ${this.formatFileSize(item.size)}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="ivrDashboard.previewContent('${item.id}')" class="text-indigo-600 hover:text-indigo-800">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="ivrDashboard.deleteContent('${item.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getContentIcon(type) {
        const icons = {
            'audio': 'fas fa-microphone text-blue-500',
            'video': 'fas fa-video text-green-500',
            'image': 'fas fa-image text-purple-500',
            'document': 'fas fa-file text-gray-500'
        };
        return icons[type] || 'fas fa-file text-gray-500';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateAnalytics() {
        const analyticsContainer = document.getElementById('analytics-summary');
        if (!analyticsContainer) return;

        // Mock analytics data - replace with real data
        const analytics = {
            totalCalls: 1250,
            avgWaitTime: '2.5 min',
            satisfactionRate: '94%',
            activeFlows: this.flows.filter(f => f.is_active).length
        };

        analyticsContainer.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-2xl font-bold text-indigo-600">${analytics.totalCalls}</div>
                    <div class="text-sm text-gray-600">Total Calls</div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-2xl font-bold text-green-600">${analytics.avgWaitTime}</div>
                    <div class="text-sm text-gray-600">Avg Wait Time</div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-2xl font-bold text-yellow-600">${analytics.satisfactionRate}</div>
                    <div class="text-sm text-gray-600">Satisfaction</div>
                </div>
                <div class="bg-white p-4 rounded-lg border border-gray-200 text-center">
                    <div class="text-2xl font-bold text-purple-600">${analytics.activeFlows}</div>
                    <div class="text-sm text-gray-600">Active Flows</div>
                </div>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Flow management methods
    editFlow(flowId) {
        const flow = this.flows.find(f => f.id === flowId);
        if (flow) {
            this.currentFlow = flow;
            this.loadFlowToCanvas(flow);
            this.switchTab('flows');
        }
    }

    async deleteFlow(flowId) {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            const response = await fetch(`/api/ivr/flows/${flowId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.flows = this.flows.filter(f => f.id !== flowId);
                this.updateDashboard();
                this.showNotification('Flow deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting flow:', error);
            this.showNotification('Failed to delete flow', 'error');
        }
    }

    loadFlowToCanvas(flow) {
        const canvas = document.getElementById('flow-canvas');
        if (!canvas) return;

        // Clear canvas
        canvas.innerHTML = '';

        // Load nodes
        flow.nodes.forEach(node => {
            const nodeElement = this.createFlowNode(node.type, node.position.x, node.position.y);
            nodeElement.dataset.id = node.id;
            nodeElement.dataset.config = JSON.stringify(node.config);
            canvas.appendChild(nodeElement);
        });

        // Load connections
        flow.connections.forEach(connection => {
            // Implementation for drawing connections
        });
    }

    // Content management methods
    previewContent(contentId) {
        const content = this.content.find(c => c.id === contentId);
        if (!content) return;

        if (content.type === 'audio') {
            this.showAudioPreview(content);
        } else if (content.type === 'video') {
            this.showVideoPreview(content);
        }
    }

    showAudioPreview(content) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">Audio Preview</h3>
                <audio controls class="w-full mb-4">
                    <source src="${content.url}" type="${content.mime_type}">
                </audio>
                <div class="flex justify-end">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    showVideoPreview(content) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg max-w-2xl w-full mx-4">
                <h3 class="text-lg font-semibold mb-4">Video Preview</h3>
                <video controls class="w-full mb-4">
                    <source src="${content.url}" type="${content.mime_type}">
                </video>
                <div class="flex justify-end">
                    <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async deleteContent(contentId) {
        if (!confirm('Are you sure you want to delete this content?')) return;

        try {
            const response = await fetch(`/api/ivr/content/${contentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.content = this.content.filter(c => c.id !== contentId);
                this.updateDashboard();
                this.showNotification('Content deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            this.showNotification('Failed to delete content', 'error');
        }
    }
}

// Initialize IVR Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ivrDashboard = new IVRDashboard();
});

// Export for global access
window.IVRDashboard = IVRDashboard;







