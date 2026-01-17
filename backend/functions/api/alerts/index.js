const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const ALERTS_TABLE = process.env.DYNAMODB_TABLE_ALERTS;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
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
    const alertId = event.pathParameters?.id;

    // POST /alerts - Create new alert
    if (method === 'POST') {
      return await createAlert(event);
    }

    // GET /alerts/{id} - Get specific alert
    if (method === 'GET' && alertId) {
      return await getAlert(alertId);
    }

    // PUT /alerts/{id} - Update alert
    if (method === 'PUT' && alertId) {
      return await updateAlert(alertId, event);
    }

    // DELETE /alerts/{id} - Delete alert
    if (method === 'DELETE' && alertId) {
      return await deleteAlert(alertId);
    }

    // GET /alerts - List alerts with optional filters
    if (method === 'GET') {
      return await listAlerts(event);
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

async function createAlert(event) {
  const body = JSON.parse(event.body || '{}');

  // Validate required fields
  if (!body.instanceId || !body.alertType || !body.severity || !body.message) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required fields',
        required: ['instanceId', 'alertType', 'severity', 'message'],
      }),
    };
  }

  const now = Date.now();
  const alert = {
    id: uuidv4(),
    instanceId: body.instanceId,
    alertType: body.alertType,
    severity: body.severity,
    message: body.message,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({
    TableName: ALERTS_TABLE,
    Item: alert,
  }));

  console.log('Created alert:', alert.id);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      ...alert,
      createdAt: new Date(alert.createdAt).toISOString(),
      updatedAt: new Date(alert.updatedAt).toISOString(),
    }),
  };
}

async function getAlert(id) {
  const result = await ddb.send(new GetCommand({
    TableName: ALERTS_TABLE,
    Key: { id },
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Alert not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ...result.Item,
      createdAt: new Date(result.Item.createdAt).toISOString(),
      updatedAt: new Date(result.Item.updatedAt).toISOString(),
      resolvedAt: result.Item.resolvedAt ? new Date(result.Item.resolvedAt).toISOString() : undefined,
    }),
  };
}

async function updateAlert(id, event) {
  const body = JSON.parse(event.body || '{}');

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (body.status) {
    updateExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = body.status;
  }

  if (body.message) {
    updateExpressions.push('#message = :message');
    expressionAttributeNames['#message'] = 'message';
    expressionAttributeValues[':message'] = body.message;
  }

  if (body.resolvedAt) {
    updateExpressions.push('resolvedAt = :resolvedAt');
    expressionAttributeValues[':resolvedAt'] = Date.now();
  }

  // Always update updatedAt
  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = Date.now();

  if (updateExpressions.length === 1) { // Only updatedAt
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No fields to update' }),
    };
  }

  const result = await ddb.send(new UpdateCommand({
    TableName: ALERTS_TABLE,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  console.log('Updated alert:', id);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ...result.Attributes,
      createdAt: new Date(result.Attributes.createdAt).toISOString(),
      updatedAt: new Date(result.Attributes.updatedAt).toISOString(),
      resolvedAt: result.Attributes.resolvedAt ? new Date(result.Attributes.resolvedAt).toISOString() : undefined,
    }),
  };
}

async function deleteAlert(id) {
  await ddb.send(new DeleteCommand({
    TableName: ALERTS_TABLE,
    Key: { id },
  }));

  console.log('Deleted alert:', id);

  return {
    statusCode: 204,
    headers,
    body: '',
  };
}

async function listAlerts(event) {
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status;
  const instanceId = queryParams.instanceId;
  const limit = parseInt(queryParams.limit || '100');

  let result;

  if (status) {
    // Query by status using GSI
    result = await ddb.send(new QueryCommand({
      TableName: ALERTS_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      Limit: limit,
      ScanIndexForward: false,
    }));
  } else {
    // Scan all alerts
    result = await ddb.send(new ScanCommand({
      TableName: ALERTS_TABLE,
      Limit: limit,
    }));
  }

  // Filter by instanceId if provided
  let alerts = result.Items || [];
  if (instanceId) {
    alerts = alerts.filter(a => a.instanceId === instanceId);
  }

  // Sort by createdAt descending
  alerts.sort((a, b) => b.createdAt - a.createdAt);

  // Format dates
  alerts = alerts.map(alert => ({
    ...alert,
    createdAt: new Date(alert.createdAt).toISOString(),
    updatedAt: new Date(alert.updatedAt).toISOString(),
    resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : undefined,
  }));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      alerts: alerts,
      count: alerts.length,
      lastEvaluatedKey: result.LastEvaluatedKey,
    }),
  };
}
