const express = require('express');
const { authenticateToken, requireAdmin, requireCompanyAccess } = require('../middleware/auth');
const { validateId, validateCompanyId } = require('../middleware/validation');
const Company = require('../database/models/Company');
const User = require('../database/models/User');

const router = express.Router();

// Get system-wide settings (admin only)
router.get('/system', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const systemSettings = {
            // General system settings
            general: {
                systemName: process.env.SYSTEM_NAME || 'CallDocker',
                version: process.env.VERSION || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
                maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
                enableEmailVerification: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
                enablePhoneVerification: process.env.ENABLE_PHONE_VERIFICATION === 'true',
                enableCallRecording: process.env.ENABLE_CALL_RECORDING === 'true',
                enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
                enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true'
            },
            
            // Security settings
            security: {
                jwtSecret: process.env.JWT_SECRET ? '***configured***' : 'not configured',
                jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
                jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
                sessionSecret: process.env.SESSION_SECRET ? '***configured***' : 'not configured',
                rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
                rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
                enableCors: process.env.CORS_ORIGIN ? true : false,
                corsOrigin: process.env.CORS_ORIGIN || '*'
            },
            
            // Database settings
            database: {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                name: process.env.DB_NAME || 'calldocker',
                user: process.env.DB_USER || 'postgres',
                maxConnections: process.env.DB_MAX_CONNECTIONS || 20,
                idleTimeout: process.env.DB_IDLE_TIMEOUT || 30000
            },
            
            // Email settings
            email: {
                smtpHost: process.env.SMTP_HOST || 'not configured',
                smtpPort: process.env.SMTP_PORT || 587,
                smtpUser: process.env.SMTP_USER || 'not configured',
                smtpFrom: process.env.SMTP_FROM || 'not configured',
                enableEmail: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
            },
            
            // File storage settings
            storage: {
                uploadPath: process.env.UPLOAD_PATH || './uploads',
                maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
                allowedFileTypes: process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx',
                enableS3: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_S3_BUCKET),
                s3Bucket: process.env.AWS_S3_BUCKET || 'not configured',
                s3Region: process.env.AWS_REGION || 'not configured'
            },
            
            // WebRTC settings
            webrtc: {
                stunServer: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302',
                turnServer: process.env.TURN_SERVER || 'not configured',
                turnUsername: process.env.TURN_USERNAME || 'not configured',
                turnCredential: process.env.TURN_CREDENTIAL ? '***configured***' : 'not configured'
            },
            
            // Third-party integrations
            integrations: {
                twilio: {
                    enabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
                    accountSid: process.env.TWILIO_ACCOUNT_SID ? '***configured***' : 'not configured',
                    phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'not configured'
                },
                redis: {
                    enabled: !!(process.env.REDIS_HOST && process.env.REDIS_PORT),
                    host: process.env.REDIS_HOST || 'not configured',
                    port: process.env.REDIS_PORT || 6379
                }
            }
        };
        
        res.json({
            success: true,
            data: systemSettings
        });
        
    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ error: 'Failed to fetch system settings' });
    }
});

// Update system settings (admin only)
router.put('/system', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }
        
        // TODO: Implement system settings update logic
        // This would typically involve updating environment variables or a config file
        
        console.log('System settings update requested:', settings);
        
        res.json({
            success: true,
            message: 'System settings updated successfully',
            note: 'Some settings may require server restart to take effect'
        });
        
    } catch (error) {
        console.error('Update system settings error:', error);
        res.status(500).json({ error: 'Failed to update system settings' });
    }
});

// Get company settings
router.get('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const settings = await Company.getSettings(companyId);
        
        res.json({
            success: true,
            data: settings
        });
        
    } catch (error) {
        console.error('Get company settings error:', error);
        res.status(500).json({ error: 'Failed to fetch company settings' });
    }
});

// Update company settings
router.put('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { settings } = req.body;
        
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'Settings object is required' });
        }
        
        await Company.updateSettings(companyId, settings);
        
        res.json({
            success: true,
            message: 'Company settings updated successfully'
        });
        
    } catch (error) {
        console.error('Update company settings error:', error);
        res.status(500).json({ error: 'Failed to update company settings' });
    }
});

