const express = require('express');
const { authenticateToken, requireCompanyAccess } = require('../middleware/auth');
const { validateId, validateCompanyId, validatePagination, validateDateRange, validateSearch } = require('../middleware/validation');
const Call = require('../database/models/Call');
const User = require('../database/models/User');
const Company = require('../database/models/Company');

const router = express.Router();

// Get analytics overview for a company
router.get('/company/:companyId/overview', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;
        
        const overview = await Call.getStats(companyId, startDate, endDate);
        const agentStats = await User.getStats(companyId, startDate, endDate);
        const companyStats = await Company.getStats(companyId, startDate, endDate);
        
        res.json({
            success: true,
            data: {
                calls: overview,
                agents: agentStats,
                company: companyStats
            }
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
});

// Get call analytics by date range
router.get('/company/:companyId/calls', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, validatePagination, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const calls = await Call.getByDateRange(companyId, startDate, endDate, page, limit);
        
        res.json({
            success: true,
            data: calls
        });
    } catch (error) {
        console.error('Call analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch call analytics' });
    }
});

// Get agent performance analytics
router.get('/company/:companyId/agents/performance', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, validatePagination, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const agents = await User.findByRole('agent', companyId, page, limit);
        const performanceData = [];
        
        for (const agent of agents.rows) {
            const stats = await Call.getAgentHistory(agent.id, startDate, endDate);
            const performance = await User.getStats(agent.id, startDate, endDate);
            
            performanceData.push({
                agent,
                callStats: stats,
                performance
            });
        }
        
        res.json({
            success: true,
            data: performanceData,
            pagination: agents.pagination
        });
    } catch (error) {
        console.error('Agent performance analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch agent performance analytics' });
    }
});

// Get IVR flow analytics
router.get('/company/:companyId/ivr', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;
        
        const IvrFlow = require('../database/models/IvrFlow');
        const flows = await IvrFlow.findByCompany(companyId);
        const flowStats = [];
        
        for (const flow of flows) {
            const stats = await IvrFlow.getUsageStats(flow.id, startDate, endDate);
            flowStats.push({
                flow,
                stats
            });
        }
        
        res.json({
            success: true,
            data: flowStats
        });
    } catch (error) {
        console.error('IVR analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch IVR analytics' });
    }
});

// Get queue analytics
router.get('/company/:companyId/queue', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;
        
        const queueStats = await Call.getQueueStatus(companyId, startDate, endDate);
        
        res.json({
            success: true,
            data: queueStats
        });
    } catch (error) {
        console.error('Queue analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch queue analytics' });
    }
});

// Get real-time dashboard data
router.get('/company/:companyId/dashboard/realtime', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const dashboardData = await Company.getDashboardData(companyId);
        
        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Real-time dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch real-time dashboard data' });
    }
});

