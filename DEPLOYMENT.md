# Nephos Deployment Guide

This guide covers deploying the Nephos cloud monitoring dashboard to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Initial Setup](#initial-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Environment Variables](#environment-variables)
8. [Monitoring & Troubleshooting](#monitoring--troubleshooting)
9. [Cleanup](#cleanup)

---

## Prerequisites

### Required Tools

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **AWS CLI**: v2.x or higher
- **Serverless Framework**: v4.x
- **Git**: For version control

### Required Accounts

- **AWS Account**: With appropriate permissions for Lambda, DynamoDB, API Gateway, IAM, CloudFormation
- **Snowflake Account**: For data warehousing
- **Vercel Account** (optional): For frontend hosting
- **GitHub Account**: For CI/CD

### AWS Permissions Required

Your AWS IAM user/role needs the following permissions:

- Lambda: Create, update, delete functions
- DynamoDB: Create, update, delete tables
- API Gateway: Create, update, delete APIs
- IAM: Create, update, delete roles and policies
- CloudFormation: Create, update, delete stacks
- S3: Create buckets (for Serverless deployment artifacts)
- CloudWatch: Create log groups and write logs

---

## Architecture Overview

### Backend Architecture

```
┌─────────────────┐
│   API Gateway   │
│  (HTTP API)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        Lambda Functions             │
│  ┌─────────────────────────────┐   │
│  │ API Functions               │   │
│  │  - /metrics                 │   │
│  │  - /alerts                  │   │
│  │  - /analytics               │   │
│  │  - /instances               │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Sentinel (Health Checker)   │   │
│  │  - Scheduled (every 5 min)  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ETL (DynamoDB → Snowflake)  │   │
│  │  - Stream-based             │   │
│  │  - Scheduled (hourly)       │   │
│  └─────────────────────────────┘   │
└──────────┬──────────────────────────┘
           │
           ▼
    ┌──────────────┐       ┌─────────────┐
    │   DynamoDB   │──────▶│  Snowflake  │
    │   Tables     │       │ Data Warehouse│
    └──────────────┘       └─────────────┘
```

### Infrastructure Components

- **AWS Lambda**: Serverless compute for API and background jobs
- **API Gateway**: HTTP API for client requests
- **DynamoDB**: NoSQL database for real-time data (metrics, alerts, instances)
- **Snowflake**: Data warehouse for analytics and reporting
- **CloudWatch**: Logging and monitoring
- **EventBridge**: Scheduled triggers for Sentinel function

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Nephos
```

### 2. Configure AWS Credentials

Run the AWS setup script:

```bash
chmod +x scripts/setup-aws.sh
./scripts/setup-aws.sh
```

Or manually configure:

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter default region (e.g., us-east-1)
# Enter output format (json)
```

Verify AWS configuration:

```bash
aws sts get-caller-identity
```

### 3. Configure Snowflake

Run the Snowflake setup script:

```bash
chmod +x scripts/setup-snowflake.sh
./scripts/setup-snowflake.sh
```

This will generate SQL commands to:
- Create Snowflake role, user, and warehouse
- Create database and schema
- Create tables (metrics, alerts, instances, health_checks)
- Create analytics views
- Grant necessary permissions

Execute the generated SQL in your Snowflake console.

### 4. Set Up Environment Variables

#### Backend Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your actual values:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=default

# Deployment Stage
STAGE=dev

# Snowflake Configuration
SNOWFLAKE_ACCOUNT=xy12345.us-east-1
SNOWFLAKE_USERNAME=nephos_user
SNOWFLAKE_PASSWORD=your-secure-password
SNOWFLAKE_DATABASE=NEPHOS
SNOWFLAKE_WAREHOUSE=NEPHOS_WH
SNOWFLAKE_SCHEMA=PUBLIC
```

#### Frontend Environment Variables

```bash
cd client
cp .env.example .env.local
```

Edit `client/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_ENVIRONMENT=production
```

---

## Backend Deployment

### Manual Deployment

#### Install Dependencies

```bash
cd backend
npm install

# Install Serverless Framework globally
npm install -g serverless@4
```

#### Deploy to AWS

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Deploy to dev environment
./scripts/deploy.sh dev us-east-1

# Deploy to production
./scripts/deploy.sh prod us-east-1
```

#### Alternative: Direct Serverless Command

```bash
serverless deploy --stage dev --region us-east-1 --verbose
```

### What Gets Deployed

The deployment creates:

1. **Lambda Functions**:
   - `metricsApi` - Metrics collection and retrieval
   - `alertsApi` - Alert management
   - `analyticsApi` - Analytics data
   - `instancesApi` - Instance management
   - `sentinel` - Health monitoring (runs every 5 minutes)
   - `dynamoDbToSnowflake` - ETL pipeline

2. **DynamoDB Tables**:
   - `nephos-metrics-{stage}` - Metrics data
   - `nephos-alerts-{stage}` - Alert records
   - `nephos-instances-{stage}` - Monitored instances

3. **API Gateway**:
   - HTTP API with routes for all endpoints

4. **IAM Roles**:
   - Lambda execution role with DynamoDB and CloudWatch permissions

5. **CloudWatch Resources**:
   - Log groups for each Lambda function
   - EventBridge rules for scheduled functions

### Verify Deployment

```bash
# Get deployment info
serverless info --stage dev --region us-east-1

# Test an endpoint
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/metrics

# View logs
serverless logs -f metricsApi --stage dev --tail
```

---

## Frontend Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**:

```bash
npm install -g vercel
```

2. **Deploy**:

```bash
cd client
vercel
```

3. **Set Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_API_URL` - Your API Gateway endpoint
   - `NEXT_PUBLIC_ENVIRONMENT` - production

4. **Deploy to Production**:

```bash
vercel --prod
```

### Alternative: AWS Amplify

1. Connect your GitHub repository to AWS Amplify
2. Set build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Configure environment variables
4. Deploy

---

## CI/CD Pipeline

### GitHub Actions Setup

The repository includes three GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on every PR and push
   - Lints and tests backend and frontend
   - Validates Serverless configuration
   - Runs security scans

2. **Backend Deployment** (`.github/workflows/deploy-backend.yml`)
   - Deploys backend on push to main/develop
   - Supports manual deployment with stage selection

3. **Frontend Deployment** (`.github/workflows/deploy-frontend.yml`)
   - Deploys frontend to Vercel
   - Runs on push to main/develop

### Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

#### AWS Secrets
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (default: us-east-1)

#### Snowflake Secrets
- `SNOWFLAKE_ACCOUNT` - Snowflake account identifier
- `SNOWFLAKE_USERNAME` - Snowflake username
- `SNOWFLAKE_PASSWORD` - Snowflake password
- `SNOWFLAKE_DATABASE` - Database name
- `SNOWFLAKE_WAREHOUSE` - Warehouse name
- `SNOWFLAKE_SCHEMA` - Schema name

#### Vercel Secrets (for frontend)
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `NEXT_PUBLIC_API_URL` - API Gateway endpoint

### Triggering Deployments

**Automatic Deployment**:
```bash
git add .
git commit -m "Your changes"
git push origin main  # Deploys to production
git push origin develop  # Deploys to dev
```

**Manual Deployment**:
- Go to Actions tab in GitHub
- Select "Deploy Backend" or "Deploy Frontend"
- Click "Run workflow"
- Choose stage/environment

---

## Environment Variables

### Backend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `AWS_REGION` | AWS region | Yes | `us-east-1` |
| `STAGE` | Deployment stage | Yes | `dev`, `staging`, `prod` |
| `SNOWFLAKE_ACCOUNT` | Snowflake account ID | Yes | `xy12345.us-east-1` |
| `SNOWFLAKE_USERNAME` | Snowflake user | Yes | `nephos_user` |
| `SNOWFLAKE_PASSWORD` | Snowflake password | Yes | `********` |
| `SNOWFLAKE_DATABASE` | Database name | Yes | `NEPHOS` |
| `SNOWFLAKE_WAREHOUSE` | Warehouse name | Yes | `NEPHOS_WH` |
| `SNOWFLAKE_SCHEMA` | Schema name | Yes | `PUBLIC` |
| `LOG_LEVEL` | Logging level | No | `info`, `debug`, `error` |

### Frontend Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | `https://api-id.execute-api.us-east-1.amazonaws.com` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment name | No | `production`, `development` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics | No | `true` |

---

## Monitoring & Troubleshooting

### Viewing Logs

**CloudWatch Logs**:
```bash
# Tail logs for a specific function
serverless logs -f metricsApi --stage dev --tail

# View logs from last hour
serverless logs -f sentinel --stage dev --startTime 1h
```

**AWS Console**:
- Navigate to CloudWatch → Log groups
- Find `/aws/lambda/nephos-backend-{stage}-{functionName}`

### Common Issues

#### 1. Deployment Fails with Permission Error

**Error**: `User: arn:aws:iam::xxx:user/xxx is not authorized to perform: lambda:CreateFunction`

**Solution**: Ensure your AWS user has the required permissions listed in [Prerequisites](#prerequisites)

#### 2. Function Timeout

**Error**: `Task timed out after 30.00 seconds`

**Solution**:
- Increase timeout in [serverless.yml](backend/serverless.yml#L9)
- Optimize function code
- Check network connectivity to Snowflake/DynamoDB

#### 3. Snowflake Connection Error

**Error**: `Cannot connect to Snowflake`

**Solution**:
- Verify credentials in `.env`
- Check Snowflake account is accessible
- Verify network policies in Snowflake

#### 4. DynamoDB Throttling

**Error**: `ProvisionedThroughputExceededException`

**Solution**: Tables use on-demand billing by default, but verify in AWS Console

### Monitoring Dashboards

**CloudWatch Dashboard**:
```bash
# Create custom dashboard
aws cloudwatch put-dashboard --dashboard-name Nephos-Monitoring --dashboard-body file://monitoring-dashboard.json
```

**Snowflake Monitoring**:
- Query `HEALTH_CHECKS` table for instance health
- Use `METRICS_HOURLY` view for trends
- Check `ACTIVE_ALERTS` view for current issues

### Performance Metrics

Key metrics to monitor:

- Lambda duration (should be < 5s for API functions)
- Lambda errors (should be < 1%)
- DynamoDB consumed capacity
- API Gateway 4xx/5xx errors
- Sentinel execution success rate

---

## Local Development

### Backend Local Development

```bash
cd backend

# Install dependencies
npm install
cd functions/api/metrics && npm install && cd ../../..
cd functions/api/alerts && npm install && cd ../../..
cd functions/api/analytics && npm install && cd ../../..
cd functions/sentinel && npm install && cd ../..
cd functions/etl/dynamodb-to-snowflake && npm install && cd ../../..

# Run locally with serverless-offline
chmod +x scripts/local-dev.sh
./scripts/local-dev.sh
```

The API will be available at `http://localhost:3000`

### Frontend Local Development

```bash
cd client
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

### DynamoDB Local (Optional)

For full local development:

```bash
# Using Docker
docker run -p 8000:8000 amazon/dynamodb-local

# Update backend/.env
DYNAMODB_ENDPOINT=http://localhost:8000
```

---

## Cleanup

### Remove Deployment

```bash
cd backend

# Make destroy script executable
chmod +x scripts/destroy.sh

# Remove dev deployment
./scripts/destroy.sh dev us-east-1

# Remove production deployment
./scripts/destroy.sh prod us-east-1
```

Or use Serverless directly:

```bash
serverless remove --stage dev --region us-east-1
```

**Warning**: This will delete all resources including DynamoDB tables and data!

### What Gets Deleted

- All Lambda functions
- API Gateway
- DynamoDB tables (and all data)
- CloudWatch log groups
- IAM roles
- S3 deployment bucket

### Snowflake Cleanup

Run in Snowflake console:

```sql
-- Drop tables
DROP TABLE IF EXISTS NEPHOS.PUBLIC.METRICS;
DROP TABLE IF EXISTS NEPHOS.PUBLIC.ALERTS;
DROP TABLE IF EXISTS NEPHOS.PUBLIC.INSTANCES;
DROP TABLE IF EXISTS NEPHOS.PUBLIC.HEALTH_CHECKS;

-- Drop views
DROP VIEW IF EXISTS NEPHOS.PUBLIC.METRICS_HOURLY;
DROP VIEW IF EXISTS NEPHOS.PUBLIC.ACTIVE_ALERTS;
DROP VIEW IF EXISTS NEPHOS.PUBLIC.INSTANCE_HEALTH;

-- Drop user and role
DROP USER IF EXISTS NEPHOS_USER;
DROP ROLE IF EXISTS NEPHOS_ROLE;

-- Drop warehouse and database
DROP WAREHOUSE IF EXISTS NEPHOS_WH;
DROP DATABASE IF EXISTS NEPHOS;
```

---

## Cost Estimation

### AWS Costs (Monthly - Dev Environment)

- **Lambda**: ~$5-20 (based on invocations)
- **DynamoDB**: ~$1-10 (on-demand pricing)
- **API Gateway**: ~$3-10 (per million requests)
- **CloudWatch**: ~$1-5 (logs and metrics)

**Estimated Total**: $10-45/month for dev environment

### Production Optimization

- Use Lambda reserved concurrency for cost savings
- Monitor and optimize cold starts
- Archive old CloudWatch logs
- Use DynamoDB auto-scaling if needed

---

## Support & Resources

### Documentation

- [Serverless Framework Docs](https://www.serverless.com/framework/docs)
- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Docs](https://docs.aws.amazon.com/dynamodb/)
- [Snowflake Docs](https://docs.snowflake.com/)

### Useful Commands

```bash
# Backend deployment info
serverless info --stage dev

# Invoke function directly
serverless invoke -f sentinel --stage dev

# View metrics
serverless metrics --stage dev

# Roll back deployment
serverless rollback --stage dev --timestamp <timestamp>

# Package without deploying
serverless package --stage dev
```

---

## Next Steps

After deployment:

1. Configure monitoring and alerts
2. Set up error tracking (e.g., Sentry)
3. Implement API authentication
4. Add rate limiting
5. Configure custom domain
6. Set up backup and disaster recovery
7. Implement comprehensive logging
8. Add integration tests
9. Configure alerting thresholds
10. Document API endpoints

---

## Security Considerations

- [ ] Rotate AWS credentials regularly
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable CloudTrail for audit logging
- [ ] Implement API authentication (API Gateway authorizers)
- [ ] Enable encryption at rest for DynamoDB
- [ ] Use VPC for Lambda functions if needed
- [ ] Implement least-privilege IAM policies
- [ ] Enable AWS WAF for API Gateway
- [ ] Regular security audits
- [ ] Monitor for unusual activity

---

## License

[Your License Here]

## Contributors

[Your Team Here]
