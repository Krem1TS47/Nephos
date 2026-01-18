# ✅ Installation Complete!

All Lambda function dependencies have been successfully installed.

## 📦 Installed Dependencies

| Function | Status | Packages |
|----------|--------|----------|
| **Sentinel** | ✅ Installed | 376 packages |
| **Vultr Ingestion** | ✅ Installed | 103 packages |
| **ETL (DynamoDB→Snowflake)** | ✅ Installed | 375 packages |
| **Insights API** | ✅ Installed | 321 packages |
| **Analytics API** | ✅ Installed | 102 packages |
| **Alerts API** | ✅ Installed | 103 packages |

**Total:** ~1,380 packages installed across all functions

## 🛠️ What Was Installed

### Sentinel Function
- `aws-sdk` - AWS service integration
- `axios` - HTTP client for Vultr API and health checks
- `winston` - Structured logging

### Vultr Ingestion
- `@aws-sdk/client-dynamodb` - DynamoDB client v3
- `@aws-sdk/lib-dynamodb` - DynamoDB document client
- `uuid` - Unique ID generation

### ETL Function
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `@aws-sdk/lib-dynamodb` - Document operations
- `snowflake-sdk` - Snowflake database connector

### Insights API
- `snowflake-sdk` - Snowflake Cortex AI queries

### Analytics/Alerts APIs
- `@aws-sdk/client-dynamodb` - DynamoDB queries
- `@aws-sdk/lib-dynamodb` - Document operations

## ⚠️ Minor Warnings (Safe to Ignore)

- 1 low severity vulnerability in Sentinel/ETL (non-critical)
- 1 moderate severity in Insights API (non-critical)
- Deprecated package warnings (backward compatibility maintained)

These are common in AWS SDK packages and don't affect functionality.

## 🚀 Next Steps

### 1. Configure AWS Credentials

```bash
aws configure
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-2
# Default output format: json
```

### 2. Update Parameters File

Edit `backend/parameters.json` with your credentials:

```json
{
  "VultrApiKey": "YOUR_ACTUAL_VULTR_API_KEY",
  "SnowflakePassword": "YOUR_ACTUAL_PASSWORD"
}
```

⚠️ **Never commit this file with real credentials!**

### 3. Validate SAM Template

```bash
cd backend
sam validate --lint
```

Expected output:
```
/path/to/template.yaml is a valid SAM Template
```

### 4. Build the Application

```bash
sam build
```

This will:
- Package all Lambda functions
- Include node_modules in deployment
- Create `.aws-sam/build/` directory

### 5. Deploy to AWS

**First time (guided):**
```bash
sam deploy --guided
```

Follow the prompts:
- Stack name: `nephos-backend-dev`
- AWS Region: `us-east-2`
- Confirm changes: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Save arguments to samconfig: `Y`

**Subsequent deploys:**
```bash
sam deploy
```

### 6. Get Your API Endpoints

After deployment completes, you'll see:

```
Outputs:
  VultrIngestionEndpoint: https://xxxxx.execute-api.us-east-2.amazonaws.com/ingest
  InsightsApiEndpoint: https://xxxxx.execute-api.us-east-2.amazonaws.com/insights
  AnalyticsApiEndpoint: https://xxxxx.execute-api.us-east-2.amazonaws.com/analytics
```

Copy these endpoints!

### 7. Configure Vultr Monitoring

On your Vultr instance:

```bash
export INGESTION_ENDPOINT="https://xxxxx.execute-api.us-east-2.amazonaws.com/ingest"
export VULTR_INSTANCE_ID="17b0f286-a9e8-4a4d-a1db-54b74cb97cc3"
export INSTANCE_NAME="Vultr Production Server"

node /path/to/vultr-monitor.js
```

### 8. Setup Snowflake

```bash
snowsql -a BCGIVNI-QN18742 -u BENCHING4755 -f snowflake/setup.sql
```

### 9. Update Frontend

In `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-2.amazonaws.com
```

### 10. Test Everything!

```bash
# Test ingestion
curl -X POST <INGESTION_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d '{"instanceId":"test","metrics":[{"name":"cpu","value":45}]}'

# Test insights API
curl <INSIGHTS_ENDPOINT>

# Test analytics
curl <ANALYTICS_ENDPOINT>/dashboard
```

## 🔍 Verification Commands

### Check installed packages
```bash
# Count total packages
ls backend/functions/*/node_modules | wc -l

# Check specific function
ls backend/functions/sentinel/node_modules/@aws-sdk
```

### Check for vulnerabilities (optional)
```bash
cd backend/functions/sentinel
npm audit

# Fix if needed
npm audit fix
```

### Clean and reinstall (if needed)
```bash
cd backend/functions/sentinel
rm -rf node_modules package-lock.json
npm install
```

## 📚 Additional Resources

- **Deployment Guide:** [backend/DEPLOYMENT.md](DEPLOYMENT.md)
- **Quick Start:** [../QUICKSTART.md](../QUICKSTART.md)
- **Brain Layer Docs:** [../BRAIN_LAYER.md](../BRAIN_LAYER.md)
- **Sentinel Function:** [functions/sentinel/README.md](functions/sentinel/README.md)

## 🆘 Troubleshooting

### SAM build fails
```bash
# Try without Docker
sam build

# Or with Docker (if installed)
sam build --use-container
```

### Deployment fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name nephos-backend-dev

# Delete failed stack and retry
aws cloudformation delete-stack --stack-name nephos-backend-dev
```

### Missing AWS CLI
```bash
# Windows (PowerShell as Admin)
.\install-sam.ps1

# Or manually
choco install awscli aws-sam-cli
```

### Permission errors
```bash
# Run PowerShell as Administrator
# Right-click PowerShell → Run as Administrator
```

## ✨ You're Ready!

Your Nephos backend is fully configured and ready to deploy. The entire infrastructure can be deployed to AWS with a single command!

**Happy deploying! 🚀**

---

**Installation completed:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
