const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'NephosWebSocketConnections';

/**
 * WebSocket Disconnect Handler
 * Removes connection from tracking table
 */
exports.handler = async (event) => {
  console.log('WebSocket Disconnect:', event);

  const connectionId = event.requestContext.connectionId;

  try {
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();

    console.log(`Connection removed: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected' })
    };
  } catch (error) {
    console.error('Disconnect error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
