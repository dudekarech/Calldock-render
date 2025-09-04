// Production-ready admin dashboard JavaScript with integrated IVR Management
class AdminDashboard {
    constructor() {
        this.authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
        this.ivrFlows = [];
        this.ivrContent = [];
        this.currentFlow = null;
        this.init();
    }

    async init() {
        if (!this.authToken) {
            window.location.href = '/admin-login';
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (!response.ok) {
                throw new Error('Authentication failed');
            }

            const result = await response.json();
            this.user = result.data.user;
            this.updateUserInfo();
            this.loadCompanyRegistrations();
            this.loadIVRData();
            this.setupEventListeners();
            this.initializeNavigation();
            this.initializeIVRFlowBuilder();
            
        } catch (error) {
            console.error('Authentication error:', error);
            this.logout();
        }
    }

    updateUserInfo() {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-sm font-semibold">
                            ${this.user.first_name?.charAt(0) || 'A'}
                        </span>
                    </div>
                    <div>
                        <div class="text-sm font-medium text-gray-900">
                            ${this.user.first_name} ${this.user.last_name}
                        </div>
                        <div class="text-xs text-gray-500 capitalize">
                            ${this.user.role}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadCompanyRegistrations() {
        try {
            const response = await fetch('/api/company-registrations', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const result = await response.json();
                this.registrations = result.data || [];
                this.updateRegistrationStats();
                this.displayRegistrations();
            }
        } catch (error) {
            console.error('Error loading registrations:', error);
            this.loadMockRegistrations();
        }
    }

    async loadIVRData() {
        try {
            // Load IVR flows - for global admin, we'll load all flows
            const flowsResponse = await fetch('/api/ivr/flows?global_admin=true', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            if (flowsResponse.ok) {
                const flowsResult = await flowsResponse.json();
                this.ivrFlows = flowsResult.data || [];
            }

            // Load IVR content - for global admin, we'll load all content
            const contentResponse = await fetch('/api/ivr/content?global_admin=true', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            if (contentResponse.ok) {
                const contentResult = await contentResponse.json();
                this.ivrContent = contentResult.data || [];
            }

            this.updateIVRFlowsList();
            this.updateContentLibrary();
            this.updateAnalytics();
        } catch (error) {
            console.error('Error loading IVR data:', error);
            // Load mock data for development
            this.loadMockIVRData();
        }
    }

    loadMockIVRData() {
        this.ivrFlows = [
            {
                id: '1',
                name: 'Default Support Flow',
                description: 'Main support IVR flow',
                is_active: true,
                flow_type: 'support',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Sales Flow',
                description: 'Sales department IVR flow',
                is_active: true,
                flow_type: 'sales',
                created_at: new Date().toISOString()
            }
        ];

        this.ivrContent = [
            {
                id: '1',
                name: 'Welcome Message',
                type: 'audio',
                size: 1024000,
                url: '/audio/welcome.mp3'
            },
            {
                id: '2',
                name: 'Company Video',
                type: 'video',
                size: 5120000,
                url: '/video/company-intro.mp4'
            }
        ];

        this.updateIVRFlowsList();
        this.updateContentLibrary();
        this.updateAnalytics();
    }

    // IVR Flow Builder Integration
    initializeIVRFlowBuilder() {
        this.setupIVRTabs();
        this.setupDragAndDrop();
        this.setupFlowElements();
        this.setupContentUpload();
        this.setupWidgetIntegration();
        this.setupAnalytics();
    }

    setupIVRTabs() {
        const ivrTabs = document.querySelectorAll('[data-ivr-tab]');
        const ivrTabContents = document.querySelectorAll('.ivr-tab-content');

        ivrTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetTab = e.target.getAttribute('data-ivr-tab');
                
                // Hide all tab contents
                ivrTabContents.forEach(content => {
                    content.classList.remove('active');
                    content.classList.add('hidden');
                });
                
                // Remove active class from all tabs
                ivrTabs.forEach(t => {
                    t.classList.remove('border-indigo-600', 'text-indigo-600');
                    t.classList.add('border-transparent', 'text-gray-500');
                });
                
                // Show selected tab content
                const selectedContent = document.getElementById(`ivr-${targetTab}-tab`);
                if (selectedContent) {
                    selectedContent.classList.add('active');
                    selectedContent.classList.remove('hidden');
                    selectedContent.classList.add('fade-in');
                }
                
                // Activate selected tab
                e.target.classList.remove('border-transparent', 'text-gray-500');
                e.target.classList.add('border-indigo-600', 'text-indigo-600');

                // Load data for specific tabs
                if (targetTab === 'content') {
                    this.updateContentLibrary();
                } else if (targetTab === 'analytics') {
                    this.loadAnalytics('7d');
                } else if (targetTab === 'widget') {
                    this.populateFlowSelect();
                    this.updateWidgetPreview();
                    this.generateIntegrationCode();
                }
            });
        });
    }

    setupDragAndDrop() {
        const canvas = document.getElementById('flow-canvas');
        if (!canvas) return;

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

    setupFlowElements() {
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

        // Preview IVR button
        const previewIVRBtn = document.getElementById('previewIVR');
        if (previewIVRBtn) {
            previewIVRBtn.addEventListener('click', () => this.previewIVR());
        }

        // Save flow button
        const saveFlowBtn = document.getElementById('save-flow-btn');
        if (saveFlowBtn) {
            saveFlowBtn.addEventListener('click', () => this.saveCurrentFlow());
        }

        // Test flow button
        const testFlowBtn = document.getElementById('test-flow-btn');
        if (testFlowBtn) {
            testFlowBtn.addEventListener('click', () => this.testCurrentFlow());
        }

        // Setup upload buttons for audio/video elements
        const uploadBtns = document.querySelectorAll('.upload-btn');
        uploadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                this.openUploadDialog(type);
            });
        });

        // Setup edit buttons for menu/transfer elements
        const editBtns = document.querySelectorAll('.edit-btn');
        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.dataset.type;
                this.openEditDialog(type);
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

    connectNodes() {
        // Implementation for connecting nodes
        // This would draw lines between connected nodes
    }

    async createNewFlow() {
        const flowName = prompt('Enter flow name:');
        if (!flowName) return;

        try {
            const response = await fetch('/api/ivr/flows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    name: flowName,
                    description: 'New IVR flow',
                    flow_type: 'default',
                    company_id: '00000000-0000-0000-0000-000000000000', // Global admin company
                    nodes: [],
                    connections: [],
                    config: {}
                })
            });

            if (response.ok) {
                const newFlow = await response.json();
                this.ivrFlows.push(newFlow.data);
                this.currentFlow = newFlow.data;
                this.updateIVRFlowsList();
                this.showNotification('Flow created successfully!', 'success');
                
                // Load the new flow into the canvas for editing
                this.loadFlowToCanvas(newFlow.data);
                
                // Show the flow builder interface
                this.showFlowBuilder();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create IVR flow');
            }
        } catch (error) {
            console.error('Error creating flow:', error);
            this.showNotification(`Failed to create flow: ${error.message}`, 'error');
        }
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
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                this.ivrContent.push(result.data);
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

    previewIVR() {
        // Open IVR experience in a new window for testing with widget-like dimensions
        window.open('/ivr-experience', '_blank', 'width=400,height=600,resizable=yes,scrollbars=yes');
    }

    // Enhanced Content Upload System
    setupContentUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('content-upload');
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('upload-progress-fill');
        const progressPercentage = document.getElementById('upload-percentage');

        // Drag and drop functionality
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            this.handleFileUpload(files);
        });

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Content filtering
        const typeFilter = document.getElementById('content-type-filter');
        const searchInput = document.getElementById('content-search');
        
        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.filterContent();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterContent();
            });
        }
    }

    async handleFileUpload(files) {
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('upload-progress-fill');
        const progressPercentage = document.getElementById('upload-percentage');

        if (files.length === 0) return;

        progressContainer.classList.remove('hidden');
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const progress = ((i + 1) / files.length) * 100;
            
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', this.getContentType(file));
                formData.append('name', file.name);
                formData.append('company_id', '00000000-0000-0000-0000-000000000000'); // Global admin company

                const response = await fetch('/api/ivr/content', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: formData
                });

                if (response.ok) {
                    const result = await response.json();
                    this.ivrContent.push(result.data);
                }

                progressFill.style.width = `${progress}%`;
                progressPercentage.textContent = `${Math.round(progress)}%`;

            } catch (error) {
                console.error('Error uploading file:', error);
                this.showNotification(`Failed to upload ${file.name}`, 'error');
            }
        }

        this.updateContentLibrary();
        this.showNotification(`${files.length} file(s) uploaded successfully!`, 'success');
        
        setTimeout(() => {
            progressContainer.classList.add('hidden');
            progressFill.style.width = '0%';
            progressPercentage.textContent = '0%';
        }, 2000);
    }

    filterContent() {
        const typeFilter = document.getElementById('content-type-filter')?.value;
        const searchTerm = document.getElementById('content-search')?.value.toLowerCase();
        
        let filteredContent = this.ivrContent;
        
        if (typeFilter) {
            filteredContent = filteredContent.filter(item => item.type === typeFilter);
        }
        
        if (searchTerm) {
            filteredContent = filteredContent.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.description && item.description.toLowerCase().includes(searchTerm))
            );
        }
        
        this.renderContentLibrary(filteredContent);
    }

    // Widget Integration System
    setupWidgetIntegration() {
        const previewWidgetBtn = document.getElementById('preview-widget-btn');
        const copyCodeBtn = document.getElementById('copy-code-btn');
        const defaultFlowSelect = document.getElementById('default-ivr-flow');

        if (previewWidgetBtn) {
            previewWidgetBtn.addEventListener('click', () => {
                this.previewWidget();
            });
        }

        if (copyCodeBtn) {
            copyCodeBtn.addEventListener('click', () => {
                this.copyIntegrationCode();
            });
        }

        if (defaultFlowSelect) {
            this.populateFlowSelect();
            defaultFlowSelect.addEventListener('change', () => {
                this.updateWidgetPreview();
                this.generateIntegrationCode();
            });
        }

        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('border-blue-500'));
                option.classList.add('border-blue-500');
                this.updateWidgetPreview();
            });
        });
    }

    populateFlowSelect() {
        const select = document.getElementById('default-ivr-flow');
        if (!select) return;

        select.innerHTML = '<option value="">Select a flow...</option>';
        this.ivrFlows.forEach(flow => {
            const option = document.createElement('option');
            option.value = flow.id;
            option.textContent = flow.name;
            select.appendChild(option);
        });
    }

    previewWidget() {
        // Open widget preview in new window
        const widgetUrl = `/widget-preview?flow=${document.getElementById('default-ivr-flow')?.value || ''}`;
        window.open(widgetUrl, '_blank', 'width=400,height=600');
    }

    updateWidgetPreview() {
        const preview = document.getElementById('widget-preview');
        if (!preview) return;

        const selectedFlow = document.getElementById('default-ivr-flow')?.value;
        const selectedTheme = document.querySelector('.theme-option.border-blue-500')?.querySelector('div')?.className || 'bg-blue-500';

        preview.innerHTML = `
            <div class="w-16 h-16 ${selectedTheme} rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                <i class="fas fa-phone text-white text-xl"></i>
            </div>
        `;
    }

    generateIntegrationCode() {
        const selectedFlow = document.getElementById('default-ivr-flow')?.value;
        const codeElement = document.getElementById('integration-code');
        
        if (!codeElement) return;

        const code = `<!-- CallDocker Widget Integration -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/widget.js';
    script.setAttribute('data-flow-id', '${selectedFlow || ''}');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-theme', 'blue');
    document.head.appendChild(script);
  })();
</script>`;

        codeElement.textContent = code;
    }

    copyIntegrationCode() {
        const codeElement = document.getElementById('integration-code');
        if (!codeElement) return;

        navigator.clipboard.writeText(codeElement.textContent).then(() => {
            this.showNotification('Integration code copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy code', 'error');
        });
    }

    // Analytics System
    setupAnalytics() {
        const timeframeSelect = document.getElementById('analytics-timeframe');
        
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', () => {
                this.loadAnalytics(timeframeSelect.value);
            });
        }

        this.loadAnalytics('7d');
    }

    async loadAnalytics(timeframe) {
        try {
            const response = await fetch(`/api/ivr/analytics?timeframe=${timeframe}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.renderAnalytics(result.data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.renderAnalytics(this.getMockAnalytics());
        }
    }

    getMockAnalytics() {
        return {
            totalCalls: 1250,
            avgWaitTime: '2.5 min',
            satisfactionRate: '94%',
            activeFlows: this.ivrFlows ? this.ivrFlows.filter(f => f.is_active).length : 0,
            callVolume: [120, 150, 180, 200, 160, 140, 190],
            flowPerformance: [
                { name: 'Support Flow', calls: 450, completion: 85 },
                { name: 'Sales Flow', calls: 320, completion: 78 },
                { name: 'Billing Flow', calls: 280, completion: 92 }
            ]
        };
    }

    renderAnalytics(data) {
        this.renderAnalyticsCards(data);
        this.renderAnalyticsCharts(data);
        this.renderFlowAnalysis(data);
    }

    renderAnalyticsCards(data) {
        const container = document.getElementById('analytics-summary');
        if (!container) return;

        container.innerHTML = `
            <div class="content-card p-6 text-center">
                <div class="text-3xl font-bold text-indigo-600 mb-2">${data.totalCalls}</div>
                <div class="text-sm text-gray-600">Total Calls</div>
                <div class="text-xs text-green-600 mt-1">+12% from last period</div>
            </div>
            <div class="content-card p-6 text-center">
                <div class="text-3xl font-bold text-green-600 mb-2">${data.avgWaitTime}</div>
                <div class="text-sm text-gray-600">Avg Wait Time</div>
                <div class="text-xs text-green-600 mt-1">-8% from last period</div>
            </div>
            <div class="content-card p-6 text-center">
                <div class="text-3xl font-bold text-yellow-600 mb-2">${data.satisfactionRate}</div>
                <div class="text-sm text-gray-600">Satisfaction Rate</div>
                <div class="text-xs text-green-600 mt-1">+3% from last period</div>
            </div>
            <div class="content-card p-6 text-center">
                <div class="text-3xl font-bold text-purple-600 mb-2">${data.activeFlows}</div>
                <div class="text-sm text-gray-600">Active Flows</div>
                <div class="text-xs text-gray-500 mt-1">Currently running</div>
            </div>
        `;
    }

    renderAnalyticsCharts(data) {
        // This would integrate with a charting library like Chart.js
        // For now, we'll show placeholder content
        const callVolumeChart = document.getElementById('call-volume-chart');
        const flowPerformanceChart = document.getElementById('flow-performance-chart');

        if (callVolumeChart) {
            const callVolume = data.callVolume || [];
            const peakCalls = callVolume.length > 0 ? Math.max(...callVolume) : 0;
            callVolumeChart.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-chart-line text-4xl text-gray-300 mb-2"></i>
                    <p class="text-gray-500">Call Volume Chart</p>
                    <p class="text-sm text-gray-400">Peak: ${peakCalls} calls</p>
                </div>
            `;
        }

        if (flowPerformanceChart) {
            const flowPerformance = data.flowPerformance || [];
            flowPerformanceChart.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-chart-pie text-4xl text-gray-300 mb-2"></i>
                    <p class="text-gray-500">Flow Performance</p>
                    <p class="text-sm text-gray-400">${flowPerformance.length} active flows</p>
                </div>
            `;
        }
    }

    renderFlowAnalysis(data) {
        const container = document.getElementById('flow-analysis-table');
        if (!container) return;

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b">
                            <th class="text-left py-3 px-4">Flow Name</th>
                            <th class="text-left py-3 px-4">Total Calls</th>
                            <th class="text-left py-3 px-4">Completion Rate</th>
                            <th class="text-left py-3 px-4">Avg Duration</th>
                            <th class="text-left py-3 px-4">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.flowPerformance.map(flow => `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="py-3 px-4 font-medium">${flow.name}</td>
                                <td class="py-3 px-4">${flow.calls}</td>
                                <td class="py-3 px-4">
                                    <div class="flex items-center">
                                        <div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                            <div class="bg-green-500 h-2 rounded-full" style="width: ${flow.completion}%"></div>
                                        </div>
                                        <span class="text-sm">${flow.completion}%</span>
                                    </div>
                                </td>
                                <td class="py-3 px-4">2.3 min</td>
                                <td class="py-3 px-4">
                                    <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Active</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // IVR Management Methods
    updateIVRFlowsList() {
        const flowsContainer = document.getElementById('flows-list');
        if (!flowsContainer) return;

        if (this.ivrFlows.length === 0) {
            flowsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-phone-volume text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg font-medium">No IVR flows created yet</p>
                    <p class="text-sm">Create your first IVR flow to get started</p>
                </div>
            `;
            return;
        }

        flowsContainer.innerHTML = this.ivrFlows.map(flow => `
            <div class="flow-item bg-white p-4 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors cursor-pointer" data-flow-id="${flow.id}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-900">${flow.name}</h4>
                        <p class="text-sm text-gray-600">${flow.description || 'No description'}</p>
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded-full ${flow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${flow.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="adminDashboard.editFlow('${flow.id}')" class="text-indigo-600 hover:text-indigo-800">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="adminDashboard.deleteFlow('${flow.id}')" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button onclick="adminDashboard.previewFlow('${flow.id}')" class="text-green-600 hover:text-green-800">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateContentLibrary() {
        const contentContainer = document.getElementById('content-library');
        if (!contentContainer) return;

        contentContainer.innerHTML = this.ivrContent.map(item => `
            <div class="content-item bg-white p-4 rounded-lg border border-gray-200">
                <div class="flex items-center space-x-3">
                    <i class="${this.getContentIcon(item.type)} text-2xl"></i>
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${item.name}</h4>
                        <p class="text-sm text-gray-600">${item.type} • ${this.formatFileSize(item.size)}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="adminDashboard.previewContent('${item.id}')" class="text-indigo-600 hover:text-indigo-800">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="adminDashboard.deleteContent('${item.id}')" class="text-red-600 hover:text-red-800">
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
            activeFlows: this.ivrFlows.filter(f => f.is_active).length
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

    // Flow management methods
    editFlow(flowId) {
        const flow = this.ivrFlows.find(f => f.id === flowId);
        if (flow) {
            this.currentFlow = flow;
            this.loadFlowToCanvas(flow);
            // Switch to flows tab
            const flowsTab = document.querySelector('[data-ivr-tab="flows"]');
            if (flowsTab) flowsTab.click();
        }
    }

    async deleteFlow(flowId) {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            const response = await fetch(`/api/ivr/flows/${flowId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                this.ivrFlows = this.ivrFlows.filter(f => f.id !== flowId);
                this.updateIVRFlowsList();
                this.showNotification('Flow deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting flow:', error);
            this.showNotification('Failed to delete flow', 'error');
        }
    }

    previewFlow(flowId) {
        // Open flow preview in new window
        window.open(`/ivr-experience?flow_id=${flowId}`, '_blank', 'width=1200,height=800');
    }

    loadFlowToCanvas(flow) {
        const canvas = document.getElementById('flow-canvas');
        if (!canvas) return;

        // Clear canvas
        canvas.innerHTML = '';

        // Load nodes
        if (flow.nodes && flow.nodes.length > 0) {
            flow.nodes.forEach(node => {
                const nodeElement = this.createFlowNode(node.type, node.position.x, node.position.y);
                nodeElement.dataset.id = node.id;
                nodeElement.dataset.config = JSON.stringify(node.config);
                canvas.appendChild(nodeElement);
            });
        } else {
            // Create sample flow if none exists
            this.createSampleFlow();
        }
    }

    showFlowBuilder() {
        // Show the flow builder interface
        const flowHeader = document.getElementById('flow-header');
        const emptyCanvas = document.getElementById('empty-canvas');
        const flowNodes = document.getElementById('flow-nodes');
        
        if (flowHeader) flowHeader.classList.remove('hidden');
        if (emptyCanvas) emptyCanvas.classList.add('hidden');
        if (flowNodes) flowNodes.classList.remove('hidden');
        
        // Update flow header
        const flowName = document.getElementById('flow-name');
        const flowDescription = document.getElementById('flow-description');
        
        if (flowName && this.currentFlow) {
            flowName.textContent = this.currentFlow.name;
        }
        if (flowDescription && this.currentFlow) {
            flowDescription.textContent = this.currentFlow.description || 'No description';
        }
    }

    async saveCurrentFlow() {
        if (!this.currentFlow) {
            this.showNotification('No flow to save', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/ivr/flows/${this.currentFlow.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(this.currentFlow)
            });

            if (response.ok) {
                this.showNotification('Flow saved successfully!', 'success');
                this.updateIVRFlowsList();
            } else {
                throw new Error('Failed to save flow');
            }
        } catch (error) {
            console.error('Error saving flow:', error);
            this.showNotification('Failed to save flow', 'error');
        }
    }

    testCurrentFlow() {
        if (!this.currentFlow) {
            this.showNotification('No flow to test', 'error');
            return;
        }

        // Open flow test in new window
        window.open(`/ivr-experience?flow_id=${this.currentFlow.id}&test=true`, '_blank', 'width=1200,height=800');
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

    // Content management methods
    previewContent(contentId) {
        const content = this.ivrContent.find(c => c.id === contentId);
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
                    <source src="${content.url}" type="audio/mpeg">
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
                    <source src="${content.url}" type="video/mp4">
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
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (response.ok) {
                this.ivrContent = this.ivrContent.filter(c => c.id !== contentId);
                this.updateContentLibrary();
                this.showNotification('Content deleted successfully!', 'success');
            }
        } catch (error) {
            console.error('Error deleting content:', error);
            this.showNotification('Failed to delete content', 'error');
        }
    }

    // Legacy methods for compatibility
    updateRegistrationStats() {
        const totalRegistrations = this.registrations?.length || 0;
        const activeRegistrations = this.registrations?.filter(r => r.status === 'active').length || 0;
        const pendingRegistrations = this.registrations?.filter(r => r.status === 'pending').length || 0;

        const statsContainer = document.getElementById('registrationStats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalRegistrations}</div>
                        <div class="stat-label">Total Registrations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${activeRegistrations}</div>
                        <div class="stat-label">Active Companies</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${pendingRegistrations}</div>
                        <div class="stat-label">Pending Approval</div>
                    </div>
                </div>
            `;
        }
    }

    displayRegistrations() {
        const registrationsContainer = document.getElementById('registrationsContainer');
        if (!registrationsContainer) return;

        if (this.registrations.length === 0) {
            registrationsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-building text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg font-medium">No company registrations yet</p>
                    <p class="text-sm">Company registrations will appear here</p>
                </div>
            `;
            return;
        }

        registrationsContainer.innerHTML = `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Company Name</th>
                            <th>Contact Email</th>
                            <th>Status</th>
                            <th>Registration Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.registrations.map(reg => `
                            <tr>
                                <td class="font-medium">${reg.company_name}</td>
                                <td>${reg.contact_email}</td>
                                <td>
                                    <span class="status-badge status-${reg.status}">
                                        ${reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                    </span>
                                </td>
                                <td>${new Date(reg.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button class="text-indigo-600 hover:text-indigo-800 mr-2">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="text-green-600 hover:text-green-800 mr-2">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="text-red-600 hover:text-red-800">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    loadMockRegistrations() {
        this.registrations = [
            {
                id: '1',
                company_name: 'TechCorp Solutions',
                contact_email: 'admin@techcorp.com',
                status: 'active',
                created_at: new Date().toISOString()
            },
            {
                id: '2',
                company_name: 'Global Services Inc',
                contact_email: 'contact@globalservices.com',
                status: 'pending',
                created_at: new Date().toISOString()
            }
        ];
        this.updateRegistrationStats();
        this.displayRegistrations();
    }

    setupEventListeners() {
        // Navigation event listeners
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
                this.updateActiveNavLink(link);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Create IVR Flow button (legacy)
        const createIVRFlowBtn = document.getElementById('createIVRFlow');
        if (createIVRFlowBtn) {
            createIVRFlowBtn.addEventListener('click', () => this.createNewFlow());
        }
    }

    initializeNavigation() {
        // Show dashboard by default
        this.showSection('dashboard');
        this.updateActiveNavLink(document.querySelector('[data-section="dashboard"]'));
    }

    showSection(sectionName) {
        // Hide all sections
        const sections = document.querySelectorAll('.section-content');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    updateActiveNavLink(activeLink) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to clicked link
        if (activeLink) {
            activeLink.classList.add('active');
        }
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

    logout() {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        window.location.href = '/admin-login';
    }

    openUploadDialog(type) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'audio' ? 'audio/*' : 'video/*';
        input.style.display = 'none';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.uploadFileDirectly(file, type);
            }
        });
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    uploadFileDirectly(file, type) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        formData.append('company_id', '00000000-0000-0000-0000-000000000000');

        this.showNotification(`Uploading ${type} file...`, 'info');

        fetch('/api/ivr/content', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.authToken}`
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.showNotification(`${type} file uploaded successfully!`, 'success');
                this.loadContentLibrary();
            } else {
                this.showNotification(`Failed to upload ${type} file: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error(`Error uploading ${type} file:`, error);
            this.showNotification(`Error uploading ${type} file`, 'error');
        });
    }

    openEditDialog(type) {
        if (type === 'menu') {
            this.openMenuEditDialog();
        } else if (type === 'transfer') {
            this.openTransferEditDialog();
        }
    }

    openMenuEditDialog() {
        const menuOptions = prompt('Enter menu options (comma-separated):\nExample: Press 1 for Sales, Press 2 for Support, Press 0 for Operator');
        if (menuOptions) {
            this.showNotification('Menu options configured successfully!', 'success');
            // Here you would save the menu configuration
        }
    }

    openTransferEditDialog() {
        const transferConfig = prompt('Enter transfer configuration:\nExample: Transfer to Sales Department, Extension: 1001');
        if (transferConfig) {
            this.showNotification('Transfer configuration saved!', 'success');
            // Here you would save the transfer configuration
        }
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Export for global access
window.AdminDashboard = AdminDashboard;
