# Nephos Quick Start Guide

Get your Nephos cloud monitoring system up and running in 15 minutes!

## 🚀 Overview

Nephos monitors your Vultr instances and uses Snowflake Cortex AI to provide intelligent insights about your cloud infrastructure health.

## 📋 Prerequisites

- AWS Account with CLI configured
- Vultr API Key
- Snowflake account
- Node.js 18+
- AWS SAM CLI

## ⚡ Quick Deploy (5 Steps)

### 1. Clone & Configure

```bash
cd backend

# Copy and edit parameters file
cp parameters.json parameters-dev.json

# Update with your credentials:
# - VultrApiKey
# - SnowflakePassword
```

### 2. Deploy Backend

```bash
# Make deploy script executable
chmod +x deploy.sh

# Deploy everything to AWS
./deploy.sh dev parameters-dev.json
```

This creates:
- ✅ 6 Lambda functions
- ✅ 3 DynamoDB tables
- ✅ API Gateway endpoints
- ✅ SNS alert topic
- ✅ CloudWatch scheduled events

### 3. Setup Snowflake

```bash
cd ..
snowsql -a BCGIVNI-QN18742 -u BENCHING4755 -f backend/snowflake/setup.sql
```

This creates:
- ✅ Database tables
- ✅ AI-powered stored procedures
- ✅ Scheduled tasks for analysis

### 4. Configure Vultr Monitoring

On your Vultr instance:

```bash
# Copy monitoring script
scp backend/scripts/vultr-monitor.js user@your-vultr-instance:/opt/nephos/

# SSH into instance
ssh user@your-vultr-instance

# Configure
export INGESTION_ENDPOINT="<YOUR_INGESTION_URL_FROM_STEP_2>"
export VULTR_INSTANCE_ID="17b0f286-a9e8-4a4d-a1db-54b74cb97cc3"
export INSTANCE_NAME="My Vultr Server"
export VULTR_REGION="ewr"

# Test it
node /opt/nephos/vultr-monitor.js

# Setup cron (every minute)
crontab -e
# Add: * * * * * /usr/bin/node /opt/nephos/vultr-monitor.js >> /var/log/nephos.log 2>&1
```

### 5. Launch Frontend

```bash
cd client

# Install dependencies
npm install

# Configure
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=<YOUR_API_URL_FROM_STEP_2>
NEXT_PUBLIC_ENVIRONMENT=production
EOF

# Run locally
npm run dev

# Or deploy to Vercel
vercel deploy
```

## 🎉 You're Done!

Visit http://localhost:3000 and you should see:

- ✅ Dashboard with instance metrics
- ✅ Active alerts
- ✅ AI Insights tab with predictions
- ✅ Real-time updates every 30 seconds

## 📊 What You Get

### Sentinel Function
- Monitors instances every 2 minutes
- Performs HTTP health checks
- Generates alerts for failures
- Sends SNS notifications

### Data Pipeline
```
Vultr → Lambda → DynamoDB → Snowflake → AI Analysis → Frontend
```

### AI Insights
- **Pattern Detection** - Identifies trends over 24 hours
- **Anomaly Detection** - Finds unusual spikes (every 15 min)
- **Predictions** - Forecasts issues in next 48 hours

## 🔧 Common Tasks

### View Logs
```bash
# Sentinel logs
sam logs -n SentinelFunction --stack-name nephos-backend-dev --tail

# All Lambda logs
aws logs tail --follow --region us-east-2
```

### Test Ingestion
```bash
curl -X POST <INGESTION_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d '{
    "instanceId": "test-123",
    "instanceName": "Test Server",
    "region": "ewr",
    "metrics": [{
      "name": "cpu_usage",
      "value": 45.2,
      "unit": "percent"
    }],
    "health": {"status": "healthy"}
  }'
```

### Check AI Insights
```bash
# Get all insights
curl <API_URL>/insights

# Get AI summary
curl <API_URL>/insights/summary

# Get predictions
curl <API_URL>/insights/predictions
```

### Subscribe to Alerts
```bash
aws sns subscribe \
  --topic-arn <SNS_TOPIC_ARN> \
  --protocol email \
  --notification-endpoint your@email.com \
  --region us-east-2
```

## 🐛 Troubleshooting

### No metrics showing?
1. Check Vultr script is running: `tail -f /var/log/nephos.log`
2. Verify ingestion endpoint is correct
3. Check Lambda logs for errors

### No AI insights?
1. Ensure Snowflake tasks are enabled
2. Wait 15-60 minutes for initial analysis
3. Verify ETL Lambda is syncing data

### Dashboard 404 errors?
Frontend is using mock data by default. Update `NEXT_PUBLIC_API_URL` in `.env.local`.

## 📚 Next Steps

- [Read full deployment guide](backend/DEPLOYMENT.md)
- [Understand the brain layer](BRAIN_LAYER.md)
- [Configure alerts and thresholds](backend/functions/sentinel/README.md)
- [Deploy to production](backend/DEPLOYMENT.md#deploy-to-production)

## 💰 Cost Estimate

**Development:** ~$11-30/month
**Production:** ~$50-150/month (depending on traffic)

Most services have generous free tiers!

## 🆘 Support

- Check CloudWatch logs first
- Review [DEPLOYMENT.md](backend/DEPLOYMENT.md) troubleshooting section
- Check Snowflake query history
- Open GitHub issue

---

**Happy Monitoring! 🎯**
