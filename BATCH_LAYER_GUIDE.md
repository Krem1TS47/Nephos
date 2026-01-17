# Nephos Batch Layer (Brain Layer) - Complete Guide

The batch layer uses Snowflake and Snowflake Cortex AI to analyze historical data, detect patterns, identify anomalies, and make predictions that single data points can't reveal.

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                     SPEED LAYER                             │
│  Vultr → Lambda → DynamoDB → Frontend                      │
└────────┬───────────────────────────────────────────────────┘
         │
         │ DynamoDB Stream + Hourly Batch
         ▼
┌────────────────────────────────────────────────────────────┐
│                 ETL Lambda Function                         │
│  Syncs DynamoDB → Snowflake                                │
│  Triggers AI Analysis                                       │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│                    SNOWFLAKE                                │
│  ┌──────────────────────────────────────────────────┐     │
│  │  Tables: METRICS, ALERTS, INSTANCES              │     │
│  │  Views: METRICS_HOURLY, METRICS_DAILY            │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────┐     │
│  │         SNOWFLAKE CORTEX AI                      │     │
│  │  ┌────────────────────────────────────────┐     │     │
│  │  │  1. Pattern Analysis                   │     │     │
│  │  │     - Identifies trends                │     │     │
│  │  │     - Finds correlations              │     │     │
│  │  │     - Detects recurring issues        │     │     │
│  │  └────────────────────────────────────────┘     │     │
│  │  ┌────────────────────────────────────────┐     │     │
│  │  │  2. Anomaly Detection                  │     │     │
│  │  │     - Statistical outliers (3σ)       │     │     │
│  │  │     - AI-powered analysis             │     │     │
│  │  │     - Real-time alerts                │     │     │
│  │  └────────────────────────────────────────┘     │     │
│  │  ┌────────────────────────────────────────┐     │     │
│  │  │  3. Predictive Analysis                │     │     │
│  │  │     - Trend forecasting               │     │     │
│  │  │     - Failure prediction              │     │     │
│  │  │     - Capacity planning               │     │     │
│  │  └────────────────────────────────────────┘     │     │
│  └──────────────────────────────────────────────────┘     │
│                                                             │
│  AI_INSIGHTS Table (stores results)                        │
└────────┬───────────────────────────────────────────────────┘
         │
         │ API Queries
         ▼
┌────────────────────────────────────────────────────────────┐
│           Insights Lambda Function                          │
│  GET /insights, /insights/summary, etc.                    │
└────────┬───────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│              Frontend Dashboard                             │
│  Displays AI-generated insights                            │
└────────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Pattern Analysis**
- Identifies trends in metrics over 24-hour windows
- Finds correlations between different metrics
- Detects recurring issues
- Uses AI to provide actionable insights

**Example Output**:
> "CPU usage shows a consistent spike every day at 2 PM, correlating with increased memory usage. This suggests a scheduled job or batch process that may need optimization."

### 2. **Anomaly Detection**
- Statistical analysis (3 standard deviations)
- AI-powered context understanding
- Automatic alert generation
- Root cause suggestions

**Example Output**:
> "Server 'prod-web-01' experienced memory usage 4.2σ above normal at 3:45 AM. This coincided with a deployment. Recommendation: Review deployment process and add pre-deployment health checks."

### 3. **Predictive Analysis**
- Trend-based forecasting
- Capacity planning
- Failure prediction
- Proactive recommendations

**Example Output**:
> "Based on current growth trends, disk usage on 'db-primary' will reach 90% in 72 hours. Recommendation: Schedule disk expansion or implement data archiving strategy."

## Setup Instructions

### Step 1: Set Up Snowflake

1. **Run setup script**:
```bash
chmod +x scripts/setup-snowflake.sh
./scripts/setup-snowflake.sh
```

2. **Execute generated SQL** in Snowflake console

3. **Run batch layer setup**:
```sql
-- In Snowflake console
USE DATABASE NEPHOS;
USE SCHEMA PUBLIC;

-- Copy and run the entire backend/snowflake/setup.sql file
```

This creates:
- Tables (METRICS, ALERTS, INSTANCES, AI_INSIGHTS)
- Analytical views (METRICS_HOURLY, METRICS_DAILY, etc.)
- AI procedures (Pattern Analysis, Anomaly Detection, Predictions)
- Scheduled tasks (hourly, every 15 min, every 6 hours)

### Step 2: Deploy ETL Lambda

The ETL function is already configured in `serverless.yml`:

```bash
cd backend

# Install ETL dependencies
cd functions/etl/dynamodb-to-snowflake
npm install snowflake-sdk
cd ../../..

# Deploy
./scripts/deploy.sh dev us-east-1
```

### Step 3: Enable Snowflake Cortex

**Ensure Cortex is enabled** in your Snowflake account:

```sql
-- Check if Cortex is available
SELECT SNOWFLAKE.CORTEX.COMPLETE(
  'mistral-large',
  'Hello, test message',
  OBJECT_CONSTRUCT('temperature', 0.3, 'max_tokens', 50)
);
```

