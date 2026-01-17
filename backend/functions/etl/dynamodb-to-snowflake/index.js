const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const snowflake = require('snowflake-sdk');

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// Snowflake configuration
const snowflakeConfig = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  schema: process.env.SNOWFLAKE_SCHEMA,
};

const METRICS_TABLE = process.env.DYNAMODB_TABLE_METRICS;
const ALERTS_TABLE = process.env.DYNAMODB_TABLE_ALERTS;
const INSTANCES_TABLE = process.env.DYNAMODB_TABLE_INSTANCES;

/**
 * ETL Lambda Function: DynamoDB → Snowflake
 *
 * Triggered by:
 * 1. DynamoDB Stream (real-time sync)
 * 2. Scheduled CloudWatch Event (hourly batch)
 * 3. Manual invocation
 */
exports.handler = async (event) => {
  console.log('ETL Event:', JSON.stringify(event, null, 2));

  try {
    // Check if triggered by DynamoDB Stream
    if (event.Records && event.Records[0].eventSource === 'aws:dynamodb') {
      return await handleStreamEvent(event);
    }

    // Otherwise, run full batch sync
    return await handleBatchSync();
  } catch (error) {
    console.error('ETL Error:', error);
    throw error;
  }
};

/**
 * Handle DynamoDB Stream events (real-time)
 */
async function handleStreamEvent(event) {
  const connection = await createSnowflakeConnection();

  try {
    const records = event.Records;
    console.log(`Processing ${records.length} DynamoDB stream records`);

    for (const record of records) {
      const eventName = record.eventName; // INSERT, MODIFY, REMOVE
      const tableName = record.eventSourceARN.split('/')[1].split('-')[1]; // Extract table type

      if (eventName === 'INSERT' || eventName === 'MODIFY') {
        const newImage = unmarshallDynamoDBRecord(record.dynamodb.NewImage);

        if (tableName.includes('metrics')) {
          await insertMetricToSnowflake(connection, newImage);
        } else if (tableName.includes('alerts')) {
          await insertAlertToSnowflake(connection, newImage);
        } else if (tableName.includes('instances')) {
          await insertInstanceToSnowflake(connection, newImage);
        }
      }
    }

    console.log('Stream processing complete');
    return { statusCode: 200, message: 'Stream processed successfully' };
  } finally {
    await closeSnowflakeConnection(connection);
  }
}

/**
 * Handle batch sync (scheduled)
 */
async function handleBatchSync() {
  const connection = await createSnowflakeConnection();

  try {
    console.log('Starting batch sync...');

    // Sync metrics
    const metricsCount = await syncTable(connection, METRICS_TABLE, 'METRICS', insertMetricToSnowflake);

    // Sync alerts
    const alertsCount = await syncTable(connection, ALERTS_TABLE, 'ALERTS', insertAlertToSnowflake);

    // Sync instances
    const instancesCount = await syncTable(connection, INSTANCES_TABLE, 'INSTANCES', insertInstanceToSnowflake);

    // Trigger AI analysis after batch sync
    await triggerAIAnalysis(connection);

    console.log('Batch sync complete');
    return {
      statusCode: 200,
      message: 'Batch sync successful',
      metrics: metricsCount,
      alerts: alertsCount,
      instances: instancesCount,
    };
  } finally {
    await closeSnowflakeConnection(connection);
  }
}

/**
 * Sync a DynamoDB table to Snowflake
 */
