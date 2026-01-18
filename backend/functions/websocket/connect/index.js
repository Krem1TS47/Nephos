const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'NephosWebSocketConnections';

/**
 * WebSocket Connect Handler
 * Stores connection ID for real-time push notifications
 */
exports.handler = async (event) => {
  console.log('WebSocket Connect:', event);

  const connectionId = event.requestContext.connectionId;
  const timestamp = new Date().toISOString();

  try {
    // Store connection in DynamoDB
    await dynamodb.put({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        connectedAt: timestamp,
        ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour TTL
      }
    }).promise();

    console.log(`Connection stored: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected', connectionId })
    };
  } catch (error) {
    console.error('Connection error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
