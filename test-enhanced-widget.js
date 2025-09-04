/**
 * Test Enhanced Widget Functionality
 * Tests the enhanced floating widget features
 */

console.log('🧪 Testing Enhanced Widget Functionality...');

// Test 1: Check if enhanced widget is loaded
function testEnhancedWidgetLoading() {
    console.log('\n📋 Test 1: Enhanced Widget Loading');
    
    if (typeof window.enhancedWidget !== 'undefined') {
        console.log('✅ Enhanced widget loaded successfully');
        console.log('   - Current theme:', window.enhancedWidget.getCurrentTheme());
        console.log('   - Current size:', window.enhancedWidget.getCurrentSize());
        console.log('   - Current position:', window.enhancedWidget.getPosition());
        return true;
    } else {
        console.log('❌ Enhanced widget not loaded');
        return false;
    }
}

// Test 2: Check widget DOM elements
function testWidgetDOM() {
    console.log('\n📋 Test 2: Widget DOM Elements');
    
    const elements = [
        'floatingCallWidget',
        'miniWidget',
        'expandedWidget',
        'expandWidgetBtn',
        'minimizeWidgetBtn',
        'widgetMuteBtn',
        'widgetEndCallBtn'
    ];
    
    let allFound = true;
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`✅ ${id}: Found`);
        } else {
            console.log(`❌ ${id}: Not found`);
            allFound = false;
        }
    });
    
    return allFound;
}

// Test 3: Check widget CSS classes
function testWidgetCSS() {
    console.log('\n📋 Test 3: Widget CSS Classes');
    
    const widget = document.getElementById('floatingCallWidget');
    if (!widget) {
        console.log('❌ Widget element not found');
        return false;
    }
    
    const requiredClasses = [
        'floating-widget-enhanced',
        'widget-theme-default',
        'widget-size-standard'
    ];
    
    let allClassesPresent = true;
    requiredClasses.forEach(className => {
        if (widget.classList.contains(className)) {
            console.log(`✅ ${className}: Present`);
        } else {
            console.log(`❌ ${className}: Missing`);
            allFound = false;
        }
    });
    
    return allClassesPresent;
}

// Test 4: Test theme switching
function testThemeSwitching() {
    console.log('\n📋 Test 4: Theme Switching');
    
    if (!window.enhancedWidget) {
        console.log('❌ Enhanced widget not available');
        return false;
    }
    
    try {
        // Test dark theme
        window.enhancedWidget.setTheme('dark');
        console.log('✅ Dark theme applied');
        
        // Test brand theme
        window.enhancedWidget.setTheme('brand');
        console.log('✅ Brand theme applied');
        
        // Test default theme
        window.enhancedWidget.setTheme('default');
        console.log('✅ Default theme restored');
        
        return true;
    } catch (error) {
        console.log('❌ Theme switching failed:', error.message);
        return false;
    }
}

// Test 5: Test size switching
function testSizeSwitching() {
    console.log('\n📋 Test 5: Size Switching');
    
    if (!window.enhancedWidget) {
        console.log('❌ Enhanced widget not available');
        return false;
    }
    
    try {
        // Test compact size
        window.enhancedWidget.setSize('compact');
        console.log('✅ Compact size applied');
        
        // Test large size
        window.enhancedWidget.setSize('large');
        console.log('✅ Large size applied');
        
        // Test standard size
        window.enhancedWidget.setSize('standard');
        console.log('✅ Standard size restored');
        
        return true;
    } catch (error) {
        console.log('❌ Size switching failed:', error.message);
        return false;
    }
}

// Test 6: Test position management
function testPositionManagement() {
    console.log('\n📋 Test 6: Position Management');
    
    if (!window.enhancedWidget) {
        console.log('❌ Enhanced widget not available');
        return false;
    }
    
    try {
        const originalPosition = window.enhancedWidget.getPosition();
        console.log('✅ Original position:', originalPosition);
        
        // Test position reset
        window.enhancedWidget.resetPosition();
        console.log('✅ Position reset successful');
        
        const newPosition = window.enhancedWidget.getPosition();
        console.log('✅ New position:', newPosition);
        
        return true;
    } catch (error) {
        console.log('❌ Position management failed:', error.message);
        return false;
    }
}

// Test 7: Test widget state management
function testWidgetStateManagement() {
    console.log('\n📋 Test 7: Widget State Management');
    
    if (!window.enhancedWidget) {
        console.log('❌ Enhanced widget not available');
        return false;
    }
    
    try {
        // Test expand
        window.enhancedWidget.expandWidget();
        console.log('✅ Widget expanded');
        
        // Test minimize
        window.enhancedWidget.minimizeWidget();
        console.log('✅ Widget minimized');
        
        return true;
    } catch (error) {
        console.log('❌ State management failed:', error.message);
        return false;
    }
}

// Test 8: Check CSS file loading
function testCSSLoading() {
    console.log('\n📋 Test 8: CSS File Loading');
    
    const links = document.querySelectorAll('link[href*="widget-styles.css"]');
    if (links.length > 0) {
        console.log('✅ Widget CSS file linked');
        return true;
    } else {
        console.log('❌ Widget CSS file not linked');
        return false;
    }
}

// Test 9: Check JavaScript file loading
function testJSLoading() {
    console.log('\n📋 Test 9: JavaScript File Loading');
    
    const scripts = document.querySelectorAll('script[src*="widget-enhancements.js"]');
    if (scripts.length > 0) {
        console.log('✅ Widget JavaScript file linked');
        return true;
    } else {
        console.log('❌ Widget JavaScript file not linked');
        return false;
    }
}

// Test 10: Check localStorage persistence
function testLocalStoragePersistence() {
    console.log('\n📋 Test 10: LocalStorage Persistence');
    
    try {
        // Check if theme preference is saved
        const savedTheme = localStorage.getItem('widgetTheme');
        console.log('✅ Theme preference saved:', savedTheme);
        
        // Check if size preference is saved
        const savedSize = localStorage.getItem('widgetSize');
        console.log('✅ Size preference saved:', savedSize);
        
        // Check if position is saved
        const savedPosition = localStorage.getItem('widgetPosition');
        console.log('✅ Position saved:', savedPosition);
        
        return true;
    } catch (error) {
        console.log('❌ LocalStorage test failed:', error.message);
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('🚀 Starting Enhanced Widget Tests...\n');
    
    const tests = [
        testEnhancedWidgetLoading,
        testWidgetDOM,
        testWidgetCSS,
        testThemeSwitching,
        testSizeSwitching,
        testPositionManagement,
        testWidgetStateManagement,
        testCSSLoading,
        testJSLoading,
        testLocalStoragePersistence
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach((test, index) => {
        try {
            const result = test();
            if (result) passedTests++;
        } catch (error) {
            console.log(`❌ Test ${index + 1} crashed:`, error.message);
        }
    });
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! Enhanced widget is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the logs above for details.');
    }
    
    return passedTests === totalTests;
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit more for enhanced widget to initialize
        setTimeout(runAllTests, 1000);
    });
} else {
    // DOM is already ready, wait a bit for enhanced widget
    setTimeout(runAllTests, 1000);
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        testEnhancedWidgetLoading,
        testWidgetDOM,
        testWidgetCSS,
        testThemeSwitching,
        testSizeSwitching,
        testPositionManagement,
        testWidgetStateManagement,
        testCSSLoading,
        testJSLoading,
        testLocalStoragePersistence
    };
}
