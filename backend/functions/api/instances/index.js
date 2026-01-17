const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const INSTANCES_TABLE = process.env.DYNAMODB_TABLE_INSTANCES;

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
    const instanceId = event.pathParameters?.id;

    // POST /instances - Register new instance
    if (method === 'POST') {
      return await createInstance(event);
    }

    // GET /instances/{id} - Get specific instance
    if (method === 'GET' && instanceId) {
      return await getInstance(instanceId);
    }

    // PUT /instances/{id} - Update instance
    if (method === 'PUT' && instanceId) {
      return await updateInstance(instanceId, event);
    }

    // DELETE /instances/{id} - Delete instance
    if (method === 'DELETE' && instanceId) {
      return await deleteInstance(instanceId);
    }

    // GET /instances - List instances with optional filters
    if (method === 'GET') {
      return await listInstances(event);
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

async function createInstance(event) {
  const body = JSON.parse(event.body || '{}');

  // Validate required fields
  if (!body.name || !body.type || !body.region || !body.endpoint) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required fields',
        required: ['name', 'type', 'region', 'endpoint'],
      }),
    };
  }

  const now = Date.now();
  const instance = {
    id: uuidv4(),
    name: body.name,
    type: body.type,
    status: body.status || 'unknown',
    region: body.region,
    endpoint: body.endpoint,
    metadata: body.metadata || {},
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };

  await ddb.send(new PutCommand({
    TableName: INSTANCES_TABLE,
    Item: instance,
  }));

  console.log('Created instance:', instance.id);

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify(instance),
  };
}

async function getInstance(id) {
  const result = await ddb.send(new GetCommand({
    TableName: INSTANCES_TABLE,
    Key: { id },
  }));

  if (!result.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Instance not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Item),
  };
}

async function updateInstance(id, event) {
  const body = JSON.parse(event.body || '{}');

  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (body.name) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = body.name;
  }

  if (body.type) {
    updateExpressions.push('#type = :type');
    expressionAttributeNames['#type'] = 'type';
    expressionAttributeValues[':type'] = body.type;
  }

  if (body.status) {
    updateExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = body.status;
  }

  if (body.region) {
    updateExpressions.push('region = :region');
    expressionAttributeValues[':region'] = body.region;
  }

  if (body.endpoint) {
    updateExpressions.push('endpoint = :endpoint');
    expressionAttributeValues[':endpoint'] = body.endpoint;
  }

  if (body.metadata) {
    updateExpressions.push('metadata = :metadata');
    expressionAttributeValues[':metadata'] = body.metadata;
  }

  if (body.lastHealthCheck !== undefined) {
    updateExpressions.push('lastHealthCheck = :lastHealthCheck');
    expressionAttributeValues[':lastHealthCheck'] = body.lastHealthCheck;
  }

  // Always update updatedAt
  updateExpressions.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  if (updateExpressions.length === 1) { // Only updatedAt
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No fields to update' }),
    };
  }

  const result = await ddb.send(new UpdateCommand({
    TableName: INSTANCES_TABLE,
    Key: { id },
    UpdateExpression: 'SET ' + updateExpressions.join(', '),
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  }));

  console.log('Updated instance:', id);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result.Attributes),
  };
}

async function deleteInstance(id) {
  await ddb.send(new DeleteCommand({
    TableName: INSTANCES_TABLE,
    Key: { id },
  }));

  console.log('Deleted instance:', id);

  return {
    statusCode: 204,
    headers,
    body: '',
  };
}

async function listInstances(event) {
  const queryParams = event.queryStringParameters || {};
  const status = queryParams.status;
  const limit = parseInt(queryParams.limit || '100');

  let result;

  if (status) {
    // Query by status using GSI
    result = await ddb.send(new QueryCommand({
      TableName: INSTANCES_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
      },
      Limit: limit,
    }));
  } else {
    // Scan all instances
    result = await ddb.send(new ScanCommand({
      TableName: INSTANCES_TABLE,
      Limit: limit,
    }));
  }

  const instances = result.Items || [];

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      instances: instances,
      count: instances.length,
      lastEvaluatedKey: result.LastEvaluatedKey,
    }),
  };
}