async function syncTable(connection, dynamoTable, snowflakeTable, insertFunction) {
  let lastEvaluatedKey = null;
  let totalCount = 0;

  do {
    const params = {
      TableName: dynamoTable,
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await ddb.send(new ScanCommand(params));
    const items = result.Items || [];

    console.log(`Syncing ${items.length} items to ${snowflakeTable}`);

    for (const item of items) {
      await insertFunction(connection, item);
      totalCount++;
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`Synced ${totalCount} items to ${snowflakeTable}`);
  return totalCount;
}

/**
 * Insert metric into Snowflake
 */
async function insertMetricToSnowflake(connection, metric) {
  const sql = `
    MERGE INTO METRICS AS target
    USING (
      SELECT
        ? AS ID,
        ? AS INSTANCE_ID,
        TO_TIMESTAMP_NTZ(?) AS TIMESTAMP,
        ? AS METRIC_NAME,
        ? AS METRIC_VALUE,
        ? AS UNIT,
        PARSE_JSON(?) AS TAGS,
        TO_TIMESTAMP_NTZ(?) AS CREATED_AT
    ) AS source
    ON target.ID = source.ID
    WHEN MATCHED THEN
      UPDATE SET
        METRIC_VALUE = source.METRIC_VALUE,
        TIMESTAMP = source.TIMESTAMP
    WHEN NOT MATCHED THEN
      INSERT (ID, INSTANCE_ID, TIMESTAMP, METRIC_NAME, METRIC_VALUE, UNIT, TAGS, CREATED_AT)
      VALUES (source.ID, source.INSTANCE_ID, source.TIMESTAMP, source.METRIC_NAME, source.METRIC_VALUE, source.UNIT, source.TAGS, source.CREATED_AT);
  `;

  const binds = [
    metric.id,
    metric.instanceId,
    new Date(metric.timestamp).toISOString(),
    metric.metricName,
    metric.metricValue,
    metric.unit,
    JSON.stringify(metric.tags || {}),
    metric.createdAt,
  ];

  return executeSnowflakeQuery(connection, sql, binds);
}

/**
 * Insert alert into Snowflake
 */
async function insertAlertToSnowflake(connection, alert) {
  const sql = `
    MERGE INTO ALERTS AS target
    USING (
      SELECT
        ? AS ID,
        ? AS INSTANCE_ID,
        ? AS ALERT_TYPE,
        ? AS SEVERITY,
        ? AS MESSAGE,
        ? AS STATUS,
        TO_TIMESTAMP_NTZ(?) AS CREATED_AT,
        TO_TIMESTAMP_NTZ(?) AS UPDATED_AT,
        TO_TIMESTAMP_NTZ(?) AS RESOLVED_AT
    ) AS source
    ON target.ID = source.ID
    WHEN MATCHED THEN
      UPDATE SET
        STATUS = source.STATUS,
        UPDATED_AT = source.UPDATED_AT,
        RESOLVED_AT = source.RESOLVED_AT
    WHEN NOT MATCHED THEN
      INSERT (ID, INSTANCE_ID, ALERT_TYPE, SEVERITY, MESSAGE, STATUS, CREATED_AT, UPDATED_AT, RESOLVED_AT)
      VALUES (source.ID, source.INSTANCE_ID, source.ALERT_TYPE, source.SEVERITY, source.MESSAGE, source.STATUS, source.CREATED_AT, source.UPDATED_AT, source.RESOLVED_AT);
  `;

  const binds = [
    alert.id,
    alert.instanceId,
    alert.alertType,
    alert.severity,
    alert.message,
    alert.status,
    new Date(alert.createdAt).toISOString(),
    new Date(alert.updatedAt).toISOString(),
    alert.resolvedAt ? new Date(alert.resolvedAt).toISOString() : null,
  ];

  return executeSnowflakeQuery(connection, sql, binds);
}

/**
 * Insert instance into Snowflake
 */
async function insertInstanceToSnowflake(connection, instance) {
  const sql = `
    MERGE INTO INSTANCES AS target
    USING (
      SELECT
        ? AS ID,
        ? AS NAME,
        ? AS TYPE,
        ? AS STATUS,
        ? AS REGION,
        ? AS ENDPOINT,
        PARSE_JSON(?) AS METADATA,
        TO_TIMESTAMP_NTZ(?) AS CREATED_AT,
        TO_TIMESTAMP_NTZ(?) AS UPDATED_AT,
        TO_TIMESTAMP_NTZ(?) AS LAST_HEALTH_CHECK
    ) AS source
    ON target.ID = source.ID
    WHEN MATCHED THEN
      UPDATE SET
        STATUS = source.STATUS,
        UPDATED_AT = source.UPDATED_AT,
        LAST_HEALTH_CHECK = source.LAST_HEALTH_CHECK
    WHEN NOT MATCHED THEN
      INSERT (ID, NAME, TYPE, STATUS, REGION, ENDPOINT, METADATA, CREATED_AT, UPDATED_AT, LAST_HEALTH_CHECK)
      VALUES (source.ID, source.NAME, source.TYPE, source.STATUS, source.REGION, source.ENDPOINT, source.METADATA, source.CREATED_AT, source.UPDATED_AT, source.LAST_HEALTH_CHECK);
  `;

  const binds = [
    instance.id,
    instance.name,
    instance.type,
    instance.status,
    instance.region,
    instance.endpoint,
    JSON.stringify(instance.metadata || {}),
    instance.createdAt,
    instance.updatedAt,
    instance.lastHealthCheck || null,
  ];

  return executeSnowflakeQuery(connection, sql, binds);
}

/**
 * Trigger AI analysis procedures
 */
async function triggerAIAnalysis(connection) {
  console.log('Triggering AI analysis...');

  try {
    // Call stored procedure to run AI analysis
    await executeSnowflakeQuery(connection, 'CALL RUN_AI_PATTERN_ANALYSIS();');
    await executeSnowflakeQuery(connection, 'CALL RUN_AI_ANOMALY_DETECTION();');
    await executeSnowflakeQuery(connection, 'CALL RUN_AI_PREDICTIVE_ANALYSIS();');

    console.log('AI analysis triggered successfully');
  } catch (error) {
    console.error('AI analysis error:', error);
    // Don't fail the ETL if AI analysis fails
  }
}

/**
 * Create Snowflake connection
 */
function createSnowflakeConnection() {
  return new Promise((resolve, reject) => {
    const connection = snowflake.createConnection(snowflakeConfig);

    connection.connect((err, conn) => {
      if (err) {
        console.error('Snowflake connection error:', err);
        reject(err);
      } else {
        console.log('Snowflake connected successfully');
        resolve(conn);
      }
    });
  });
}

/**
 * Close Snowflake connection
 */
function closeSnowflakeConnection(connection) {
  return new Promise((resolve) => {
    connection.destroy((err) => {
      if (err) {
        console.error('Error closing Snowflake connection:', err);
      } else {
        console.log('Snowflake connection closed');
      }
      resolve();
    });
  });
}

/**
 * Execute Snowflake query
 */
function executeSnowflakeQuery(connection, sqlText, binds = []) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, stmt, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      },
    });
  });
}

/**
 * Unmarshall DynamoDB record
 */
function unmarshallDynamoDBRecord(image) {
  const unmarshalled = {};

  for (const key in image) {
    const value = image[key];

    if (value.S !== undefined) {
      unmarshalled[key] = value.S;
    } else if (value.N !== undefined) {
      unmarshalled[key] = parseFloat(value.N);
    } else if (value.BOOL !== undefined) {
      unmarshalled[key] = value.BOOL;
    } else if (value.M !== undefined) {
      unmarshalled[key] = unmarshallDynamoDBRecord(value.M);
    } else if (value.L !== undefined) {
      unmarshalled[key] = value.L.map(item => unmarshallDynamoDBRecord({ item }).item);
    } else if (value.NULL !== undefined) {
      unmarshalled[key] = null;
    }
  }

  return unmarshalled;
}
