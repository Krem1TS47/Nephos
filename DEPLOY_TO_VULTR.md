# Deploy Nephos to Connect with Your Real Vultr Server

This guide will walk you through deploying the Nephos backend to AWS so it connects to your real Vultr server.

## Prerequisites

✅ You already have:
- Vultr API Key configured in `.env`
- Vultr Instance ID: `17b0f286-a9e8-4a4d-a1db-54b74cb97cc3`
- Snowflake credentials configured
- AWS CLI installed and configured

## Step 1: Verify AWS Credentials

```bash
# Check if AWS CLI is configured
aws sts get-caller-identity

# You should see your AWS account ID, user ARN, etc.
```

If not configured:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-2
# Default output format: json
```

## Step 2: Install AWS SAM CLI (if not already installed)

**Windows (PowerShell as Administrator):**
```powershell
# Using MSI installer
Invoke-WebRequest -Uri https://github.com/aws/aws-sam-cli/releases/latest/download/AWS_SAM_CLI_64_PY3.msi -OutFile sam-installer.msi
Start-Process msiexec.exe -ArgumentList '/i', 'sam-installer.msi', '/quiet' -Wait
Remove-Item sam-installer.msi

# Verify installation
sam --version
```

## Step 3: Prepare Deployment Parameters

I've already created `backend/parameters.local.json` with your credentials from `.env`.

**IMPORTANT**: Update the Vultr API key in the file:

```bash
cd backend
notepad parameters.local.json
```

Replace `YOUR_VULTR_API_KEY_FROM_ENV` with your actual Vultr API key from `.env` file.

The file should look like:
```json
{
  "VultrApiKey": "YOUR_ACTUAL_VULTR_API_KEY_HERE",
  "SnowflakeAccount": "BCGIVNI-QN18742",
  "SnowflakeUser": "BENCHING4755",
  "SnowflakePassword": "DynamiteLarry47!",
  "SnowflakeWarehouse": "SNOWFLAKE_LEARNING_WH",
  "SnowflakeDatabase": "SNOWFLAKE_LEARNING_DB",
  "SnowflakeSchema": "INFORMATION_SCHEMA",
  "Environment": "dev"
}
```

## Step 4: Build the Backend

```bash
cd c:/Users/benbe/Projects/Hackathons/Nephos/backend

# Validate SAM template
sam validate --lint

# Build all Lambda functions
sam build
```

This will:
- Package all Lambda functions
- Install dependencies
- Prepare deployment artifacts

**Expected output:**
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

## Step 5: Deploy to AWS

### Option A: Interactive Deployment (Recommended for First Time)

```bash
sam deploy --guided
```

Answer the prompts:
```
Stack Name [nephos-backend]: nephos-backend-dev
AWS Region [us-east-2]: us-east-2
Parameter VultrApiKey []: [Paste your Vultr API key]
Parameter SnowflakeAccount []: BCGIVNI-QN18742
Parameter SnowflakeUser []: BENCHING4755
Parameter SnowflakePassword []: DynamiteLarry47!
Parameter SnowflakeWarehouse [SNOWFLAKE_LEARNING_WH]: [Press Enter]
Parameter SnowflakeDatabase [SNOWFLAKE_LEARNING_DB]: [Press Enter]
Parameter SnowflakeSchema [INFORMATION_SCHEMA]: [Press Enter]
Parameter Environment [dev]: [Press Enter]
Confirm changes before deploy [Y/n]: Y
Allow SAM CLI IAM role creation [Y/n]: Y
Disable rollback [y/N]: N
Save arguments to configuration file [Y/n]: Y
SAM configuration file [samconfig.toml]: [Press Enter]
SAM configuration environment [default]: [Press Enter]
```

### Option B: Automated Deployment (After First Time)

```bash
sam deploy \
  --parameter-overrides \
    VultrApiKey="YOUR_VULTR_API_KEY" \
    SnowflakePassword="DynamiteLarry47!"
```

**Deployment takes 5-10 minutes**. You'll see:
```
CloudFormation stack changeset
-------------------------------------------------------------------------------------------------
Operation                        LogicalResourceId                ResourceType
-------------------------------------------------------------------------------------------------
+ Add                            AlertsTable                      AWS::DynamoDB::Table
+ Add                            InstancesTable                   AWS::DynamoDB::Table
+ Add                            MetricsTable                     AWS::DynamoDB::Table
+ Add                            SentinelFunction                 AWS::Lambda::Function
+ Add                            InsightsApiFunction              AWS::Lambda::Function
...
```

## Step 6: Get Your API Endpoints

After deployment completes, you'll see **Outputs**:

```
CloudFormation outputs from deployed stack
-------------------------------------------------------------------------------------------------
Outputs
-------------------------------------------------------------------------------------------------
Key                 AnalyticsApiEndpoint
Description         Analytics API Gateway endpoint URL
Value               https://abc123xyz.execute-api.us-east-2.amazonaws.com/analytics

Key                 AlertsApiEndpoint
Description         Alerts API Gateway endpoint URL
Value               https://abc123xyz.execute-api.us-east-2.amazonaws.com/alerts

Key                 InsightsApiEndpoint
Description         Insights API Gateway endpoint URL
Value               https://abc123xyz.execute-api.us-east-2.amazonaws.com/insights

