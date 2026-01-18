const AWS = require('aws-sdk');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'NephosWebSocketConnections';

/**
 * WebSocket Broadcast Handler
 * Pushes real-time updates to all connected clients
 *
 * Triggered by:
 * - DynamoDB Streams (new metrics/alerts)
 * - Scheduled events (periodic updates)
 * - Manual invocation
 */
exports.handler = async (event) => {
  console.log('Broadcast Event:', JSON.stringify(event, null, 2));

  try {
    // Get all active connections
    const connections = await getAllConnections();
    console.log(`Found ${connections.length} active connections`);

    if (connections.length === 0) {
      return { statusCode: 200, body: 'No active connections' };
    }

    // Parse the update data
    const updateData = parseEventData(event);

    // Broadcast to all connections
    const results = await Promise.allSettled(
      connections.map(conn => sendToConnection(conn.connectionId, updateData))
    );

    // Clean up stale connections
    const staleConnections = results
      .map((result, index) => ({ result, connectionId: connections[index].connectionId }))
      .filter(({ result }) => result.status === 'rejected' && result.reason?.statusCode === 410);

    for (const { connectionId } of staleConnections) {
      await removeConnection(connectionId);
    }

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`Broadcast complete: ${successCount}/${connections.length} successful`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Broadcast complete',
        sent: successCount,
        total: connections.length,
        stale: staleConnections.length
      })
    };

  } catch (error) {
    console.error('Broadcast error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Get all active WebSocket connections
 */
async function getAllConnections() {
  const result = await dynamodb.scan({
    TableName: CONNECTIONS_TABLE
  }).promise();

  return result.Items || [];
}

/**
 * Send data to a specific connection
 */
async function sendToConnection(connectionId, data) {
  try {
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();

    console.log(`Sent to ${connectionId}`);
  } catch (error) {
    if (error.statusCode === 410) {
      console.log(`Stale connection: ${connectionId}`);
    } else {
      console.error(`Error sending to ${connectionId}:`, error);
    }
    throw error;
  }
}

/**
 * Remove stale connection
 */
async function removeConnection(connectionId) {
  try {
    await dynamodb.delete({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }).promise();

    console.log(`Removed stale connection: ${connectionId}`);
  } catch (error) {
    console.error(`Error removing connection ${connectionId}:`, error);
  }
}

/**
 * Parse event data from various sources
 */
function parseEventData(event) {
  // DynamoDB Stream event
  if (event.Records && event.Records[0]?.eventSource === 'aws:dynamodb') {
    const record = event.Records[0];
    const eventType = record.eventName; // INSERT, MODIFY, REMOVE

    if (record.dynamodb.NewImage) {
      const newData = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      return {
        type: 'realtime_update',
        eventType,
        data: newData,
        timestamp: new Date().toISOString(),
        source: 'dynamodb_stream'
      };
    }
  }

  // Manual/scheduled event
  if (event.updateType) {
    return {
      type: event.updateType,
      data: event.data || {},
      timestamp: new Date().toISOString(),
      source: 'manual'
    };
  }

  // Default
  return {
    type: 'ping',
    timestamp: new Date().toISOString(),
    source: 'unknown'
  };
}
