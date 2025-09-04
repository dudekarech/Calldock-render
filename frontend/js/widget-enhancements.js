/**
 * CallDocker Enhanced Widget Functionality
 * Enhanced floating widget with smart positioning, drag & drop, and themes
 * Separate from core functionality to ensure safety
 */

class EnhancedWidget {
    constructor() {
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.currentTheme = 'default';
        this.currentSize = 'standard';
        this.position = this.loadPosition();
        this.isExpanded = false;
        
        this.init();
    }

    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.applyPosition();
        this.setupTouchGestures();
    }

    // Position Management
    loadPosition() {
        const savedPosition = localStorage.getItem('widgetPosition');
        if (savedPosition) {
            return JSON.parse(savedPosition);
        }
        
        // Default position - smart positioning
        return this.calculateOptimalPosition();
    }

    savePosition() {
        const position = {
            x: this.position.x,
            y: this.position.y,
            offsetX: this.position.offsetX,
            offsetY: this.position.offsetY
        };
        localStorage.setItem('widgetPosition', JSON.stringify(position));
    }

    calculateOptimalPosition() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const widgetWidth = 320; // Default widget width
        const widgetHeight = 200; // Estimated widget height
        
        // Calculate safe zones (avoid overlapping with common UI elements)
        const safeZones = this.calculateSafeZones(screenWidth, screenHeight, widgetWidth, widgetHeight);
        
        // Find best position
        return this.findBestPosition(safeZones, widgetWidth, widgetHeight);
    }

    calculateSafeZones(screenWidth, screenHeight, widgetWidth, widgetHeight) {
        const safeZones = [];
        
        // Top-left zone
        safeZones.push({
            x: 20,
            y: 20,
            width: screenWidth / 2 - 40,
            height: screenHeight / 2 - 40
        });
        
        // Top-right zone
        safeZones.push({
            x: screenWidth / 2 + 20,
            y: 20,
            width: screenWidth / 2 - 40,
            height: screenHeight / 2 - 40
        });
        
        // Bottom-left zone
        safeZones.push({
            x: 20,
            y: screenHeight / 2 + 20,
            width: screenWidth / 2 - 40,
            height: screenHeight / 2 - 40
        });
        
        // Bottom-right zone (default)
        safeZones.push({
            x: screenWidth - widgetWidth - 20,
            y: screenHeight - widgetHeight - 20,
            width: widgetWidth + 40,
            height: widgetHeight + 40
        });
        
        return safeZones;
    }

    findBestPosition(safeZones, widgetWidth, widgetHeight) {
        // For now, use bottom-right as default
        // In future, implement collision detection with other elements
        return {
            x: 'right',
            y: 'bottom',
            offsetX: 20,
            offsetY: 20
        };
    }

    applyPosition() {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        if (this.position.x === 'right') {
            widget.style.right = this.position.offsetX + 'px';
            widget.style.left = 'auto';
        } else {
            widget.style.left = this.position.offsetX + 'px';
            widget.style.right = 'auto';
        }
        
        if (this.position.y === 'bottom') {
            widget.style.bottom = this.position.offsetY + 'px';
            widget.style.top = 'auto';
        } else {
            widget.style.top = this.position.offsetY + 'px';
            widget.style.bottom = 'auto';
        }
    }

    // Enhanced Drag and Drop
    setupEventListeners() {
        const miniWidget = document.getElementById('miniWidget');
        const expandedWidget = document.getElementById('expandedWidget');
        
        if (miniWidget) {
            miniWidget.addEventListener('mousedown', (e) => this.startDrag(e));
            miniWidget.addEventListener('touchstart', (e) => this.startDrag(e));
        }
        
        if (expandedWidget) {
            expandedWidget.addEventListener('mousedown', (e) => this.startDrag(e));
            expandedWidget.addEventListener('touchstart', (e) => this.startDrag(e));
        }
        
        // Window resize handling
        window.addEventListener('resize', () => this.handleResize());
    }

    startDrag(e) {
        e.preventDefault();
        this.isDragging = true;
        
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        const rect = widget.getBoundingClientRect();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        this.dragOffset.x = clientX - rect.left;
        this.dragOffset.y = clientY - rect.top;
        
        // Add dragging class
        widget.classList.add('dragging');
        
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.stopDrag());
        document.addEventListener('touchmove', (e) => this.onDrag(e));
        document.addEventListener('touchend', () => this.stopDrag());
    }

    onDrag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        const newX = clientX - this.dragOffset.x;
        const newY = clientY - this.dragOffset.y;
        
        // Apply boundary constraints
        const constraints = this.calculateBoundaryConstraints();
        const constrainedX = Math.max(constraints.minX, Math.min(newX, constraints.maxX));
        const constrainedY = Math.max(constraints.minY, Math.min(newY, constraints.maxY));
        
        // Update position
        this.updateWidgetPosition(constrainedX, constrainedY);
    }

    stopDrag() {
        this.isDragging = false;
        
        const widget = document.getElementById('floatingCallWidget');
        if (widget) {
            widget.classList.remove('dragging');
        }
        
        // Save new position
        this.savePosition();
        
        document.removeEventListener('mousemove', this.onDrag);
        document.removeEventListener('mouseup', this.stopDrag);
        document.removeEventListener('touchmove', this.onDrag);
        document.removeEventListener('touchend', this.stopDrag);
    }

    calculateBoundaryConstraints() {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        const widgetWidth = widget.offsetWidth;
        const widgetHeight = widget.offsetHeight;
        
        return {
            minX: 0,
            maxX: window.innerWidth - widgetWidth,
            minY: 0,
            maxY: window.innerHeight - widgetHeight
        };
    }

    updateWidgetPosition(x, y) {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        // Convert absolute positioning to fixed positioning
        widget.style.position = 'fixed';
        widget.style.left = x + 'px';
        widget.style.top = y + 'px';
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        
        // Update internal position tracking
        this.position.x = 'absolute';
        this.position.y = 'absolute';
        this.position.offsetX = x;
        this.position.offsetY = y;
    }

    // Theme Management
    loadTheme() {
        const savedTheme = localStorage.getItem('widgetTheme') || 'default';
        this.setTheme(savedTheme);
    }

    setTheme(themeName) {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        // Remove existing theme classes
        widget.classList.remove('widget-theme-default', 'widget-theme-dark', 'widget-theme-brand');
        
        // Add new theme class
        widget.classList.add(`widget-theme-${themeName}`);
        
        // Update current theme
        this.currentTheme = themeName;
        
        // Save theme preference
        localStorage.setItem('widgetTheme', themeName);
        
        // Apply theme-specific customizations
        this.applyThemeCustomizations(themeName);
    }

    applyThemeCustomizations(themeName) {
        // Apply theme-specific styles
        const root = document.documentElement;
        
        switch (themeName) {
            case 'dark':
                root.style.setProperty('--widget-accent', '#60a5fa');
                break;
            case 'brand':
                root.style.setProperty('--widget-accent', '#8b5cf6');
                break;
            default:
                root.style.setProperty('--widget-accent', '#3b82f6');
        }
    }

    // Size Management
    setSize(sizeName) {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        // Remove existing size classes
        widget.classList.remove('widget-size-compact', 'widget-size-standard', 'widget-size-large');
        
        // Add new size class
        widget.classList.add(`widget-size-${sizeName}`);
        
        // Update current size
        this.currentSize = sizeName;
        
        // Save size preference
        localStorage.setItem('widgetSize', sizeName);
        
        // Apply size-specific adjustments
        this.applySizeAdjustments(sizeName);
    }

    applySizeAdjustments(sizeName) {
        const expandedWidget = document.getElementById('expandedWidget');
        if (!expandedWidget) return;
        
        switch (sizeName) {
            case 'compact':
                expandedWidget.style.width = '280px';
                break;
            case 'standard':
                expandedWidget.style.width = '320px';
                break;
            case 'large':
                expandedWidget.style.width = '400px';
                break;
        }
    }

    // Touch Gestures
    setupTouchGestures() {
        const widget = document.getElementById('floatingCallWidget');
        if (!widget) return;
        
        let touchStartTime = 0;
        let touchStartY = 0;
        let touchStartX = 0;
        
        widget.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });
        
        widget.addEventListener('touchend', (e) => {
            const touchEndTime = Date.now();
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            const touchDuration = touchEndTime - touchStartTime;
            const touchDistanceY = Math.abs(touchEndY - touchStartY);
            const touchDistanceX = Math.abs(touchEndX - touchStartX);
            
            // Swipe up to expand, swipe down to minimize
            if (touchDuration < 300 && touchDistanceY > 50 && touchDistanceX < 100) {
                if (touchEndY < touchStartY) {
                    this.expandWidget();
                } else {
                    this.minimizeWidget();
                }
            }
        });
    }

    // Widget State Management
    expandWidget() {
        const miniWidget = document.getElementById('miniWidget');
        const expandedWidget = document.getElementById('expandedWidget');
        
        if (miniWidget && expandedWidget) {
            miniWidget.classList.add('hidden');
            expandedWidget.classList.remove('hidden');
            this.isExpanded = true;
            
            // Add expand animation
            expandedWidget.classList.add('widget-expand');
            setTimeout(() => {
                expandedWidget.classList.remove('widget-expand');
            }, 200);
        }
    }

    minimizeWidget() {
        const miniWidget = document.getElementById('miniWidget');
        const expandedWidget = document.getElementById('expandedWidget');
        
        if (miniWidget && expandedWidget) {
            expandedWidget.classList.add('hidden');
            miniWidget.classList.remove('hidden');
            this.isExpanded = false;
            
            // Add minimize animation
            miniWidget.classList.add('widget-minimize');
            setTimeout(() => {
                miniWidget.classList.remove('widget-minimize');
            }, 200);
        }
    }

    // Utility Methods
    handleResize() {
        // Recalculate optimal position on window resize
        const newPosition = this.calculateOptimalPosition();
        if (newPosition.x !== this.position.x || newPosition.y !== this.position.y) {
            this.position = newPosition;
            this.applyPosition();
        }
    }

    // Public API
    getCurrentTheme() {
        return this.currentTheme;
    }

    getCurrentSize() {
        return this.currentSize;
    }

    getPosition() {
        return { ...this.position };
    }

    // Reset to default position
    resetPosition() {
        this.position = this.calculateOptimalPosition();
        this.applyPosition();
        this.savePosition();
    }
}

// Initialize enhanced widget when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedWidget = new EnhancedWidget();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedWidget;
}
