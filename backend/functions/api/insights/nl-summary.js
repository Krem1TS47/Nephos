/**
 * Natural Language AI Summary Generator
 * Powered by Snowflake Cortex AI
 *
 * Generates human-readable summaries of system health in plain English
 */

/**
 * Generate comprehensive natural language summary
 */
async function generateNLSummary(connection, systemState) {
  const prompt = buildSummaryPrompt(systemState);

  const aiResponse = await executeSnowflakeQuery(connection, `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      ?,
      OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 800)
    ) AS summary
  `, [prompt]);

  return parseSummaryResponse(aiResponse[0]?.SUMMARY);
}

/**
 * Build comprehensive prompt for AI summary
 */
function buildSummaryPrompt(systemState) {
  const {
    totalInstances,
    healthyInstances,
    unhealthyInstances,
    activeAlerts,
    criticalAlerts,
    recentMetrics,
    trends,
    anomalies
  } = systemState;

  return `You are an expert DevOps engineer analyzing cloud infrastructure health.

CURRENT SYSTEM STATE:
- Total Instances: ${totalInstances}
- Healthy: ${healthyInstances} (${((healthyInstances/totalInstances)*100).toFixed(1)}%)
- Unhealthy: ${unhealthyInstances}
- Active Alerts: ${activeAlerts} (${criticalAlerts} critical)

RECENT METRICS SUMMARY:
${formatMetricsSummary(recentMetrics)}

DETECTED TRENDS:
${formatTrends(trends)}

ANOMALIES:
${formatAnomalies(anomalies)}

Generate a natural language summary in this format:

**HEALTH STATUS**: [One sentence overall assessment]

**KEY FINDINGS**:
- [Most important issue or insight]
- [Second priority item]
- [Third priority item]

**IMMEDIATE ACTIONS NEEDED**:
1. [Urgent action if any]
2. [Important action if any]

**PREDICTIONS**:
- [What might happen in next 24-48 hours]

**RECOMMENDED OPTIMIZATIONS**:
- [Optimization opportunity 1]
- [Optimization opportunity 2]

Keep it concise, actionable, and use plain English. Focus on what engineers need to know RIGHT NOW.`;
}

/**
 * Generate quick health check summary (for dashboard)
 */
async function generateQuickSummary(connection, metrics) {
  const prompt = `Summarize this cloud infrastructure health in ONE SENTENCE:

Metrics: ${JSON.stringify(metrics, null, 2)}

Provide a clear, actionable summary focusing on the most important status.`;

  const aiResponse = await executeSnowflakeQuery(connection, `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      ?,
      OBJECT_CONSTRUCT('temperature', 0.2, 'max_tokens', 100)
    ) AS summary
  `, [prompt]);

  return aiResponse[0]?.SUMMARY || 'System status normal';
}

/**
 * Generate alert explanation in natural language
 */
async function explainAlert(connection, alert) {
  const prompt = `Explain this system alert in simple terms and suggest what to do:

Alert Type: ${alert.alertType}
Severity: ${alert.severity}
Message: ${alert.message}
Instance: ${alert.instanceName || alert.instanceId}

Provide:
1. What this means in plain English (1-2 sentences)
2. Why it happened (likely cause)
3. What action to take RIGHT NOW
4. How urgent is it (scale 1-10)

Be concise and actionable.`;

  const aiResponse = await executeSnowflakeQuery(connection, `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      ?,
      OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 300)
    ) AS explanation
  `, [prompt]);

  return parseAlertExplanation(aiResponse[0]?.EXPLANATION);
}

/**
 * Generate trend analysis in natural language
 */
async function analyzeTrend(connection, trendData) {
  const prompt = `Analyze this performance trend and explain what's happening:

Metric: ${trendData.metricName}
Instance: ${trendData.instanceId}
Period: ${trendData.period}
Trend Direction: ${trendData.direction} (${trendData.changePercent}% change)
Current Value: ${trendData.currentValue}
Baseline: ${trendData.baseline}

Explain:
1. What's happening with this metric?
2. Is this normal or concerning?
3. What should we do about it?
4. When should we act?

Use simple language. Be specific and actionable.`;

  const aiResponse = await executeSnowflakeQuery(connection, `
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large',
      ?,
      OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 250)
    ) AS analysis
  `, [prompt]);

  return aiResponse[0]?.ANALYSIS;
}

/**
 * Format helper functions
 */
function formatMetricsSummary(metrics) {
  if (!metrics || metrics.length === 0) return 'No recent metrics';

  return metrics.slice(0, 5).map(m =>
    `- ${m.metricName}: ${m.value}${m.unit} (instance: ${m.instanceId.substring(0, 8)})`
  ).join('\n');
}

function formatTrends(trends) {
  if (!trends || trends.length === 0) return 'No significant trends detected';

  return trends.map(t =>
    `- ${t.metricName} ${t.direction} ${t.changePercent}% over ${t.period}`
  ).join('\n');
}

function formatAnomalies(anomalies) {
  if (!anomalies || anomalies.length === 0) return 'No anomalies detected';

  return anomalies.map(a =>
    `- ${a.metricName}: ${a.value} (${a.deviationSigma}σ from baseline)`
  ).join('\n');
}

function parseSummaryResponse(response) {
  if (!response) return null;

  // Extract structured parts if AI formatted correctly
  const healthMatch = response.match(/\*\*HEALTH STATUS\*\*:?\s*(.+?)(?=\n|$)/i);
  const findingsMatch = response.match(/\*\*KEY FINDINGS\*\*:?\s*([\s\S]+?)(?=\*\*|$)/i);
  const actionsMatch = response.match(/\*\*IMMEDIATE ACTIONS NEEDED\*\*:?\s*([\s\S]+?)(?=\*\*|$)/i);
  const predictionsMatch = response.match(/\*\*PREDICTIONS\*\*:?\s*([\s\S]+?)(?=\*\*|$)/i);

  return {
    fullText: response,
    healthStatus: healthMatch ? healthMatch[1].trim() : null,
    keyFindings: findingsMatch ? findingsMatch[1].trim() : null,
    immediateActions: actionsMatch ? actionsMatch[1].trim() : null,
    predictions: predictionsMatch ? predictionsMatch[1].trim() : null
  };
}

function parseAlertExplanation(response) {
  if (!response) return null;

  return {
    fullText: response,
    // Could add more parsing here for structured output
  };
}

/**
 * Execute Snowflake query (to be implemented in main file)
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

module.exports = {
  generateNLSummary,
  generateQuickSummary,
  explainAlert,
  analyzeTrend
};
