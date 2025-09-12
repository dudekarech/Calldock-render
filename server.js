const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost');

// Create HTTP server for WebSocket integration
const server = http.createServer(app);

// Import database configuration
const databaseManager = require('./database/config');

// Import routes - commented out until routes are implemented
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const companyRoutes = require('./routes/companies');
// const callRoutes = require('./routes/calls');
// const ivrRoutes = require('./routes/ivr');
// const agentRoutes = require('./routes/agents');
// const analyticsRoutes = require('./routes/analytics');
// const webhookRoutes = require('./routes/webhooks');
// const settingsRoutes = require('./routes/settings');

// Import admin routes
const adminRoutes = require('./routes/admin');

// Import company registration routes
const companyRegistrationRoutes = require('./routes/company-registrations');

// Import authentication routes
const authRoutes = require('./routes/auth');

// Security middleware - simplified for frontend testing
        app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                    styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net"],
                    scriptSrcAttr: ["'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3000", "wss://*.onrender.com", "https://*.onrender.com", "https://calldocker.metered.live"],
                    mediaSrc: ["'self'", "blob:", "https:"],
                    fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
                },
            },
        }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Basic middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Serve static files
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve JavaScript files directly
app.use('/js', express.static(path.join(__dirname, 'frontend', 'js')));

// Serve CSS files directly
app.use('/css', express.static(path.join(__dirname, 'frontend', 'css')));

// Add logging for CSS requests
app.use('/css', (req, res, next) => {
    console.log(`📄 CSS Request: ${req.method} ${req.url}`);
    next();
});

// WebSocket Server Setup for Render compatibility
const WebSocketServer = require('./websocket-server');
let wsServer = null;

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes - commented out until routes are implemented
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/companies', companyRoutes);
// app.use('/api/calls', callRoutes);
// app.use('/api/ivr', ivrRoutes);
// app.use('/api/agents', agentRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/webhooks', webhookRoutes);
// app.use('/api/settings', settingsRoutes);

// Authentication API routes
app.use('/api/auth', authRoutes);

// Admin API routes
app.use('/api/admin', adminRoutes);

// Company registration API routes
app.use('/api/company-registrations', companyRegistrationRoutes);

// IVR API routes
const ivrRoutes = require('./routes/ivr');
app.use('/api/ivr', ivrRoutes);

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin-dashboard.html'));
});

app.get('/widget-test', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'widget-test.html'));
});

// Widget preview route
app.get('/widget-preview', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'widget-preview.html'));
});

// Widget JavaScript file
app.get('/widget.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'js', 'widget.js'));
});

app.get('/company-registration', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'company-registration.html'));
});

app.get('/agent', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'agent-dashboard.html'));
});

app.get('/ivr-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'ivr-dashboard.html'));
});

app.get('/ivr-experience', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'ivr-experience.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON payload' });
    }
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Validation error', details: err.message });
    }
    
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
    });
});

// Start server
async function startServer() {
    try {
        console.log('🚀 Starting CallDocker server...');
        
        // Initialize database connection
        console.log('🗄️ Connecting to database...');
        await databaseManager.connect();
        console.log('✅ Database connected successfully');
        
        // Initialize database schema if needed
        try {
            const tables = await databaseManager.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            `);
            
            if (tables.rows.length === 0) {
                console.log('🔧 Database schema not found, initializing...');
                const initDatabase = require('./scripts/init-database');
                await initDatabase();
                console.log('✅ Database schema initialized successfully');
            } else {
                console.log('✅ Database schema already exists');
            }
        } catch (error) {
            console.log('⚠️ Database schema check failed, attempting initialization...');
            try {
                const initDatabase = require('./scripts/init-database');
                await initDatabase();
                console.log('✅ Database schema initialized successfully');
            } catch (initError) {
                console.error('❌ Database schema initialization failed:', initError.message);
                // Continue anyway - the app might still work
            }
        }
        
        // Test database health
        const dbHealth = await databaseManager.healthCheck();
        console.log('📊 Database health:', dbHealth);
        
        // Initialize WebSocket server with the HTTP server
        wsServer = new WebSocketServer(server);
        
        server.listen(PORT, HOST, () => {
            console.log(`🚀 Server running on http://${HOST}:${PORT}`);
            console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
            console.log(`🔐 Admin dashboard: http://${HOST}:${PORT}/admin`);
            console.log(`📞 Agent dashboard: http://${HOST}:${PORT}/agent`);
            console.log(`🔌 WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🗄️ Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (wsServer) {
        wsServer.stop();
    }
    await databaseManager.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    if (wsServer) {
        wsServer.stop();
    }
    await databaseManager.close();
    process.exit(0);
});

startServer();
