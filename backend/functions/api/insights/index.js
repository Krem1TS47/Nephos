const snowflake = require('snowflake-sdk');

// Snowflake configuration
const snowflakeConfig = {
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  database: process.env.SNOWFLAKE_DATABASE,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  schema: process.env.SNOWFLAKE_SCHEMA,
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

/**
 * AI Insights API
 *
 * Endpoints:
 * - GET /insights - Get all AI insights
 * - GET /insights/summary - Get AI summary report
 * - GET /insights/patterns - Get pattern insights
 * - GET /insights/anomalies - Get anomaly insights
 * - GET /insights/predictions - Get predictive insights
 */
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

  const connection = await createSnowflakeConnection();

  try {
    const path = event.requestContext.http.path;

    // GET /insights/summary
    if (path.includes('/summary')) {
      return await getSummary(connection);
    }

    // GET /insights/patterns
    if (path.includes('/patterns')) {
      return await getInsightsByType(connection, 'pattern');
    }

    // GET /insights/anomalies
    if (path.includes('/anomalies')) {
      return await getInsightsByType(connection, 'anomaly');
    }

    // GET /insights/predictions
    if (path.includes('/predictions')) {
      return await getInsightsByType(connection, 'prediction');
    }

    // GET /insights - Get all insights
    return await getAllInsights(connection, event);
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
  } finally {
    await closeSnowflakeConnection(connection);
  }
};

/**
 * Get all AI insights
 */
async function getAllInsights(connection, event) {
  const queryParams = event.queryStringParameters || {};
  const limit = parseInt(queryParams.limit || '50');
  const severity = queryParams.severity;
  const insightType = queryParams.type;

  let sql = `
    SELECT
      ID,
      INSIGHT_TYPE,
      SEVERITY,
      TITLE,
      DESCRIPTION,
      AFFECTED_INSTANCES,
      METRICS_ANALYZED,
      CONFIDENCE_SCORE,
      RECOMMENDATIONS,
      CREATED_AT,
      EXPIRES_AT,
      METADATA
    FROM AI_INSIGHTS
    WHERE EXPIRES_AT > CURRENT_TIMESTAMP()
  `;

  const binds = [];

  if (severity) {
    sql += ' AND SEVERITY = ?';
    binds.push(severity);
  }

  if (insightType) {
    sql += ' AND INSIGHT_TYPE = ?';
    binds.push(insightType);
  }

  sql += ' ORDER BY CREATED_AT DESC LIMIT ?';
  binds.push(limit);

  const rows = await executeSnowflakeQuery(connection, sql, binds);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      insights: rows.map(formatInsight),
      count: rows.length,
    }),
  };
}

/**
 * Get insights by type
 */
async function getInsightsByType(connection, type) {
  const sql = `
    SELECT
      ID,
      INSIGHT_TYPE,
      SEVERITY,
      TITLE,
      DESCRIPTION,
      AFFECTED_INSTANCES,
      METRICS_ANALYZED,
      CONFIDENCE_SCORE,
      RECOMMENDATIONS,
      CREATED_AT,
      EXPIRES_AT,
      METADATA
    FROM AI_INSIGHTS
    WHERE INSIGHT_TYPE = ?
      AND EXPIRES_AT > CURRENT_TIMESTAMP()
    ORDER BY CREATED_AT DESC
    LIMIT 20
  `;

  const rows = await executeSnowflakeQuery(connection, sql, [type]);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      type,
      insights: rows.map(formatInsight),
      count: rows.length,
    }),
  };
}

/**
 * Get AI summary report
 */
async function getSummary(connection) {
  try {
    // Call the stored procedure to generate summary
    const summaryResult = await executeSnowflakeQuery(
      connection,
      'CALL GENERATE_AI_SUMMARY_REPORT()'
    );

    const summary = summaryResult[0]?.GENERATE_AI_SUMMARY_REPORT || 'No summary available';

    // Also get recent insights stats
    const statsResult = await executeSnowflakeQuery(connection, `
      SELECT
        INSIGHT_TYPE,
        SEVERITY,
        COUNT(*) AS COUNT
      FROM AI_INSIGHTS
      WHERE EXPIRES_AT > CURRENT_TIMESTAMP()
        AND CREATED_AT > DATEADD(day, -1, CURRENT_TIMESTAMP())
      GROUP BY INSIGHT_TYPE, SEVERITY
    `);

    // Get most critical insight
    const criticalResult = await executeSnowflakeQuery(connection, `
      SELECT
        ID,
        INSIGHT_TYPE,
        SEVERITY,
        TITLE,
        DESCRIPTION,
        AFFECTED_INSTANCES,
        CONFIDENCE_SCORE,
        RECOMMENDATIONS,
        CREATED_AT
      FROM AI_INSIGHTS
      WHERE EXPIRES_AT > CURRENT_TIMESTAMP()
        AND SEVERITY = 'high'
      ORDER BY CREATED_AT DESC
      LIMIT 1
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary,
        stats: statsResult,
        criticalInsight: criticalResult[0] ? formatInsight(criticalResult[0]) : null,
        generatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Summary generation error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: 'AI summary temporarily unavailable',
        stats: [],
        criticalInsight: null,
        generatedAt: new Date().toISOString(),
      }),
    };
  }
}

/**
 * Format insight for API response
 */
function formatInsight(row) {
  return {
    id: row.ID,
    type: row.INSIGHT_TYPE,
    severity: row.SEVERITY,
    title: row.TITLE,
    description: row.DESCRIPTION,
    affectedInstances: row.AFFECTED_INSTANCES ? JSON.parse(row.AFFECTED_INSTANCES) : [],
    metricsAnalyzed: row.METRICS_ANALYZED ? JSON.parse(row.METRICS_ANALYZED) : [],
    confidenceScore: row.CONFIDENCE_SCORE,
    recommendations: row.RECOMMENDATIONS,
    createdAt: row.CREATED_AT,
    expiresAt: row.EXPIRES_AT,
    metadata: row.METADATA ? JSON.parse(row.METADATA) : {},
  };
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
          resolve(rows || []);
        }
      },
    });
  });
}
