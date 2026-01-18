# Nephos Brain Layer - AI-Powered Cloud Health Intelligence

## Overview

The Nephos Brain Layer is an AI-powered analytics pipeline that provides deep insights into your cloud infrastructure health. It uses **Snowflake Cortex AI** to analyze metrics data and generate actionable insights, predictions, and anomaly detections.

## Architecture

```
Vultr Instances
      ↓
  [Metrics Collection Script]
      ↓
  AWS Lambda (Ingestion)
      ↓
  DynamoDB (Real-time Storage)
      ↓
  AWS Lambda (ETL)
      ↓
  Snowflake Database
      ↓
  [Snowflake Cortex AI Analysis]
      ↓
  AWS Lambda (Insights API)
      ↓
  Frontend Dashboard
```

## Components

### 1. Vultr Metrics Collection (`backend/scripts/vultr-monitor.js`)

A Node.js script that runs on Vultr instances to collect system metrics:
- CPU usage
- Memory usage
- Load averages
- Network statistics
- Uptime

**Setup:**
```bash
# On your Vultr instance
export INGESTION_ENDPOINT="https://your-lambda-url.amazonaws.com"
export VULTR_INSTANCE_ID="your-instance-id"
export INSTANCE_NAME="my-server"
export VULTR_REGION="ewr"

# Run the monitor
node backend/scripts/vultr-monitor.js

# Or set up as a cron job for continuous monitoring
# Run every minute
* * * * * /usr/bin/node /path/to/vultr-monitor.js >> /var/log/nephos-monitor.log 2>&1
```

### 2. AWS Lambda - Vultr Metrics Ingestion (`backend/functions/ingest/vultr-metrics`)

Receives metrics from Vultr instances and stores them in DynamoDB.

**Features:**
- Validates incoming metrics
- Stores metrics in DynamoDB
- Updates instance health status
- Auto-generates alerts based on thresholds

**Environment Variables:**
```
DYNAMODB_TABLE_NAME=CloudPulseMetrics
DYNAMODB_TABLE_ALERTS=CloudPulseAlerts
DYNAMODB_TABLE_INSTANCES=CloudPulseInstances
```

### 3. AWS Lambda - ETL Pipeline (`backend/functions/etl/dynamodb-to-snowflake`)

Syncs data from DynamoDB to Snowflake for AI analysis.

**Features:**
- Real-time sync via DynamoDB Streams
- Scheduled batch sync (hourly)
- Triggers AI analysis after sync
- Handles metrics, alerts, and instances

**Triggers:**
- DynamoDB Stream (real-time)
- CloudWatch Events (scheduled)
- Manual invocation

### 4. Snowflake Cortex AI Brain (`backend/snowflake/setup.sql`)

The core intelligence layer using Snowflake Cortex AI.

**AI-Powered Stored Procedures:**

#### a) `RUN_AI_PATTERN_ANALYSIS()`
Identifies trends and patterns in metrics over 24 hours.
- Performance degradation patterns
- Resource utilization trends
- Cyclical issues
- Capacity planning insights

**Schedule:** Every 6 hours

#### b) `RUN_AI_ANOMALY_DETECTION()`
Detects unusual behavior using statistical analysis + AI.
- Identifies metrics with >3 standard deviations
- Explains potential root causes
- Provides remediation steps

**Schedule:** Every 15 minutes

#### c) `RUN_AI_PREDICTIVE_ANALYSIS()`
Forecasts future issues based on trends.
- Predicts potential issues in next 24-48 hours
- Identifies capacity constraints
- Suggests preventive actions

**Schedule:** Every 12 hours

#### d) `GENERATE_AI_SUMMARY_REPORT()`
Creates executive summary of system health.
- Overall health score and trend
- Top 3 risks or concerns
- Key recommendations
- Notable improvements

**Called:** On-demand via API

### 5. AWS Lambda - Insights API (`backend/functions/api/insights`)

Exposes AI insights to the frontend.

**Endpoints:**
- `GET /insights` - Get all AI insights
- `GET /insights/summary` - Get AI summary report
- `GET /insights/patterns` - Get pattern insights
- `GET /insights/anomalies` - Get anomaly insights
- `GET /insights/predictions` - Get prediction insights