// Get user preferences
router.get('/user/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user preferences from database
        const user = await User.findById(userId);
        
        const preferences = {
            notifications: {
                email: user.email_notifications !== false,
                push: user.push_notifications !== false,
                sms: user.sms_notifications !== false,
                callAlerts: user.call_alerts !== false,
                systemUpdates: user.system_updates !== false
            },
            interface: {
                theme: user.theme || 'light',
                language: user.language || 'en',
                timezone: user.timezone || 'UTC',
                dateFormat: user.date_format || 'MM/DD/YYYY',
                timeFormat: user.time_format || '12h'
            },
            calls: {
                autoAnswer: user.auto_answer !== false,
                callRecording: user.call_recording !== false,
                screenSharing: user.screen_sharing !== false,
                videoEnabled: user.video_enabled !== false,
                holdMusic: user.hold_music !== false
            },
            privacy: {
                showOnlineStatus: user.show_online_status !== false,
                showCallHistory: user.show_call_history !== false,
                allowCallbacks: user.allow_callbacks !== false,
                dataRetention: user.data_retention_days || 90
            }
        };
        
        res.json({
            success: true,
            data: preferences
        });
        
    } catch (error) {
        console.error('Get user preferences error:', error);
        res.status(500).json({ error: 'Failed to fetch user preferences' });
    }
});

// Update user preferences
router.put('/user/preferences', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { preferences } = req.body;
        
        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({ error: 'Preferences object is required' });
        }
        
        // Build update object from preferences
        const updateData = {};
        
        if (preferences.notifications) {
            updateData.email_notifications = preferences.notifications.email;
            updateData.push_notifications = preferences.notifications.push;
            updateData.sms_notifications = preferences.notifications.sms;
            updateData.call_alerts = preferences.notifications.callAlerts;
            updateData.system_updates = preferences.notifications.systemUpdates;
        }
        
        if (preferences.interface) {
            updateData.theme = preferences.interface.theme;
            updateData.language = preferences.interface.language;
            updateData.timezone = preferences.interface.timezone;
            updateData.date_format = preferences.interface.dateFormat;
            updateData.time_format = preferences.interface.timeFormat;
        }
        
        if (preferences.calls) {
            updateData.auto_answer = preferences.calls.autoAnswer;
            updateData.call_recording = preferences.calls.callRecording;
            updateData.screen_sharing = preferences.calls.screenSharing;
            updateData.video_enabled = preferences.calls.videoEnabled;
            updateData.hold_music = preferences.calls.holdMusic;
        }
        
        if (preferences.privacy) {
            updateData.show_online_status = preferences.privacy.showOnlineStatus;
            updateData.show_call_history = preferences.privacy.showCallHistory;
            updateData.allow_callbacks = preferences.privacy.allowCallbacks;
            updateData.data_retention_days = preferences.privacy.dataRetention;
        }
        
        await User.update(userId, updateData);
        
        res.json({
            success: true,
            message: 'User preferences updated successfully'
        });
        
    } catch (error) {
        console.error('Update user preferences error:', error);
        res.status(500).json({ error: 'Failed to update user preferences' });
    }
});

// Get available themes
router.get('/themes', async (req, res) => {
    try {
        const themes = [
            { id: 'light', name: 'Light Theme', description: 'Clean and bright interface' },
            { id: 'dark', name: 'Dark Theme', description: 'Easy on the eyes in low light' },
            { id: 'blue', name: 'Blue Theme', description: 'Professional blue color scheme' },
            { id: 'green', name: 'Green Theme', description: 'Calming green color scheme' },
            { id: 'auto', name: 'Auto Theme', description: 'Follows system preference' }
        ];
        
        res.json({
            success: true,
            data: themes
        });
        
    } catch (error) {
        console.error('Get themes error:', error);
        res.status(500).json({ error: 'Failed to fetch themes' });
    }
});

