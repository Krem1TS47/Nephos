# Nephos Backend Deployment Guide

This guide walks you through deploying the complete Nephos backend infrastructure to AWS using Infrastructure as Code (IaC) with AWS SAM.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Nephos Backend                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Sentinel   │    │   Vultr      │    │     ETL      │  │
│  │   Lambda     │◄───┤   Ingestion  │◄───┤    Lambda    │  │
│  │ (Scheduled)  │    │    Lambda    │    │  (Streams)   │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                    │          │
│         └───────────────────┼────────────────────┘          │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │    DynamoDB    │                       │
│                    │   (3 Tables)   │                       │
│                    └───────┬────────┘                       │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │   Snowflake    │                       │
│                    │   Cortex AI    │                       │
│                    └───────┬────────┘                       │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │  Insights API  │                       │
│                    │   Analytics    │                       │
│                    │   Alerts API   │                       │
│                    └────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Install Required Tools

#### AWS SAM CLI
```bash
# macOS
brew install aws-sam-cli

# Windows (with Chocolatey)
choco install aws-sam-cli

# Linux
pip install aws-sam-cli

# Verify installation
sam --version
```

#### AWS CLI
```bash
# macOS
brew install awscli

# Windows
choco install awscli

# Linux
pip install awscli

# Configure AWS credentials
aws configure
```

#### Node.js 18+
```bash
# Verify installation
node --version  # Should be 18.x or higher
npm --version
```

#### jq (for deploy script)
```bash
# macOS
brew install jq

# Windows
choco install jq

# Linux
sudo apt-get install jq
```

### 2. Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: us-east-2
# Default output format: json
```

### 3. Prepare Configuration

#### Update `parameters.json`

Replace placeholder values with your actual credentials:

```json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "VultrApiKey",
    "ParameterValue": "YOUR_ACTUAL_VULTR_API_KEY"
  },
  {
    "ParameterKey": "SnowflakePassword",
    "ParameterValue": "YOUR_ACTUAL_SNOWFLAKE_PASSWORD"
  }
]
```

**Important:** Never commit this file with real credentials! Add to `.gitignore`.

## Deployment Steps

### Option 1: Automated Deployment (Recommended)

```bash
cd backend

# Make deploy script executable
chmod +x deploy.sh

# Deploy to dev environment
./deploy.sh dev parameters.json

# Or deploy to production
./deploy.sh prod parameters-prod.json
```

The script will:
1. ✅ Install all Lambda function dependencies
2. ✅ Validate the SAM template
3. ✅ Build the application
4. ✅ Deploy to AWS
5. ✅ Display API endpoints

### Option 2: Manual Deployment

```bash
cd backend

# Step 1: Install dependencies for all functions
cd functions/sentinel && npm install && cd ../..
cd functions/ingest/vultr-metrics && npm install && cd ../../..
cd functions/etl/dynamodb-to-snowflake && npm install && cd ../../..
cd functions/api/insights && npm install && cd ../../..
cd functions/api/analytics && npm install && cd ../../..
cd functions/api/alerts && npm install && cd ../../..

# Step 2: Validate template
sam validate --lint

# Step 3: Build
sam build

# Step 4: Deploy (guided - first time)
sam deploy --guided

# Or deploy with parameters file
sam deploy \
  --stack-name nephos-backend-dev \
  --parameter-overrides file://parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-2 \
  --resolve-s3
```

## Post-Deployment Configuration

### 1. Get API Endpoints

```bash
aws cloudformation describe-stacks \
  --stack-name nephos-backend-dev \
  --query 'Stacks[0].Outputs' \
  --region us-east-2
```

### 2. Configure Vultr Monitoring Script

On your Vultr instance:

```bash
# Set the ingestion endpoint
export INGESTION_ENDPOINT="https://xxxxxx.execute-api.us-east-2.amazonaws.com/ingest"
export VULTR_INSTANCE_ID="17b0f286-a9e8-4a4d-a1db-54b74cb97cc3"
export INSTANCE_NAME="Vultr Production Server"
export VULTR_REGION="ewr"

# Test the monitor
node /path/to/vultr-monitor.js

# Set up cron job for continuous monitoring (every minute)
crontab -e
# Add: * * * * * /usr/bin/node /path/to/vultr-monitor.js >> /var/log/nephos-monitor.log 2>&1
```

### 3. Configure Frontend

Update `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://xxxxxx.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### 4. Subscribe to SNS Alerts (Optional)

```bash
# Get SNS Topic ARN
SNS_TOPIC_ARN=$(aws cloudformation describe-stacks \
  --stack-name nephos-backend-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`AlertsTopicArn`].OutputValue' \
  --output text \
  --region us-east-2)

# Subscribe via email
aws sns subscribe \
  --topic-arn $SNS_TOPIC_ARN \
  --protocol email \
  --notification-endpoint your@email.com \
  --region us-east-2

# Confirm subscription via email link
```

### 5. Setup Snowflake

```bash
# Run the setup script
snowsql -a BCGIVNI-QN18742 -u BENCHING4755 -f snowflake/setup.sql

# Manually enable scheduled tasks (after testing)
snowsql -a BCGIVNI-QN18742 -u BENCHING4755 -q "
  ALTER TASK AI_PATTERN_ANALYSIS_TASK RESUME;
  ALTER TASK AI_ANOMALY_DETECTION_TASK RESUME;
  ALTER TASK AI_PREDICTIVE_ANALYSIS_TASK RESUME;
"
```

## Infrastructure Components

