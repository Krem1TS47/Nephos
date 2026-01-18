const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const METRICS_TABLE = process.env.DYNAMODB_TABLE_NAME || 'CloudPulseMetrics';
const ALERTS_TABLE = process.env.DYNAMODB_TABLE_ALERTS || 'CloudPulseAlerts';
const INSTANCES_TABLE = process.env.DYNAMODB_TABLE_INSTANCES || 'CloudPulseInstances';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};

/**
 * Vultr Metrics Ingestion Lambda
 *
 * This function receives metrics from Vultr monitoring and stores them in DynamoDB.
 * The data is then synced to Snowflake via the ETL lambda for AI analysis.
 *
 * Expected payload format:
 * {
 *   "instanceId": "vultr-instance-id",
 *   "instanceName": "my-server",
 *   "region": "ewr",
 *   "metrics": [
 *     {
 *       "name": "cpu_usage",
 *       "value": 45.2,
 *       "unit": "percent",
 *       "timestamp": "2024-01-17T10:00:00Z"
 *     },
 *     ...
 *   ],
 *   "health": {
 *     "status": "healthy" | "unhealthy" | "degraded",
 *     "lastCheck": "2024-01-17T10:00:00Z"
 *   }
 * }
 */
exports.handler = async (event) => {
  console.log('Ingestion Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    let payload;

    // Parse the incoming payload
    if (typeof event.body === 'string') {
      payload = JSON.parse(event.body);
    } else {
      payload = event;
    }

    // Validate payload
    if (!payload.instanceId || !payload.metrics) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Bad Request',
          message: 'instanceId and metrics are required',
        }),
      };
    }

    // Process the ingestion
    const results = await ingestVultrData(payload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Metrics ingested successfully',
        metricsIngested: results.metricsCount,
        instanceUpdated: results.instanceUpdated,
        alertsGenerated: results.alertsCount,
      }),
    };
  } catch (error) {
    console.error('Ingestion Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
    };
  }
};

/**
 * Ingest Vultr data into DynamoDB
 */
async function ingestVultrData(payload) {
  const {
    instanceId,
    instanceName = 'Vultr Instance',
    region = 'unknown',
    instanceType = 'vultr-compute',
    endpoint = '',
    metrics = [],
    health = {},
  } = payload;

  const timestamp = new Date().toISOString();

  // 1. Update/Create instance record
  const instanceUpdated = await updateInstance({
    id: instanceId,
    name: instanceName,
    type: instanceType,
    status: health.status || 'healthy',
    region,
    endpoint,
    lastHealthCheck: health.lastCheck || timestamp,
  });

  // 2. Batch write metrics
  const metricsCount = await batchWriteMetrics(instanceId, metrics);

  // 3. Generate alerts based on metric thresholds
  const alertsCount = await generateAlerts(instanceId, metrics);

  return {
    instanceUpdated,
    metricsCount,
    alertsCount,
  };
}

/**
 * Update or create instance in DynamoDB
 */
async function updateInstance(instance) {
  const now = new Date().toISOString();

  const item = {
    id: instance.id,
    name: instance.name,
    type: instance.type,
    status: instance.status,
    region: instance.region,
    endpoint: instance.endpoint,
    metadata: {
      source: 'vultr',
      lastSync: now,
    },
    updatedAt: now,
    lastHealthCheck: instance.lastHealthCheck,
  };

  // Check if instance exists (for createdAt)
  try {
    const command = new PutCommand({
      TableName: INSTANCES_TABLE,
      Item: {
        ...item,
        createdAt: now, // Will be overwritten if item exists
      },
      ConditionExpression: 'attribute_not_exists(id)',
    });
    await ddb.send(command);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Instance exists, update it
      const updateCommand = new PutCommand({
        TableName: INSTANCES_TABLE,
        Item: item,
      });
      await ddb.send(updateCommand);
    } else {
      throw error;
    }
  }

  return true;
}

/**
 * Batch write metrics to DynamoDB
 */
async function batchWriteMetrics(instanceId, metrics) {
  if (!metrics || metrics.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  const items = metrics.map((metric) => ({
    id: uuidv4(),
    instanceId,
    timestamp: metric.timestamp || now,
    metricName: metric.name,
    metricValue: parseFloat(metric.value),
    unit: metric.unit || 'count',
    tags: metric.tags || {},
    createdAt: now,
  }));

  // DynamoDB batch write supports max 25 items at a time
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  for (const batch of batches) {
    const command = new BatchWriteCommand({
      RequestItems: {
        [METRICS_TABLE]: batch.map((item) => ({
          PutRequest: {
            Item: item,
          },
        })),
      },
    });

    await ddb.send(command);
  }

  return items.length;
}

/**
 * Generate alerts based on metric thresholds
 */
async function generateAlerts(instanceId, metrics) {
  const alerts = [];
  const now = new Date().toISOString();

  // Define alert thresholds
  const thresholds = {
    cpu_usage: { warning: 70, critical: 90 },
    memory_usage_percent: { warning: 75, critical: 90 },
    disk_usage_percent: { warning: 80, critical: 95 },
    network_errors: { warning: 10, critical: 50 },
    response_time_ms: { warning: 1000, critical: 3000 },
  };

  for (const metric of metrics) {
    const threshold = thresholds[metric.name];
    if (!threshold) continue;

    const value = parseFloat(metric.value);
    let severity = null;
    let alertType = null;

    if (value >= threshold.critical) {
      severity = 'critical';
      alertType = `${metric.name}_critical`;
    } else if (value >= threshold.warning) {
      severity = 'high';
      alertType = `${metric.name}_warning`;
    }

    if (severity) {
      alerts.push({
        id: uuidv4(),
        instanceId,
        alertType,
        severity,
        message: `${metric.name} is ${severity}: ${value}${metric.unit || ''} (threshold: ${
          severity === 'critical' ? threshold.critical : threshold.warning
        })`,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
      });
    }
  }

  // Write alerts to DynamoDB
  for (const alert of alerts) {
    const command = new PutCommand({
      TableName: ALERTS_TABLE,
      Item: alert,
    });
    await ddb.send(command);
  }

  return alerts.length;
}
