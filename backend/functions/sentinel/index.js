const AWS = require('aws-sdk');
const axios = require('axios');
const winston = require('winston');

// AWS Clients
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

// Configuration
const VULTR_API_KEY = process.env.VULTR_API_KEY;
const VULTR_API_BASE = 'https://api.vultr.com/v2';
const DYNAMODB_INSTANCES_TABLE = process.env.DYNAMODB_TABLE_INSTANCES || 'CloudPulseInstances';
const DYNAMODB_METRICS_TABLE = process.env.DYNAMODB_TABLE_METRICS || 'CloudPulseMetrics';
const DYNAMODB_ALERTS_TABLE = process.env.DYNAMODB_TABLE_ALERTS || 'CloudPulseAlerts';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const HEALTH_CHECK_TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10);

// Logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ]
});

/**
 * Sentinel Lambda Handler
 *
 * Performs comprehensive health monitoring:
 * 1. Fetches instance data from Vultr API
 * 2. Performs active health checks on endpoints
 * 3. Updates instance status in DynamoDB
 * 4. Generates alerts for unhealthy instances
 * 5. Sends critical notifications via SNS
 */
exports.handler = async (event) => {
    logger.info('Sentinel function started', { event });

    try {
        // Step 1: Get all monitored instances from DynamoDB
        const instances = await getMonitoredInstances();
        logger.info(`Found ${instances.length} instances to monitor`);

        if (instances.length === 0) {
            logger.warn('No instances to monitor');
            return { statusCode: 200, message: 'No instances to monitor' };
        }

        // Step 2: Fetch Vultr instance data (if applicable)
        const vultrInstances = await fetchVultrInstances();
        logger.info(`Fetched ${vultrInstances.length} Vultr instances`);

        // Step 3: Perform health checks on all instances
        const healthCheckResults = await Promise.allSettled(
            instances.map(instance => performHealthCheck(instance, vultrInstances))
        );

        // Step 4: Process results and generate alerts
        const results = {
            total: instances.length,
            healthy: 0,
            unhealthy: 0,
            degraded: 0,
            errors: 0,
            alertsGenerated: 0
        };

        for (let i = 0; i < healthCheckResults.length; i++) {
            const result = healthCheckResults[i];

            if (result.status === 'fulfilled') {
                const { status, alertGenerated } = result.value;

                if (status === 'healthy') results.healthy++;
                else if (status === 'unhealthy') results.unhealthy++;
                else if (status === 'degraded') results.degraded++;

                if (alertGenerated) results.alertsGenerated++;
            } else {
                logger.error('Health check failed', { error: result.reason });
                results.errors++;
            }
        }

        logger.info('Sentinel function completed', { results });

        return {
            statusCode: 200,
            body: JSON.stringify(results)
        };

    } catch (error) {
        logger.error('Sentinel function error', { error: error.message, stack: error.stack });

        // Send critical error notification
        if (SNS_TOPIC_ARN) {
            await sendSNSNotification(
                'Sentinel Function Error',
                `Critical error in Sentinel monitoring: ${error.message}`,
                'critical'
            );
        }

        throw error;
    }
};

/**
 * Get all monitored instances from DynamoDB
 */
async function getMonitoredInstances() {
    try {
        const result = await dynamodb.scan({
            TableName: DYNAMODB_INSTANCES_TABLE
        }).promise();

        return result.Items || [];
    } catch (error) {
        logger.error('Failed to fetch instances from DynamoDB', { error: error.message });
        return [];
    }
}

/**
 * Fetch instance data from Vultr API
 */