**Query Parameters:**
- `limit` - Maximum number of insights to return
- `severity` - Filter by severity (low, medium, high)
- `type` - Filter by type (pattern, anomaly, prediction)

### 6. Frontend Dashboard (`client/app/page.tsx`)

Displays AI insights in a beautiful, actionable UI.

**Features:**
- AI Summary card with critical insights
- Categorized insights (Patterns, Anomalies, Predictions)
- Detailed insights list with recommendations
- Confidence scores for each insight
- Real-time updates

## Data Flow

### Real-time Flow
1. Vultr instance collects metrics every minute
2. Metrics sent to Lambda ingestion endpoint
3. Lambda stores in DynamoDB
4. DynamoDB Stream triggers ETL Lambda
5. ETL Lambda syncs to Snowflake
6. Snowflake AI analysis runs (scheduled)
7. Frontend fetches insights via API

### Batch Flow
1. Scheduled CloudWatch Event triggers ETL Lambda
2. ETL Lambda scans DynamoDB tables
3. Bulk insert/update to Snowflake
4. AI analysis procedures run
5. Insights stored in AI_INSIGHTS table

## Snowflake Tables

### METRICS
Stores time-series metrics data.
- ID, INSTANCE_ID, TIMESTAMP
- METRIC_NAME, METRIC_VALUE, UNIT
- TAGS, CREATED_AT

### ALERTS
Stores alert data.
- ID, INSTANCE_ID, ALERT_TYPE
- SEVERITY, MESSAGE, STATUS
- CREATED_AT, UPDATED_AT, RESOLVED_AT

### INSTANCES
Stores instance metadata.
- ID, NAME, TYPE, STATUS
- REGION, ENDPOINT, METADATA
- CREATED_AT, UPDATED_AT, LAST_HEALTH_CHECK

### AI_INSIGHTS
Stores AI-generated insights.
- ID, INSIGHT_TYPE, SEVERITY
- TITLE, DESCRIPTION
- AFFECTED_INSTANCES, METRICS_ANALYZED
- CONFIDENCE_SCORE, RECOMMENDATIONS
- CREATED_AT, EXPIRES_AT, METADATA

## Setup Instructions

### 1. Configure Snowflake

```bash
# Run the setup script
snowsql -a <your-account> -u <your-user> -f backend/snowflake/setup.sql

# Or manually execute in Snowflake UI
```

**Important:** Update the warehouse name in the stored procedures if different from `SNOWFLAKE_LEARNING_WH`.

### 2. Deploy Lambda Functions

```bash
cd backend/functions/ingest/vultr-metrics
npm install
# Deploy using AWS SAM, Serverless Framework, or AWS Console

cd ../../etl/dynamodb-to-snowflake
npm install
# Deploy with DynamoDB Stream trigger

cd ../../api/insights
npm install
# Deploy with API Gateway integration
```

### 3. Configure DynamoDB Tables

Create the following tables:
- CloudPulseMetrics (Primary Key: id)
- CloudPulseAlerts (Primary Key: id)
- CloudPulseInstances (Primary Key: id)

Enable DynamoDB Streams on all tables with "New and old images" view type.

### 4. Set Environment Variables

Update `backend/.env`:
```env
# Vultr
VULTR_API_KEY=your-key
VULTR_INSTANCE_ID=your-instance-id

# Snowflake
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-user
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=your-warehouse
SNOWFLAKE_DATABASE=NEPHOS
SNOWFLAKE_SCHEMA=PUBLIC

# AWS
REGION=us-east-2
DYNAMODB_TABLE_NAME=CloudPulseMetrics
DYNAMODB_TABLE_ALERTS=CloudPulseAlerts
DYNAMODB_TABLE_INSTANCES=CloudPulseInstances
```

### 5. Deploy Frontend

```bash
cd client
npm install
npm run build
npm run dev  # or deploy to Vercel/AWS
```

Update `client/app/lib/config.ts` with your API endpoint.

## AI Insights Examples

### Pattern Insight
```json
{
  "type": "pattern",
  "severity": "medium",
  "title": "Increasing Memory Usage Trend Detected",
  "description": "Memory usage has been steadily increasing by 2% per day over the last week across 3 instances. At this rate, instances may reach capacity in 15 days.",
  "recommendations": "Consider scaling up memory or investigating memory leaks in applications.",
  "confidenceScore": 0.85
}
```

