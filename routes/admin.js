const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-secret-key');
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Admin login
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // For demo purposes, use hardcoded admin credentials
    // In production, this would check against a database
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign(
            { 
                id: 1, 
                username: 'admin', 
                role: 'admin',
                company: 'global'
            },
            process.env.JWT_SECRET || 'admin-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            admin: {
                id: 1,
                username: 'admin',
                role: 'admin'
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get dashboard statistics
router.get('/dashboard/stats', authenticateAdmin, (req, res) => {
    // Simulate database query
    const stats = {
        totalCompanies: 25,
        activeCompanies: 18,
        pendingCompanies: 7,
        activeWidgets: 15,
        totalUsers: 150,
        totalCalls: 1250,
        monthlyRevenue: 15000
    };
    
    res.json(stats);
});

// Get recent activity
router.get('/dashboard/activity', authenticateAdmin, (req, res) => {
    // Simulate database query
    const activities = [
        {
            id: 1,
            type: 'company_registered',
            company: 'TechCorp Inc.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            details: 'New company registration'
        },
        {
            id: 2,
            type: 'company_approved',
            company: 'StartupXYZ',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            details: 'Company approved by admin'
        },
        {
            id: 3,
            type: 'widget_customized',
            company: 'GlobalTech',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            details: 'Widget theme updated'
        }
    ];
    
    res.json(activities);
});

// Get all companies
router.get('/companies', authenticateAdmin, (req, res) => {
    const { status, search } = req.query;
    
    // Simulate database query
    let companies = [
        {
            id: 1,
            name: 'TechCorp Inc.',
            status: 'pending',
            registrationDate: '2025-08-30',
            email: 'admin@techcorp.com',
            website: 'https://techcorp.com',
            phone: '+1-555-0123',
            address: '123 Tech Street, Silicon Valley, CA',
            contactPerson: 'John Tech',
            plan: 'premium',
            createdAt: new Date('2025-08-30T10:00:00Z')
        },
        {
            id: 2,
            name: 'StartupXYZ',
            status: 'active',
            registrationDate: '2025-08-29',
            email: 'contact@startupxyz.com',
            website: 'https://startupxyz.com',
            phone: '+1-555-0456',
            address: '456 Startup Ave, Austin, TX',
            contactPerson: 'Sarah Startup',
            plan: 'basic',
            createdAt: new Date('2025-08-29T14:30:00Z')
        },
        {
            id: 3,
            name: 'GlobalTech Solutions',
            status: 'active',
            registrationDate: '2025-08-28',
            email: 'info@globaltech.com',
            website: 'https://globaltech.com',
            phone: '+1-555-0789',
            address: '789 Global Blvd, New York, NY',
            contactPerson: 'Mike Global',
            plan: 'enterprise',
            createdAt: new Date('2025-08-28T09:15:00Z')
        },
        {
            id: 4,
            name: 'OldCompany Ltd.',
            status: 'suspended',
            registrationDate: '2025-08-25',
            email: 'admin@oldcompany.com',
            website: 'https://oldcompany.com',
            phone: '+1-555-0321',
            address: '321 Old Lane, Chicago, IL',
            contactPerson: 'Bob Old',
            plan: 'basic',
            createdAt: new Date('2025-08-25T16:45:00Z')
        }
    ];
    
    // Apply filters
    if (status) {
        companies = companies.filter(company => company.status === status);
    }
    
    if (search) {
        const searchLower = search.toLowerCase();
        companies = companies.filter(company => 
            company.name.toLowerCase().includes(searchLower) ||
            company.email.toLowerCase().includes(searchLower) ||
            company.contactPerson.toLowerCase().includes(searchLower)
        );
    }
    
    res.json(companies);
});

// Get company by ID
router.get('/companies/:id', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    
    // Simulate database query
    const company = {
        id: companyId,
        name: 'TechCorp Inc.',
        status: 'pending',
        registrationDate: '2025-08-30',
        email: 'admin@techcorp.com',
        website: 'https://techcorp.com',
        phone: '+1-555-0123',
        address: '123 Tech Street, Silicon Valley, CA',
        contactPerson: 'John Tech',
        plan: 'premium',
        createdAt: new Date('2025-08-30T10:00:00Z'),
        documents: [
            { name: 'Business License', status: 'pending' },
            { name: 'Tax Certificate', status: 'approved' },
            { name: 'Insurance Policy', status: 'pending' }
        ],
        users: [
            { id: 1, name: 'John Tech', email: 'john@techcorp.com', role: 'admin' },
            { id: 2, name: 'Jane Tech', email: 'jane@techcorp.com', role: 'agent' }
        ]
    };
    
    res.json(company);
});