// Get available languages
router.get('/languages', async (req, res) => {
    try {
        const languages = [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'es', name: 'Spanish', nativeName: 'Español' },
            { code: 'fr', name: 'French', nativeName: 'Français' },
            { code: 'de', name: 'German', nativeName: 'Deutsch' },
            { code: 'it', name: 'Italian', nativeName: 'Italiano' },
            { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
            { code: 'ru', name: 'Russian', nativeName: 'Русский' },
            { code: 'zh', name: 'Chinese', nativeName: '中文' },
            { code: 'ja', name: 'Japanese', nativeName: '日本語' },
            { code: 'ko', name: 'Korean', nativeName: '한국어' }
        ];
        
        res.json({
            success: true,
            data: languages
        });
        
    } catch (error) {
        console.error('Get languages error:', error);
        res.status(500).json({ error: 'Failed to fetch languages' });
    }
});

// Get available timezones
router.get('/timezones', async (req, res) => {
    try {
        const timezones = [
            { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'Europe/London', label: 'London (GMT/BST)' },
            { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
            { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
            { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
            { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
            { value: 'Asia/Kolkata', label: 'Mumbai (IST)' },
            { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' }
        ];
        
        res.json({
            success: true,
            data: timezones
        });
        
    } catch (error) {
        console.error('Get timezones error:', error);
        res.status(500).json({ error: 'Failed to fetch timezones' });
    }
});

// Get system health and status
router.get('/system/status', authenticateToken, async (req, res) => {
    try {
        const { query } = require('../database/config');
        
        // Check database connection
        const dbStatus = await query('SELECT NOW() as timestamp, version() as version');
        
        // Check system resources
        const systemInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            pid: process.pid
        };
        
        // Check environment
        const environment = {
            nodeEnv: process.env.NODE_ENV || 'development',
            port: process.env.PORT || 3000,
            host: process.env.HOST || 'localhost'
        };
        
        res.json({
            success: true,
            data: {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: {
                    status: 'connected',
                    timestamp: dbStatus.rows[0].timestamp,
                    version: dbStatus.rows[0].version
                },
                system: systemInfo,
                environment
            }
        });
        
    } catch (error) {
        console.error('System status check error:', error);
        res.status(500).json({ 
            success: false,
            error: 'System status check failed',
            details: error.message
        });
    }
});

// Reset user preferences to default
router.post('/user/preferences/reset', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const defaultPreferences = {
            email_notifications: true,
            push_notifications: true,
            sms_notifications: false,
            call_alerts: true,
            system_updates: true,
            theme: 'light',
            language: 'en',
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            time_format: '12h',
            auto_answer: false,
            call_recording: true,
            screen_sharing: true,
            video_enabled: true,
            hold_music: true,
            show_online_status: true,
            show_call_history: true,
            allow_callbacks: true,
            data_retention_days: 90
        };
        
        await User.update(userId, defaultPreferences);
        
        res.json({
            success: true,
            message: 'User preferences reset to default values'
        });
        
    } catch (error) {
        console.error('Reset user preferences error:', error);
        res.status(500).json({ error: 'Failed to reset user preferences' });
    }
});

// Export user settings
router.get('/user/export', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        
        const exportData = {
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                created_at: user.created_at,
                updated_at: user.updated_at
            },
            preferences: {
                notifications: {
                    email: user.email_notifications,
                    push: user.push_notifications,
                    sms: user.sms_notifications,
                    callAlerts: user.call_alerts,
                    systemUpdates: user.system_updates
                },
                interface: {
                    theme: user.theme,
                    language: user.language,
                    timezone: user.timezone,
                    dateFormat: user.date_format,
                    timeFormat: user.time_format
                },
                calls: {
                    autoAnswer: user.auto_answer,
                    callRecording: user.call_recording,
                    screenSharing: user.screen_sharing,
                    videoEnabled: user.video_enabled,
                    holdMusic: user.hold_music
                },
                privacy: {
                    showOnlineStatus: user.show_online_status,
                    showCallHistory: user.show_call_history,
                    allowCallbacks: user.allow_callbacks,
                    dataRetention: user.data_retention_days
                }
            },
            exportInfo: {
                exportedAt: new Date().toISOString(),
                format: 'json'
            }
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="user_settings_${userId}.json"`);
        res.json(exportData);
        
    } catch (error) {
        console.error('Export user settings error:', error);
        res.status(500).json({ error: 'Failed to export user settings' });
    }
});

module.exports = router;
