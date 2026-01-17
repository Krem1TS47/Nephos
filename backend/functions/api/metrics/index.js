const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const METRICS_TABLE = process.env.DYNAMODB_TABLE_METRICS;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
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
    const method = event.requestContext.http.method;
    const path = event.requestContext.http.path;

    // POST /metrics - Create new metric
    if (method === 'POST') {
      return await createMetric(event);
    }

    // GET /metrics/{id} - Get specific metric
    if (method === 'GET' && event.pathParameters?.id) {
      return await getMetric(event.pathParameters.id);
    }

    // GET /metrics - List metrics with optional filters
    if (method === 'GET') {
      return await listMetrics(event);
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
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

async function createMetric(event) {
  const body = JSON.parse(event.body || '{}');

  // Validate required fields
  if (!body.instanceId || !body.metricName || body.metricValue === undefined || !body.unit) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required fields',
        required: ['instanceId', 'metricName', 'metricValue', 'unit'],
      }),
    };
  }

  const now = Date.now();
  const metric = {
    id: uuidv4(),
    instanceId: body.instanceId,
    timestamp: body.timestamp || now,
    metricName: body.metricName,
    metricValue: parseFloat(body.metricValue),
    unit: body.unit,
    tags: body.tags || {},
    createdAt: new Date(now).toISOString(),
  };

  await ddb.send(new PutCommand({
    TableName: METRICS_TABLE,
    Item: metric,
  }));

  console.log('Created metric:', metric.id);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(metric),
  };
}

async function getMetric(id) {
  const result = await ddb.send(new GetCommand({
    TableName: METRICS_TABLE,
    Key: { id },
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Metric not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item),
  };
}

async function listMetrics(event) {
  const queryParams = event.queryStringParameters || {};
  const instanceId = queryParams.instanceId;
  const metricName = queryParams.metricName;
  const limit = parseInt(queryParams.limit || '100');

  let result;

  if (instanceId) {
    // Query by instanceId using GSI
    result = await ddb.send(new QueryCommand({
      TableName: METRICS_TABLE,
      IndexName: 'InstanceIdIndex',
      KeyConditionExpression: 'instanceId = :instanceId',
      ExpressionAttributeValues: {
        ':instanceId': instanceId,
      },
      Limit: limit,
      ScanIndexForward: false, // Sort by timestamp descending
    }));
  } else {
    // Scan all metrics
    result = await ddb.send(new ScanCommand({
      TableName: METRICS_TABLE,
      Limit: limit,
    }));
  }

  // Filter by metricName if provided
  let metrics = result.Items || [];
  if (metricName) {
    metrics = metrics.filter(m => m.metricName === metricName);
  }

  // Sort by timestamp descending
  metrics.sort((a, b) => b.timestamp - a.timestamp);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      metrics: metrics,
      count: metrics.length,
      lastEvaluatedKey: result.LastEvaluatedKey,
    }),
  };
}