### Anomaly Insight
```json
{
  "type": "anomaly",
  "severity": "high",
  "title": "CPU Spike on Instance xyz-123",
  "description": "CPU usage spiked to 95% at 14:23 UTC, which is 4.2 standard deviations above the 24-hour baseline of 35%.",
  "recommendations": "Investigate processes running at 14:23 UTC. Consider implementing auto-scaling rules.",
  "confidenceScore": 0.92
}
```

### Prediction Insight
```json
{
  "type": "prediction",
  "severity": "medium",
  "title": "Potential Disk Space Issue in 48 Hours",
  "description": "Based on current trends, instance abc-456 will reach 90% disk capacity within 48 hours.",
  "recommendations": "Clear old logs, expand disk size, or implement log rotation policies.",
  "confidenceScore": 0.78
}
```

## Monitoring & Debugging

### Check Snowflake AI Tasks
```sql
-- View task history
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
WHERE TASK_NAME LIKE 'AI_%'
ORDER BY SCHEDULED_TIME DESC;

-- View recent insights
SELECT * FROM AI_INSIGHTS
ORDER BY CREATED_AT DESC
LIMIT 10;
```

### Test AI Procedures Manually
```sql
-- Run pattern analysis
CALL RUN_AI_PATTERN_ANALYSIS();

-- Run anomaly detection
CALL RUN_AI_ANOMALY_DETECTION();

-- Run predictions
CALL RUN_AI_PREDICTIVE_ANALYSIS();

-- Generate summary
CALL GENERATE_AI_SUMMARY_REPORT();
```

### View Lambda Logs
```bash
# View ingestion logs
aws logs tail /aws/lambda/vultr-metrics-ingestion --follow

# View ETL logs
aws logs tail /aws/lambda/dynamodb-to-snowflake --follow

# View insights API logs
aws logs tail /aws/lambda/insights-api --follow
```

## Cost Optimization

### Snowflake
- Use appropriate warehouse size (XSMALL for dev, SMALL for prod)
- Set auto-suspend to 5 minutes
- Schedule tasks during off-peak hours if possible
- Monitor Cortex AI usage (billed per token)

### AWS
- Use DynamoDB on-demand pricing for variable workloads
- Set appropriate Lambda memory (512MB-1024MB typical)
- Use Lambda provisioned concurrency only if needed
- Enable CloudWatch Logs retention policies

## Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager for credentials
   - Never commit `.env` files
   - Rotate credentials regularly

2. **Network Security**
   - Use VPC endpoints for DynamoDB/Snowflake
   - Enable encryption at rest and in transit
   - Implement IAM roles with least privilege

3. **Data Privacy**
   - Mask sensitive data in metrics
   - Implement data retention policies
   - Comply with GDPR/HIPAA if applicable

## Troubleshooting

### No Insights Generated
1. Check if metrics are flowing: `SELECT COUNT(*) FROM METRICS WHERE TIMESTAMP > DATEADD(hour, -1, CURRENT_TIMESTAMP())`
2. Check task status: `SHOW TASKS`
3. Manually run AI procedures to test
4. Check Snowflake query history for errors

### High Latency
1. Optimize Snowflake queries with clustering keys
2. Use materialized views for frequent queries
3. Increase Lambda memory allocation
4. Enable DynamoDB auto-scaling

### Incorrect Insights
1. Verify metric data quality
2. Adjust AI prompt engineering in procedures
3. Fine-tune threshold values
4. Increase confidence score filtering

## Future Enhancements

- [ ] Multi-cloud support (AWS, GCP, Azure)
- [ ] Custom alert rules using AI insights
- [ ] Automated remediation actions
- [ ] Historical trend analysis with time-series forecasting
- [ ] Integration with PagerDuty/Slack for alerts
- [ ] Cost optimization recommendations
- [ ] Security vulnerability detection

## Support

For issues or questions:
- Check the [Snowflake Cortex documentation](https://docs.snowflake.com/en/user-guide/snowflake-cortex)
- Review AWS Lambda logs
- Contact the development team

---

**Built with:** Vultr + AWS Lambda + DynamoDB + Snowflake Cortex AI + Next.js