### Lambda Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| **Sentinel** | Schedule (2 min) | Active health monitoring & Vultr API checks |
| **Vultr Ingestion** | HTTP POST | Receives metrics from Vultr instances |
| **ETL** | DynamoDB Streams + Schedule (1 hr) | Syncs data to Snowflake |
| **Insights API** | HTTP GET | Exposes AI insights from Snowflake |
| **Analytics API** | HTTP GET | Dashboard data and analytics |
| **Alerts API** | HTTP GET/PUT | Alert management |

### DynamoDB Tables

| Table | Purpose | Indexes |
|-------|---------|---------|
| **CloudPulseMetrics** | Time-series metrics | InstanceIdIndex (instanceId, timestamp) |
| **CloudPulseAlerts** | Alert records | InstanceIdIndex (instanceId, createdAt) |
| **CloudPulseInstances** | Instance metadata | None |

All tables have:
- ✅ Pay-per-request billing
- ✅ DynamoDB Streams enabled
- ✅ Point-in-time recovery (optional)

### API Endpoints

After deployment, you'll have:

- `POST /ingest` - Vultr metrics ingestion
- `GET /insights` - All AI insights
- `GET /insights/summary` - AI summary report
- `GET /insights/patterns` - Pattern insights
- `GET /insights/anomalies` - Anomaly insights
- `GET /insights/predictions` - Predictive insights
- `GET /analytics/dashboard` - Dashboard data
- `GET /analytics` - Analytics data
- `GET /alerts` - List alerts
- `GET /alerts/{id}` - Get specific alert
- `PUT /alerts/{id}` - Update alert

## Monitoring & Debugging

### View Lambda Logs

```bash
# Sentinel function
sam logs -n SentinelFunction --stack-name nephos-backend-dev --tail

# ETL function
sam logs -n ETLFunction --stack-name nephos-backend-dev --tail

# Insights API
sam logs -n InsightsApiFunction --stack-name nephos-backend-dev --tail
```

### Check DynamoDB Tables

```bash
# List tables
aws dynamodb list-tables --region us-east-2

# Scan metrics table
aws dynamodb scan \
  --table-name CloudPulseMetrics-dev \
  --limit 10 \
  --region us-east-2
```

### Test APIs

```bash
# Get insights
curl https://xxxxxx.execute-api.us-east-2.amazonaws.com/insights

# Get dashboard
curl https://xxxxxx.execute-api.us-east-2.amazonaws.com/analytics/dashboard

# Test ingestion
curl -X POST https://xxxxxx.execute-api.us-east-2.amazonaws.com/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "test-instance",
    "instanceName": "Test Server",
    "region": "ewr",
    "metrics": [
      {
        "name": "cpu_usage",
        "value": 45.2,
        "unit": "percent",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    ],
    "health": {
      "status": "healthy",
      "lastCheck": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }
  }'
```

## Updating the Stack

### Update Lambda Code

```bash
# Make code changes
# Then redeploy
sam build
sam deploy
```

### Update Configuration

```bash
# Update parameters.json
# Then redeploy
sam deploy --parameter-overrides file://parameters.json
```

### Add New Lambda Function

1. Add function definition to `template.yaml`
2. Create function code in `functions/`
3. Run `sam build && sam deploy`

## Cleanup / Delete Stack

```bash
# Delete everything
aws cloudformation delete-stack \
  --stack-name nephos-backend-dev \
  --region us-east-2

# Note: This will delete:
# - All Lambda functions
# - DynamoDB tables (and all data!)
# - SNS topics
# - CloudWatch logs
# - API Gateway
```

**Warning:** This is irreversible! Back up data first.

## Cost Optimization

### Expected Monthly Costs (Dev Environment)

- **Lambda**: ~$5-10 (with free tier)
- **DynamoDB**: ~$1-5 (on-demand, low traffic)
- **API Gateway**: ~$3-7 (1M requests)
- **CloudWatch Logs**: ~$1-3
- **Data Transfer**: ~$1-5
- **Total**: ~$11-30/month

### Cost Reduction Tips

1. **Use Reserved Capacity** for DynamoDB in production
2. **Set Log Retention** to 7-14 days
3. **Use Provisioned Concurrency** only if needed
4. **Enable S3 lifecycle policies** for SAM artifacts
5. **Monitor with AWS Cost Explorer**

## Troubleshooting

### Deployment Fails

```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name nephos-backend-dev \
  --region us-east-2

# Validate template
sam validate --lint
```

### Lambda Timeout Issues

Increase timeout in `template.yaml`:
```yaml
Timeout: 60  # seconds
MemorySize: 1024  # MB
```

### DynamoDB Throttling

Switch to provisioned capacity or increase on-demand limits.

### Snowflake Connection Issues

Check environment variables:
```bash
aws lambda get-function-configuration \
  --function-name nephos-etl-dev \
  --region us-east-2 \
  --query 'Environment'
```

## Security Best Practices

1. **Use AWS Secrets Manager** for sensitive credentials
2. **Enable encryption at rest** for DynamoDB
3. **Use VPC** for Lambda functions (optional)
4. **Implement API Gateway authorizers** (API keys/Cognito)
5. **Enable CloudTrail** for audit logging
6. **Use IAM roles** with least privilege
7. **Rotate credentials** regularly

## Support

For issues:
- Check CloudFormation events
- Review CloudWatch logs
- Consult AWS SAM documentation
- Open GitHub issue

---

**Built with AWS SAM | Nephos Cloud Monitoring**