async function fetchVultrInstances() {
    if (!VULTR_API_KEY) {
        logger.warn('VULTR_API_KEY not configured, skipping Vultr API fetch');
        return [];
    }

    try {
        const response = await axios.get(`${VULTR_API_BASE}/instances`, {
            headers: {
                'Authorization': `Bearer ${VULTR_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        return response.data.instances || [];
    } catch (error) {
        logger.error('Failed to fetch Vultr instances', { error: error.message });
        return [];
    }
}

/**
 * Perform comprehensive health check on an instance
 */
async function performHealthCheck(instance, vultrInstances) {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    logger.info(`Performing health check for ${instance.name}`, { instanceId: instance.id });

    let status = 'unknown';
    let latencyMs = 0;
    let errorMessage = null;
    let vultrStatus = null;

    try {
        // 1. Check Vultr API status (if applicable)
        if (instance.type === 'vultr-compute') {
            const vultrInstance = vultrInstances.find(v => v.id === instance.id);
            if (vultrInstance) {
                vultrStatus = vultrInstance.status;
                logger.info(`Vultr status for ${instance.name}: ${vultrStatus}`);
            }
        }

        // 2. Perform HTTP/HTTPS health check on endpoint
        if (instance.endpoint && instance.endpoint.startsWith('http')) {
            const healthCheckResult = await performHTTPHealthCheck(instance.endpoint);
            latencyMs = healthCheckResult.latencyMs;

            if (healthCheckResult.success) {
                // Determine status based on latency and Vultr status
                if (latencyMs < 1000 && (!vultrStatus || vultrStatus === 'active')) {
                    status = 'healthy';
                } else if (latencyMs < 3000) {
                    status = 'degraded';
                    errorMessage = `High latency: ${latencyMs}ms`;
                } else {
                    status = 'degraded';
                    errorMessage = `Very high latency: ${latencyMs}ms`;
                }
            } else {
                status = 'unhealthy';
                errorMessage = healthCheckResult.error;
            }
        } else if (vultrStatus) {
            // No endpoint, rely on Vultr status
            status = vultrStatus === 'active' ? 'healthy' : 'unhealthy';
        } else {
            // No way to check health
            status = 'unknown';
            errorMessage = 'No endpoint or Vultr status available';
        }

    } catch (error) {
        status = 'unhealthy';
        errorMessage = error.message;
        logger.error(`Health check error for ${instance.name}`, { error: error.message });
    }

    const healthCheckDuration = Date.now() - startTime;

    // 3. Update instance status in DynamoDB
    await updateInstanceStatus(instance.id, status, timestamp, errorMessage);

    // 4. Store health check metric in DynamoDB
    await storeHealthCheckMetric(instance.id, latencyMs, status, timestamp);

    // 5. Generate alert if status changed or is unhealthy
    const alertGenerated = await handleAlerts(instance, status, errorMessage, timestamp);

    logger.info(`Health check completed for ${instance.name}`, {
        instanceId: instance.id,
        status,
        latencyMs,
        duration: healthCheckDuration
    });

    return { status, latencyMs, alertGenerated };
}

/**
 * Perform HTTP/HTTPS health check
 */
async function performHTTPHealthCheck(endpoint) {
    const startTime = Date.now();

    try {
        const response = await axios.get(endpoint, {
            timeout: HEALTH_CHECK_TIMEOUT,
            validateStatus: (status) => status < 500, // Accept 2xx, 3xx, 4xx
            maxRedirects: 3
        });

        const latencyMs = Date.now() - startTime;

        return {
            success: response.status < 400,
            latencyMs,
            statusCode: response.status,
            error: response.status >= 400 ? `HTTP ${response.status}` : null
        };

    } catch (error) {
        const latencyMs = Date.now() - startTime;

        return {
            success: false,
            latencyMs,
            error: error.code === 'ECONNABORTED'
                ? 'Connection timeout'
                : error.message
        };
    }
}

/**
 * Update instance status in DynamoDB
 */
async function updateInstanceStatus(instanceId, status, timestamp, errorMessage) {
    try {
        await dynamodb.update({
            TableName: DYNAMODB_INSTANCES_TABLE,
            Key: { id: instanceId },
            UpdateExpression: 'SET #status = :status, #lastHealthCheck = :timestamp, #updatedAt = :timestamp',
            ExpressionAttributeNames: {
                '#status': 'status',
                '#lastHealthCheck': 'lastHealthCheck',
                '#updatedAt': 'updatedAt'
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':timestamp': timestamp
            }
        }).promise();

        logger.info(`Updated instance status`, { instanceId, status });
    } catch (error) {
        logger.error(`Failed to update instance status`, { instanceId, error: error.message });
    }
}

/**
 * Store health check metric in DynamoDB
 */
async function storeHealthCheckMetric(instanceId, latencyMs, status, timestamp) {
    try {
        const metric = {
            id: `${instanceId}-healthcheck-${Date.now()}`,
            instanceId,
            timestamp,
            metricName: 'health_check_latency',
            metricValue: latencyMs,
            unit: 'milliseconds',
            tags: {
                status,
                source: 'sentinel'
            },
            createdAt: timestamp
        };

        await dynamodb.put({
            TableName: DYNAMODB_METRICS_TABLE,
            Item: metric
        }).promise();

    } catch (error) {
        logger.error(`Failed to store health check metric`, { instanceId, error: error.message });
    }
}

/**
 * Handle alert generation for unhealthy instances
 */
async function handleAlerts(instance, newStatus, errorMessage, timestamp) {
    const previousStatus = instance.status;

    // Generate alert if:
    // 1. Status changed from healthy to unhealthy/degraded
    // 2. Instance is currently unhealthy
    const shouldAlert =
        (previousStatus === 'healthy' && (newStatus === 'unhealthy' || newStatus === 'degraded')) ||
        (newStatus === 'unhealthy');

    if (!shouldAlert) {
        return false;
    }

    try {
        const alert = {
            id: `alert-${instance.id}-${Date.now()}`,
            instanceId: instance.id,
            alertType: newStatus === 'unhealthy' ? 'instance_down' : 'performance_degradation',
            severity: newStatus === 'unhealthy' ? 'critical' : 'high',
            message: `Instance ${instance.name} is ${newStatus}${errorMessage ? `: ${errorMessage}` : ''}`,
            status: 'active',
            createdAt: timestamp,
            updatedAt: timestamp,
            resolvedAt: null
        };

        await dynamodb.put({
            TableName: DYNAMODB_ALERTS_TABLE,
            Item: alert
        }).promise();

        logger.info(`Alert generated`, { instanceId: instance.id, alertType: alert.alertType });

        // Send SNS notification for critical alerts
        if (newStatus === 'unhealthy' && SNS_TOPIC_ARN) {
            await sendSNSNotification(
                `Critical: Instance ${instance.name} Down`,
                `Instance ${instance.name} (${instance.id}) is unhealthy.\n\nError: ${errorMessage}\nTime: ${timestamp}`,
                'critical'
            );
        }

        return true;

    } catch (error) {
        logger.error(`Failed to generate alert`, { instanceId: instance.id, error: error.message });
        return false;
    }
}

/**
 * Send SNS notification
 */
async function sendSNSNotification(subject, message, severity) {
    if (!SNS_TOPIC_ARN) {
        logger.warn('SNS_TOPIC_ARN not configured, skipping notification');
        return;
    }

    try {
        await sns.publish({
            TopicArn: SNS_TOPIC_ARN,
            Subject: subject,
            Message: message,
            MessageAttributes: {
                severity: {
                    DataType: 'String',
                    StringValue: severity
                }
            }
        }).promise();

        logger.info('SNS notification sent', { subject, severity });
    } catch (error) {
        logger.error('Failed to send SNS notification', { error: error.message });
    }
}