Key                 VultrIngestionEndpoint
Description         Vultr metrics ingestion endpoint URL
Value               https://abc123xyz.execute-api.us-east-2.amazonaws.com/ingest/vultr

Key                 WebSocketEndpoint
Description         WebSocket API endpoint URL
Value               wss://xyz789def.execute-api.us-east-2.amazonaws.com/production
-------------------------------------------------------------------------------------------------
```

**COPY THESE URLS** - you'll need them for the frontend!

## Step 7: Configure Frontend to Use Real Backend

Create `client/.env.local` file:

```bash
cd ../client
notepad .env.local
```

Add your API Gateway URLs:

```env
# Replace with YOUR actual endpoints from Step 6
NEXT_PUBLIC_API_URL=https://abc123xyz.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://xyz789def.execute-api.us-east-2.amazonaws.com/production
```

## Step 8: Test the Connection

### 8.1 Verify Sentinel is Monitoring Your Vultr Server

```bash
# Check CloudWatch Logs for Sentinel Lambda
aws logs tail /aws/lambda/nephos-sentinel-dev --follow --region us-east-2
```

You should see logs like:
```
Sentinel function started
Found 1 instances to monitor
Fetched 1 Vultr instances
Performing health check for vultr-instance
Vultr status: active
Sentinel function completed: { healthy: 1, unhealthy: 0 }
```

### 8.2 Check DynamoDB Tables

```bash
# Check if your Vultr instance was added to DynamoDB
aws dynamodb scan --table-name CloudPulseInstances-dev --region us-east-2
```

You should see your Vultr instance data.

### 8.3 Test Frontend

```bash
cd client
npm run dev
```

Open `http://localhost:3000`:
- **Dashboard** should show your real Vultr instance
- **Servers** should display your actual server with instance ID `17b0f286-a9e8-4a4d-a1db-54b74cb97cc3`
- Data will update automatically as Sentinel runs (every 2 minutes)

## What Happens Now

### Automatic Monitoring

1. **EventBridge** triggers Sentinel Lambda every 2 minutes
2. **Sentinel** calls Vultr API using your `VULTR_API_KEY`
3. **Sentinel** fetches status of instance `17b0f286-a9e8-4a4d-a1db-54b74cb97cc3`
4. **Sentinel** performs HTTP health check (if endpoint configured)
5. **DynamoDB** stores instance status and metrics
6. **WebSocket** broadcasts updates to frontend in real-time
7. **Frontend** displays live data from your actual Vultr server

### Data Flow

```
Your Vultr Server (17b0f286...)
        ↓
    Vultr API
        ↓
Sentinel Lambda (every 2 min)
        ↓
    DynamoDB Tables
        ↓
WebSocket Broadcast
        ↓
    Frontend Dashboard
```

## Optional: Install Monitoring Agent on Vultr Server

For **detailed metrics** (CPU, memory, disk), install the agent:

```bash
# SSH into your Vultr server
ssh root@YOUR_VULTR_IP

# Follow the installation guide
# See: backend/vultr-agent/INSTALLATION.md
```

After agent installation, you'll get:
- Real-time CPU usage graphs
- Memory usage tracking
- Disk space monitoring
- Network I/O metrics
- All visible in the "Servers" page with live charts

## Troubleshooting

### Error: "Stack already exists"

```bash
# Update existing stack
sam deploy
```

### Error: "Invalid API Key"

Check your Vultr API key:
```bash
curl "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer YOUR_VULTR_API_KEY"
```

### Error: "Snowflake connection failed"

Verify Snowflake credentials:
- Account: `BCGIVNI-QN18742`
- User: `BENCHING4755`
- Database: `SNOWFLAKE_LEARNING_DB`

### No data showing in dashboard

1. Check Sentinel is running:
   ```bash
   aws logs tail /aws/lambda/nephos-sentinel-dev --follow --region us-east-2
   ```

2. Check DynamoDB has data:
   ```bash
   aws dynamodb scan --table-name CloudPulseInstances-dev --region us-east-2
   ```

3. Verify frontend is using correct API URL in `.env.local`

## Cost Estimate

Running this infrastructure:
- **DynamoDB**: ~$1-5/month (on-demand pricing)
- **Lambda**: ~$0-2/month (mostly free tier)
- **API Gateway**: ~$3-10/month
- **CloudWatch Logs**: ~$0.50-2/month
- **Total**: ~$5-20/month

Most of this falls within AWS Free Tier for the first 12 months!

## Clean Up (If Needed)

To delete everything:

```bash
cd backend
sam delete --stack-name nephos-backend-dev --region us-east-2
```

This removes all AWS resources (Lambda, DynamoDB, API Gateway, etc.).

---

## Next Steps After Deployment

1. ✅ **Verify**: Check Dashboard shows your Vultr instance
2. ✅ **Monitor**: Watch real-time updates every 2 minutes
3. 📊 **Optional**: Install monitoring agent for detailed metrics
4. 🤖 **AI Insights**: Go to "AI Insights" tab for Snowflake AI analysis
5. 🚨 **Alerts**: Set up alert thresholds in the Alerts page

Your Nephos dashboard is now connected to your real Vultr server!