// Get system health metrics
router.get('/system/health', authenticateToken, async (req, res) => {
    try {
        const { query } = require('../database/config');
        
        // Check database connection
        const dbHealth = await query('SELECT NOW() as timestamp, version() as version');
        
        // Get system stats
        const stats = await query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM companies) as total_companies,
                (SELECT COUNT(*) FROM calls WHERE created_at >= NOW() - INTERVAL '24 hours') as calls_24h,
                (SELECT COUNT(*) FROM calls WHERE status = 'active') as active_calls
        `);
        
        res.json({
            success: true,
            data: {
                database: {
                    status: 'healthy',
                    timestamp: dbHealth.rows[0].timestamp,
                    version: dbHealth.rows[0].version
                },
                system: stats.rows[0]
            }
        });
    } catch (error) {
        console.error('System health check error:', error);
        res.status(500).json({ 
            success: false,
            error: 'System health check failed',
            details: error.message
        });
    }
});

// Get custom analytics report
router.post('/company/:companyId/reports/custom', authenticateToken, requireCompanyAccess, validateCompanyId, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { metrics, filters, groupBy, sortBy, startDate, endDate } = req.body;
        
        // Validate required fields
        if (!metrics || !Array.isArray(metrics)) {
            return res.status(400).json({ error: 'Metrics array is required' });
        }
        
        // Build dynamic query based on requested metrics
        let query = 'SELECT ';
        const selectFields = [];
        const whereConditions = ['company_id = $1'];
        const queryParams = [companyId];
        let paramIndex = 2;
        
        if (startDate) {
            whereConditions.push(`created_at >= $${paramIndex++}`);
            queryParams.push(startDate);
        }
        
        if (endDate) {
            whereConditions.push(`created_at <= $${paramIndex++}`);
            queryParams.push(endDate);
        }
        
        // Add requested metrics
        metrics.forEach(metric => {
            switch (metric) {
                case 'total_calls':
                    selectFields.push('COUNT(*) as total_calls');
                    break;
                case 'avg_duration':
                    selectFields.push('AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_duration_seconds');
                    break;
                case 'success_rate':
                    selectFields.push('COUNT(CASE WHEN status = \'completed\' THEN 1 END) * 100.0 / COUNT(*) as success_rate');
                    break;
                case 'queue_time':
                    selectFields.push('AVG(EXTRACT(EPOCH FROM (assigned_at - created_at))) as avg_queue_time_seconds');
                    break;
                default:
                    // Skip unknown metrics
                    break;
            }
        });
        
        if (selectFields.length === 0) {
            return res.status(400).json({ error: 'No valid metrics specified' });
        }
        
        query += selectFields.join(', ') + ' FROM calls WHERE ' + whereConditions.join(' AND ');
        
        if (groupBy) {
            query += ` GROUP BY ${groupBy}`;
        }
        
        if (sortBy) {
            query += ` ORDER BY ${sortBy}`;
        }
        
        const { query: dbQuery } = require('../database/config');
        const result = await dbQuery(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            query: query,
            params: queryParams
        });
        
    } catch (error) {
        console.error('Custom analytics report error:', error);
        res.status(500).json({ error: 'Failed to generate custom analytics report' });
    }
});

// Export analytics data
router.get('/company/:companyId/export', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate, format = 'json' } = req.query;
        
        if (format !== 'json' && format !== 'csv') {
            return res.status(400).json({ error: 'Only JSON and CSV formats are supported' });
        }
        
        const calls = await Call.getByDateRange(companyId, startDate, endDate, 1, 10000); // Get all calls
        
        if (format === 'csv') {
            // Convert to CSV format
            const csvHeaders = ['Call ID', 'Caller Name', 'Caller Phone', 'Status', 'Created At', 'Started At', 'Ended At', 'Duration', 'Agent'];
            const csvRows = calls.rows.map(call => [
                call.call_id,
                call.caller_name,
                call.caller_phone,
                call.status,
                call.created_at,
                call.started_at,
                call.ended_at,
                call.duration,
                call.agent_name || 'Unassigned'
            ]);
            
            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${field || ''}"`).join(','))
                .join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="calls_${startDate}_${endDate}.csv"`);
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data: calls.rows,
                exportInfo: {
                    companyId,
                    startDate,
                    endDate,
                    totalRecords: calls.rows.length,
                    exportedAt: new Date().toISOString()
                }
            });
        }
        
    } catch (error) {
        console.error('Analytics export error:', error);
        res.status(500).json({ error: 'Failed to export analytics data' });
    }
});

// Get analytics insights and recommendations
router.get('/company/:companyId/insights', authenticateToken, requireCompanyAccess, validateCompanyId, validateDateRange, async (req, res) => {
    try {
        const { companyId } = req.params;
        const { startDate, endDate } = req.query;
        
        const overview = await Call.getStats(companyId, startDate, endDate);
        const agentStats = await User.getStats(companyId, startDate, endDate);
        
        const insights = [];
        
        // Analyze call volume patterns
        if (overview.totalCalls > 0) {
            const avgCallsPerDay = overview.totalCalls / Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)));
            
            if (avgCallsPerDay > 100) {
                insights.push({
                    type: 'high_volume',
                    title: 'High Call Volume',
                    message: `Average of ${Math.round(avgCallsPerDay)} calls per day detected. Consider adding more agents or implementing call routing optimization.`,
                    priority: 'high'
                });
            }
        }
        
        // Analyze response times
        if (overview.avgQueueTime > 300) { // 5 minutes
            insights.push({
                type: 'slow_response',
                title: 'Slow Response Times',
                message: `Average queue time is ${Math.round(overview.avgQueueTime / 60)} minutes. Consider improving agent availability or call routing.`,
                priority: 'medium'
            });
        }
        
        // Analyze agent performance
        if (agentStats.length > 0) {
            const topAgent = agentStats.reduce((prev, current) => 
                (prev.totalCalls > current.totalCalls) ? prev : current
            );
            
            const bottomAgent = agentStats.reduce((prev, current) => 
                (prev.totalCalls < current.totalCalls) ? prev : current
            );
            
            if (topAgent.totalCalls > bottomAgent.totalCalls * 2) {
                insights.push({
                    type: 'performance_gap',
                    title: 'Agent Performance Gap',
                    message: `Performance gap detected between agents. Top agent: ${topAgent.totalCalls} calls, Bottom agent: ${bottomAgent.totalCalls} calls. Consider training or workload balancing.`,
                    priority: 'medium'
                });
            }
        }
        
        // Analyze call success rates
        if (overview.successRate < 80) {
            insights.push({
                type: 'low_success',
                title: 'Low Call Success Rate',
                message: `Call success rate is ${overview.successRate}%. Investigate call failures and improve agent training or call routing.`,
                priority: 'high'
            });
        }
        
        res.json({
            success: true,
            data: {
                insights,
                summary: {
                    totalInsights: insights.length,
                    highPriority: insights.filter(i => i.priority === 'high').length,
                    mediumPriority: insights.filter(i => i.priority === 'medium').length,
                    lowPriority: insights.filter(i => i.priority === 'low').length
                }
            }
        });
        
    } catch (error) {
        console.error('Analytics insights error:', error);
        res.status(500).json({ error: 'Failed to generate analytics insights' });
    }
});

module.exports = router;
