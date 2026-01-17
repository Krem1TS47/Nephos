const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const METRICS_TABLE = process.env.DYNAMODB_TABLE_METRICS;
const ALERTS_TABLE = process.env.DYNAMODB_TABLE_ALERTS;
const INSTANCES_TABLE = process.env.DYNAMODB_TABLE_INSTANCES;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    const path = event.requestContext.http.path;

    // GET /analytics/dashboard - Get dashboard summary
    if (path.includes('/dashboard')) {
      return await getDashboard();
    }

    // GET /analytics - Get analytics data
    return await getAnalytics(event);
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

async function getDashboard() {
  // Fetch all instances
  const instancesResult = await ddb.send(new ScanCommand({
    TableName: INSTANCES_TABLE,
  }));
  const instances = instancesResult.Items || [];

  // Fetch recent alerts (last 100)
  const alertsResult = await ddb.send(new ScanCommand({
    TableName: ALERTS_TABLE,
    Limit: 100,
  }));
  const alerts = alertsResult.Items || [];

  // Fetch recent metrics (last 100)
  const metricsResult = await ddb.send(new ScanCommand({
    TableName: METRICS_TABLE,
    Limit: 100,
  }));
  const metrics = metricsResult.Items || [];

  // Calculate summary statistics
  const totalInstances = instances.length;
  const healthyInstances = instances.filter(i => i.status === 'healthy').length;

  const activeAlerts = alerts.filter(a => a.status === 'active').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'active').length;

  // Calculate average latency from metrics
  const latencyMetrics = metrics.filter(m => m.metricName === 'latency' || m.metricName === 'response_time');
  const avgLatency = latencyMetrics.length > 0
    ? latencyMetrics.reduce((sum, m) => sum + m.metricValue, 0) / latencyMetrics.length
    : 0;

  // Format alerts with proper date conversion
  const formattedAlerts = alerts
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10)
    .map(alert => ({
      ...alert,
      createdAt: new Date(alert.createdAt).toISOString(),
      updatedAt: new Date(alert.updatedAt).toISOString(),
      resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : undefined,
    }));

  // Sort metrics by timestamp
  const formattedMetrics = metrics
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

  const dashboard = {
    summary: {
      totalInstances,
      healthyInstances,
      activeAlerts,
      criticalAlerts,
      avgLatency: Math.round(avgLatency),
    },
    instances: instances.slice(0, 10),
    recentAlerts: formattedAlerts,
    recentMetrics: formattedMetrics,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(dashboard),
  };
}

async function getAnalytics(event) {
  const queryParams = event.queryStringParameters || {};
  const instanceId = queryParams.instanceId;
  const metricName = queryParams.metricName;
  const startDate = queryParams.startDate;
  const endDate = queryParams.endDate;

  // Fetch metrics based on filters
  let metricsResult;

  if (instanceId) {
    metricsResult = await ddb.send(new QueryCommand({
      TableName: METRICS_TABLE,
      IndexName: 'InstanceIdIndex',
      KeyConditionExpression: 'instanceId = :instanceId',
      ExpressionAttributeValues: {
        ':instanceId': instanceId,
      },
      Limit: 1000,
    }));
  } else {
    metricsResult = await ddb.send(new ScanCommand({
      TableName: METRICS_TABLE,
      Limit: 1000,
    }));
  }

  let metrics = metricsResult.Items || [];

  // Filter by metricName
  if (metricName) {
    metrics = metrics.filter(m => m.metricName === metricName);
  }

  // Filter by date range
  if (startDate) {
    const startTime = new Date(startDate).getTime();
    metrics = metrics.filter(m => m.timestamp >= startTime);
  }

  if (endDate) {
    const endTime = new Date(endDate).getTime();
    metrics = metrics.filter(m => m.timestamp <= endTime);
  }

  // Group metrics by hour for aggregation
  const hourlyMetrics = aggregateMetricsByHour(metrics);

  // Fetch alerts and instances counts
  const alertsResult = await ddb.send(new ScanCommand({
    TableName: ALERTS_TABLE,
  }));
  const alerts = alertsResult.Items || [];

  const instancesResult = await ddb.send(new ScanCommand({
    TableName: INSTANCES_TABLE,
  }));
  const instances = instancesResult.Items || [];

  const analytics = {
    hourlyMetrics,
    activeAlertsCount: alerts.filter(a => a.status === 'active').length,
    healthyInstancesCount: instances.filter(i => i.status === 'healthy').length,
    unhealthyInstancesCount: instances.filter(i => i.status === 'unhealthy').length,
    totalInstancesCount: instances.length,
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(analytics),
  };
}

function aggregateMetricsByHour(metrics) {
  const grouped = {};

  metrics.forEach(metric => {
    const hour = new Date(metric.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
    const key = `${metric.instanceId}_${metric.metricName}_${hour}`;

    if (!grouped[key]) {
      grouped[key] = {
        instanceId: metric.instanceId,
        metricName: metric.metricName,
        hour: hour,
        values: [],
      };
    }

    grouped[key].values.push(metric.metricValue);
  });

  return Object.values(grouped).map(group => ({
    instanceId: group.instanceId,
    metricName: group.metricName,
    hour: group.hour,
    avgValue: group.values.reduce((sum, v) => sum + v, 0) / group.values.length,
    maxValue: Math.max(...group.values),
    minValue: Math.min(...group.values),
    sampleCount: group.values.length,
  }));
}
