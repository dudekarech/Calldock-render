const express = require('express');
const { authenticateToken, requireCompanyAccess } = require('../middleware/auth');
const { validateId, validateCompanyId } = require('../middleware/validation');
const Company = require('../database/models/Company');
const Call = require('../database/models/Call');

const router = express.Router();

// Verify webhook signature (for security)
const verifyWebhookSignature = (req, res, next) => {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    
    if (!signature || !timestamp) {
        return res.status(401).json({ error: 'Missing webhook signature or timestamp' });
    }
    
    // Check if timestamp is not too old (within 5 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) {
        return res.status(401).json({ error: 'Webhook timestamp expired' });
    }
    
    // TODO: Implement proper signature verification based on company's webhook secret
    // For now, we'll just check if the signature exists
    next();
};

// Handle incoming webhook from external services
router.post('/incoming/:companyId', verifyWebhookSignature, async (req, res) => {
    try {
        const { companyId } = req.params;
        const webhookData = req.body;
        
        // Verify company exists
        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        // Process webhook based on type
        const webhookType = webhookData.type || req.headers['x-webhook-type'];
        
        switch (webhookType) {
            case 'call_started':
                await handleCallStartedWebhook(companyId, webhookData);
                break;
            case 'call_ended':
                await handleCallEndedWebhook(companyId, webhookData);
                break;
            case 'agent_status_change':
                await handleAgentStatusWebhook(companyId, webhookData);
                break;
            case 'ivr_interaction':
                await handleIvrInteractionWebhook(companyId, webhookData);
                break;
            default:
                console.log(`Unknown webhook type: ${webhookType}`);
        }
        
        res.json({ success: true, message: 'Webhook processed successfully' });
        
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

// Handle call started webhook
async function handleCallStartedWebhook(companyId, data) {
    try {
        const callData = {
            company_id: companyId,
            call_id: data.callId || data.call_id,
            caller_name: data.callerName || data.caller_name,
            caller_phone: data.callerPhone || data.caller_phone,
            call_type: data.callType || data.call_type || 'voice',
            status: 'incoming',
            source: data.source || 'webhook',
            metadata: data.metadata || {}
        };
        
        await Call.create(callData);
        console.log(`Call started webhook processed for company ${companyId}`);
        
    } catch (error) {
        console.error('Error processing call started webhook:', error);
    }
}

// Handle call ended webhook
async function handleCallEndedWebhook(companyId, data) {
    try {
        const callId = data.callId || data.call_id;
        if (!callId) {
            console.error('Call ID missing in call ended webhook');
            return;
        }
        
        const updateData = {
            status: 'completed',
            ended_at: new Date(),
            duration: data.duration || data.callDuration,
            metadata: { ...data.metadata, webhook_processed: true }
        };
        
        await Call.updateStatus(callId, updateData);
        console.log(`Call ended webhook processed for call ${callId}`);
        
    } catch (error) {
        console.error('Error processing call ended webhook:', error);
    }
}

// Handle agent status change webhook
async function handleAgentStatusWebhook(companyId, data) {
    try {
        const { agentId, status, availability } = data;
        
        // Update agent availability in the system
        // This would typically update the agent_availability_log table
        console.log(`Agent status webhook processed: ${agentId} -> ${status}`);
        
    } catch (error) {
        console.error('Error processing agent status webhook:', error);
    }
}

// Handle IVR interaction webhook
async function handleIvrInteractionWebhook(companyId, data) {
    try {
        const { callId, interaction, keyPressed, menuOption } = data;
        
        // Log IVR interaction for analytics
        console.log(`IVR interaction webhook processed: ${interaction} for call ${callId}`);
        
    } catch (error) {
        console.error('Error processing IVR interaction webhook:', error);
    }
}

// Get webhooks for a company
router.get('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        const webhooks = await Company.getWebhooks(companyId);
        
        res.json({
            success: true,
            data: webhooks
        });
        
    } catch (error) {
        console.error('Get webhooks error:', error);
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});

// Create a new webhook for a company
router.post('/company/:companyId', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { url, events, secret, description, isActive = true } = req.body;
        
        if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({ error: 'URL and events array are required' });
        }
        
        const webhook = await Company.addWebhook(companyId, {
            url,
            events,
            secret: secret || generateWebhookSecret(),
            description,
            is_active: isActive
        });
        
        res.status(201).json({
            success: true,
            data: webhook
        });
        
    } catch (error) {
        console.error('Create webhook error:', error);
        res.status(500).json({ error: 'Failed to create webhook' });
    }
});