If not enabled, contact Snowflake support to enable Cortex AI.

### Step 4: Enable Scheduled Tasks

```sql
-- Enable AI analysis tasks
ALTER TASK AI_PATTERN_ANALYSIS_TASK RESUME;
ALTER TASK AI_ANOMALY_DETECTION_TASK RESUME;
ALTER TASK AI_PREDICTIVE_ANALYSIS_TASK RESUME;

-- Verify tasks are running
SHOW TASKS;
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY()) ORDER BY SCHEDULED_TIME DESC LIMIT 10;
```

## How It Works

### ETL Process

**Triggered by**:
1. **DynamoDB Stream** - Real-time sync when data changes
2. **Hourly Schedule** - Batch sync every hour
3. **Manual Invocation** - For testing or ad-hoc syncs

**Process**:
```javascript
1. Scan DynamoDB tables (Metrics, Alerts, Instances)
2. Transform data for Snowflake
3. MERGE into Snowflake tables (upsert)
4. Trigger AI analysis procedures
5. Return sync statistics
```

### AI Analysis Procedures

#### 1. Pattern Analysis (Hourly)
```sql
CALL RUN_AI_PATTERN_ANALYSIS();
```

- Aggregates last 24 hours of metrics
- Uses Cortex AI (Mistral-Large model)
- Identifies patterns and trends
- Stores insights in AI_INSIGHTS table
- Assigns severity (low, medium, high)

#### 2. Anomaly Detection (Every 15 min)
```sql
CALL RUN_AI_ANOMALY_DETECTION();
```

- Calculates statistical baselines (7-day average)
- Detects outliers (Z-score > 3)
- Uses AI to explain anomalies
- Suggests remediation steps
- Creates high-severity insights

#### 3. Predictive Analysis (Every 6 hours)
```sql
CALL RUN_AI_PREDICTIVE_ANALYSIS();
```

- Analyzes trends using linear regression
- Forecasts 24-48 hour issues
- Recommends preventive actions
- Medium severity by default

### Insights Retrieval

**Frontend calls**:
```typescript
// Get all insights
const { insights } = useInsights();

// Get AI summary
const { summary } = useInsightsSummary();

// Get specific types
const { insights: patterns } = usePatterns();
const { insights: anomalies } = useAnomalies();
const { insights: predictions } = usePredictions();
```

**API Endpoints**:
- `GET /insights` - All insights
- `GET /insights/summary` - AI-generated summary
- `GET /insights/patterns` - Pattern insights
- `GET /insights/anomalies` - Anomaly insights
- `GET /insights/predictions` - Predictive insights

## Testing the Batch Layer

### Test 1: Verify ETL Sync

```bash
# Manually invoke ETL
aws lambda invoke \
  --function-name nephos-backend-dev-dynamoDbToSnowflake \
  --region us-east-1 \
  response.json

cat response.json
```

**Expected Output**:
```json
{
  "statusCode": 200,
  "message": "Batch sync successful",
  "metrics": 150,
  "alerts": 5,
  "instances": 3
}
```

**Verify in Snowflake**:
```sql
SELECT COUNT(*) FROM METRICS;
SELECT COUNT(*) FROM ALERTS;
SELECT COUNT(*) FROM INSTANCES;
```

### Test 2: Manual AI Analysis

```sql
-- Run pattern analysis manually
CALL RUN_AI_PATTERN_ANALYSIS();

-- Check results
SELECT * FROM AI_INSIGHTS
WHERE INSIGHT_TYPE = 'pattern'
ORDER BY CREATED_AT DESC
LIMIT 5;
```

### Test 3: Create Test Anomaly

**On Vultr server**, create CPU spike:
```bash
stress --cpu 8 --timeout 120s
```

**Wait 15-20 minutes**, then check:
```sql
-- Check for anomaly detection
SELECT * FROM AI_INSIGHTS
WHERE INSIGHT_TYPE = 'anomaly'
ORDER BY CREATED_AT DESC
LIMIT 1;
```

### Test 4: Frontend Integration

1. **Check insights endpoint**:
```bash
curl https://your-api-url/insights/summary
```

2. **View in dashboard**: (Create insights page - see below)

## Frontend Integration

### Create Insights Page

```bash
mkdir -p client/app/insights
```

Create `client/app/insights/page.tsx`:

```typescript
'use client';

import { useInsightsSummary, useInsights } from '@/app/lib/hooks/useInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';

export default function InsightsPage() {
  const { summary, loading: summaryLoading } = useInsightsSummary({
    refreshInterval: 300000, // 5 minutes
  });

  const { insights, loading: insightsLoading } = useInsights({
    refreshInterval: 300000,
  });

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-4xl font-bold">AI Insights</h1>
          <p className="text-muted-foreground">
            AI-powered pattern detection, anomaly analysis, and predictions
          </p>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{summary.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Insights List */}
      <div className="grid gap-4">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {insight.type === 'pattern' && <TrendingUp className="h-4 w-4" />}
                  {insight.type === 'anomaly' && <AlertTriangle className="h-4 w-4" />}
                  {insight.type === 'prediction' && <Brain className="h-4 w-4" />}
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Badge variant={insight.severity === 'high' ? 'destructive' : 'default'}>
                    {insight.severity}
                  </Badge>
                  <Badge variant="outline">{insight.type}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{insight.description}</p>
              {insight.recommendations && (
                <div className="bg-muted p-3 rounded">
                  <p className="text-sm font-medium">Recommendations:</p>
                  <p className="text-sm text-muted-foreground">{insight.recommendations}</p>
                </div>
              )}
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>Confidence: {(insight.confidenceScore * 100).toFixed(0)}%</span>
                <span>•</span>
                <span>Affected: {insight.affectedInstances.length} instances</span>
                <span>•</span>
                <span>{new Date(insight.createdAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Update Navbar

Add Insights link to `client/app/components/navbar.tsx`:

```typescript
const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Instances', href: '/instances', icon: Server },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Metrics', href: '/metrics', icon: Activity },
  { name: 'AI Insights', href: '/insights', icon: Brain }, // Add this
];
```

## Data Flow Example

**Scenario**: CPU usage spike detected

1. **Speed Layer** (Real-time):
   - Vultr agent detects CPU > 80%
   - Sends metric to Lambda → DynamoDB
   - Frontend shows in metrics page

2. **Batch Layer** (Analysis):
   - DynamoDB stream triggers ETL Lambda
   - ETL syncs to Snowflake
   - After hourly batch, AI analysis runs:
     ```sql
     -- Anomaly detection finds spike
     -- Calculates Z-score = 4.5 (way above 3)
     -- AI analyzes context
     ```

3. **AI Insight Generated**:
   ```json
   {
     "type": "anomaly",
     "severity": "high",
     "title": "Critical CPU Spike Detected",
     "description": "Server 'prod-web-01' experienced CPU usage 4.5σ above baseline...",
     "recommendations": "1. Check running processes 2. Review recent deployments 3. Scale horizontally if sustained"
   }
   ```

4. **Frontend Display**:
   - Insights page shows new AI insight
   - User sees AI-generated recommendations
   - Can take action based on insights

## Cost Optimization

### Snowflake Credits
- **Warehouse size**: XSMALL (1 credit/hour)
- **Auto-suspend**: 60 seconds
- **Typical usage**: ~10-20 minutes/day
- **Estimated cost**: $2-5/month

### Cortex AI Costs
- Charged per token
- Mistral-Large: ~$0.002 per 1K tokens
- Typical query: 500-1000 tokens
- **Estimated cost**: $1-3/month

### Total Batch Layer Cost
**~$5-10/month** for dev environment

## Troubleshooting

### Issue: ETL not syncing

**Check**:
```bash
# View ETL logs
aws logs tail /aws/lambda/nephos-backend-dev-dynamoDbToSnowflake --follow
```

**Common fixes**:
1. Verify Snowflake credentials in `.env`
2. Check DynamoDB stream is enabled
3. Verify Lambda has Snowflake SDK installed

### Issue: AI procedures failing

**Check in Snowflake**:
```sql
-- Check task history
SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY())
WHERE NAME LIKE 'AI_%'
ORDER BY SCHEDULED_TIME DESC;
```

**Common fixes**:
1. Verify Cortex is enabled
2. Check warehouse is running
3. Ensure enough data exists (need 100+ metrics)

### Issue: No insights appearing

**Debug**:
```sql
-- Check if insights are being created
SELECT COUNT(*), INSIGHT_TYPE
FROM AI_INSIGHTS
GROUP BY INSIGHT_TYPE;

-- Check expiration dates
SELECT * FROM AI_INSIGHTS
WHERE EXPIRES_AT < CURRENT_TIMESTAMP();
```

**Fix**: Insights expire after 1-7 days. Run analysis manually:
```sql
CALL RUN_AI_PATTERN_ANALYSIS();
CALL RUN_AI_ANOMALY_DETECTION();
```

## Best Practices

1. **Start with manual analysis** before enabling scheduled tasks
2. **Monitor Snowflake costs** in first week
3. **Adjust task frequency** based on data volume
4. **Review AI insights regularly** to tune thresholds
5. **Archive old insights** to control storage

## Next Steps

1. ✅ Set up Snowflake
2. ✅ Deploy ETL Lambda
3. ✅ Run manual test sync
4. ✅ Test AI procedures manually
5. ⏳ Enable scheduled tasks
6. ⏳ Create insights frontend page
7. ⏳ Monitor and tune

---

**Your batch layer is now ready to provide AI-powered insights into your infrastructure!** 🧠✨

The combination of speed layer (real-time) + batch layer (AI analysis) gives you both immediate alerts AND intelligent pattern detection!