// Update company status
router.patch('/companies/:id/status', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    const { status, reason } = req.body;
    
    // Simulate database update
    console.log(`Company ${companyId} status updated to ${status}`);
    
    res.json({
        success: true,
        message: `Company status updated to ${status}`,
        companyId,
        status,
        reason
    });
});

// Delete company
router.delete('/companies/:id', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    
    // Simulate database deletion
    console.log(`Company ${companyId} deleted`);
    
    res.json({
        success: true,
        message: 'Company deleted successfully',
        companyId
    });
});

// Get widget settings for company
router.get('/companies/:id/widget', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    
    // Simulate database query
    const widgetSettings = {
        companyId,
        theme: 'default',
        size: 'standard',
        position: 'bottom-right',
        companyLogo: '',
        customColors: {
            primary: '#3b82f6',
            secondary: '#64748b',
            background: '#ffffff',
            text: '#1f2937'
        },
        features: {
            videoCalls: true,
            screenSharing: true,
            callRecording: false,
            analytics: true
        },
        lastUpdated: new Date()
    };
    
    res.json(widgetSettings);
});

// Update widget settings
router.put('/companies/:id/widget', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    const settings = req.body;
    
    // Simulate database update
    console.log(`Widget settings updated for company ${companyId}:`, settings);
    
    res.json({
        success: true,
        message: 'Widget settings updated successfully',
        companyId,
        settings
    });
});

// Generate embed code
router.post('/companies/:id/embed-code', authenticateAdmin, (req, res) => {
    const companyId = parseInt(req.params.id);
    const { theme, size, position, logo } = req.body;
    
    // Generate embed code
    const embedCode = `<!-- CallDocker Widget -->
<script>
(function() {
    window.callDockerConfig = {
        companyId: '${companyId}',
        theme: '${theme}',
        size: '${size}',
        position: '${position}',
        logo: '${logo || ''}'
    };
    
    var script = document.createElement('script');
    script.src = 'https://your-domain.com/widget.js';
    script.async = true;
    document.head.appendChild(script);
})();
</script>
<div id="callDockerWidget"></div>`;
    
    res.json({
        success: true,
        embedCode,
        companyId
    });
});

// Get system analytics
router.get('/analytics', authenticateAdmin, (req, res) => {
    const { period = 'month' } = req.query;
    
    // Simulate analytics data
    const analytics = {
        period,
        calls: {
            total: 1250,
            answered: 1180,
            missed: 70,
            averageDuration: '5m 30s'
        },
        companies: {
            total: 25,
            active: 18,
            new: 7
        },
        revenue: {
            total: 15000,
            monthly: 15000,
            growth: 12.5
        }
    };
    
    res.json(analytics);
});

// Get admin profile
router.get('/profile', authenticateAdmin, (req, res) => {
    const admin = req.admin;
    
    res.json({
        id: admin.id,
        username: admin.username,
        role: admin.role,
        lastLogin: new Date(),
        permissions: [
            'manage_companies',
            'approve_registrations',
            'customize_widgets',
            'view_analytics',
            'manage_users'
        ]
    });
});

// Update admin profile
router.put('/profile', authenticateAdmin, (req, res) => {
    const { username, email, currentPassword, newPassword } = req.body;
    
    // Simulate profile update
    console.log('Admin profile updated:', { username, email });
    
    res.json({
        success: true,
        message: 'Profile updated successfully'
    });
});

module.exports = router;