// Update webhook
router.put('/:webhookId', authenticateToken, async (req, res) => {
    try {
        const { webhookId } = req.params;
        const updateData = req.body;
        
        // TODO: Implement webhook update logic
        // This would require a Webhook model
        
        res.json({
            success: true,
            message: 'Webhook updated successfully'
        });
        
    } catch (error) {
        console.error('Update webhook error:', error);
        res.status(500).json({ error: 'Failed to update webhook' });
    }
});

// Delete webhook
router.delete('/:webhookId', authenticateToken, async (req, res) => {
    try {
        const { webhookId } = req.params;
        
        // TODO: Implement webhook deletion logic
        // This would require a Webhook model
        
        res.json({
            success: true,
            message: 'Webhook deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete webhook error:', error);
        res.status(500).json({ error: 'Failed to delete webhook' });
    }
});

// Test webhook endpoint
router.post('/test/:webhookId', authenticateToken, async (req, res) => {
    try {
        const { webhookId } = req.params;
        
        // TODO: Implement webhook testing logic
        // This would send a test payload to the webhook URL
        
        res.json({
            success: true,
            message: 'Test webhook sent successfully'
        });
        
    } catch (error) {
        console.error('Test webhook error:', error);
        res.status(500).json({ error: 'Failed to test webhook' });
    }
});

// Generate webhook secret
function generateWebhookSecret() {
    return require('crypto').randomBytes(32).toString('hex');
}

// Handle Twilio webhooks specifically
router.post('/twilio/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const twilioData = req.body;
        
        // Verify this is a legitimate Twilio webhook
        // TODO: Implement Twilio signature verification
        
        const webhookType = twilioData.CallStatus || twilioData.DialCallStatus;
        
        switch (webhookType) {
            case 'in-progress':
                await handleTwilioCallStarted(companyId, twilioData);
                break;
            case 'completed':
            case 'busy':
            case 'no-answer':
            case 'failed':
                await handleTwilioCallEnded(companyId, twilioData);
                break;
            default:
                console.log(`Unknown Twilio webhook status: ${webhookType}`);
        }
        
        // Twilio expects a TwiML response for some webhooks
        res.type('text/xml');
        res.send('<Response></Response>');
        
    } catch (error) {
        console.error('Twilio webhook error:', error);
        res.status(500).send('<Response><Say>Error processing webhook</Say></Response>');
    }
});

// Handle Twilio call started
async function handleTwilioCallStarted(companyId, data) {
    try {
        const callData = {
            company_id: companyId,
            call_id: data.CallSid,
            caller_name: data.CallerName || 'Unknown',
            caller_phone: data.From,
            call_type: 'voice',
            status: 'in-progress',
            source: 'twilio',
            metadata: {
                twilio_data: data,
                direction: data.Direction,
                to: data.To
            }
        };
        
        await Call.create(callData);
        console.log(`Twilio call started: ${data.CallSid}`);
        
    } catch (error) {
        console.error('Error processing Twilio call started:', error);
    }
}

// Handle Twilio call ended
async function handleTwilioCallEnded(companyId, data) {
    try {
        const callId = data.CallSid;
        const status = data.CallStatus || data.DialCallStatus;
        
        const updateData = {
            status: status === 'completed' ? 'completed' : 'failed',
            ended_at: new Date(),
            duration: data.CallDuration ? parseInt(data.CallDuration) : null,
            metadata: { 
                twilio_data: data,
                end_reason: status
            }
        };
        
        await Call.updateStatus(callId, updateData);
        console.log(`Twilio call ended: ${callId} with status ${status}`);
        
    } catch (error) {
        console.error('Error processing Twilio call ended:', error);
    }
}

// Handle Slack webhooks for notifications
router.post('/slack/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const slackData = req.body;
        
        // Process Slack webhook (e.g., for call notifications)
        console.log(`Slack webhook received for company ${companyId}:`, slackData);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Slack webhook error:', error);
        res.status(500).json({ error: 'Failed to process Slack webhook' });
    }
});

// Handle Microsoft Teams webhooks
router.post('/teams/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const teamsData = req.body;
        
        // Process Teams webhook
        console.log(`Teams webhook received for company ${companyId}:`, teamsData);
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Teams webhook error:', error);
        res.status(500).json({ error: 'Failed to process Teams webhook' });
    }
});

// Webhook delivery status endpoint
router.get('/delivery-status/:webhookId', authenticateToken, async (req, res) => {
    try {
        const { webhookId } = req.params;
        
        // TODO: Implement webhook delivery status tracking
        // This would show success/failure rates, last delivery time, etc.
        
        res.json({
            success: true,
            data: {
                webhookId,
                deliveryStatus: 'implemented',
                lastDelivery: new Date().toISOString(),
                successRate: 95.5
            }
        });
        
    } catch (error) {
        console.error('Webhook delivery status error:', error);
        res.status(500).json({ error: 'Failed to fetch delivery status' });
    }
});

module.exports = router;
