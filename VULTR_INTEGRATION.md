# Vultr Integration Guide

This guide explains how to integrate your Vultr servers with Nephos for real-time monitoring and AI-powered insights.

## Current State: Hardcoded vs Real Data

### What's Hardcoded Right Now

**Frontend (Client)**:
- Mock API routes in `client/app/api/*` returning fake data
- 5 hardcoded instances (web-server-01, api-server-01, etc.)
- 960 mock metrics (CPU, memory, disk, network)
- All timestamps and values are randomly generated

**Backend**:
- Lambda functions exist but are NOT deployed yet
- DynamoDB tables defined but don't exist in AWS
- Vultr integration code ready but never executed
- Snowflake Cortex AI queries written but unused

### What Happens After Integration

**Real Data Flow**:
```
Vultr Server → Monitoring Agent → API Gateway → Lambda → DynamoDB → Frontend
                                                    ↓
                                                Snowflake Cortex AI
                                                    ↓
                                                AI Insights
```

---

## Integration Options

You have **two options** for integrating Vultr servers. You can use both together.

### Option A: Sentinel-Only (Simple, No Server Changes)

**What it does**:
- Backend Lambda runs every 2 minutes automatically
- Fetches instance data from Vultr API
- Checks if your servers are up/down
- Performs HTTP health checks
- Stores results in DynamoDB

**What you get**:
- ✅ Instance status (running, stopped)
- ✅ IP addresses and regions
- ✅ HTTP response time checks
- ✅ Uptime monitoring
- ❌ No detailed metrics (CPU, memory, disk)

**Time to set up**: ~10 minutes (just deploy backend)

**Best for**: Quick start, basic monitoring, testing the system

---

### Option B: Full Monitoring Agent (Complete Metrics)

**What it does**:
- Installs a Node.js agent on your Vultr server
- Agent runs as background service (systemd)
- Collects detailed system metrics every 30 seconds
- Sends to your backend via API Gateway
- Combines with Sentinel for complete monitoring

**What you get**:
- ✅ Everything from Option A
- ✅ Real-time CPU usage
- ✅ Memory usage (used/free/percent)
- ✅ Disk usage (used/available/percent)
- ✅ Network I/O (RX/TX bytes)
- ✅ System load averages
- ✅ Custom application metrics
- ✅ Snowflake AI predictions

**Time to set up**: ~30 minutes (deploy backend + install agent)

**Best for**: Production monitoring, AI insights, complete observability

---

## Deployment Path: Option A (Sentinel-Only)

### Step 1: Configure Backend Parameters

Create parameter file:

```bash
cd backend
cp parameters.json parameters.local.json
```

Edit `parameters.local.json`:

```json
{
  "VultrApiKey": "YOUR_VULTR_API_KEY_HERE",
  "SnowflakeAccount": "BCGIVNI-QN18742",
  "SnowflakeUser": "BENCHING4755",
  "SnowflakePassword": "YOUR_SNOWFLAKE_PASSWORD",
  "SnowflakeWarehouse": "SNOWFLAKE_LEARNING_WH",
  "SnowflakeDatabase": "NEPHOS",
  "SnowflakeSchema": "PUBLIC",
  "Environment": "dev"
}
```

### Step 2: Deploy Backend to AWS

```bash
# Validate template
sam validate --lint

# Build
sam build

# Deploy (first time)
sam deploy --guided --parameter-overrides \
  VultrApiKey=YOUR_VULTR_API_KEY \
  SnowflakePassword=YOUR_SNOWFLAKE_PASSWORD

# Follow prompts:
# - Stack name: nephos-backend-dev
# - Region: us-east-2
# - Confirm changes: Y
# - Allow SAM CLI IAM role creation: Y
# - Save arguments to samconfig.toml: Y
```

**Deployment takes 5-10 minutes.**

### Step 3: Get API Endpoints

After deployment, copy the outputs:

```
Outputs:
  InsightsApiEndpoint: https://abc123.execute-api.us-east-2.amazonaws.com/insights
  AnalyticsApiEndpoint: https://abc123.execute-api.us-east-2.amazonaws.com/analytics
  AlertsApiEndpoint: https://abc123.execute-api.us-east-2.amazonaws.com/alerts
  WebSocketEndpoint: wss://xyz789.execute-api.us-east-2.amazonaws.com/production
  VultrIngestionEndpoint: https://abc123.execute-api.us-east-2.amazonaws.com/ingest/vultr
```

### Step 4: Configure Frontend

Update `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-2.amazonaws.com
NEXT_PUBLIC_WEBSOCKET_URL=wss://xyz789.execute-api.us-east-2.amazonaws.com/production
```

### Step 5: Start Frontend

```bash
cd client
npm run build
npm run start
```

Open `http://localhost:3000` - you should see your real Vultr instances!

### Step 6: Verify Sentinel is Working

**Check CloudWatch Logs:**
```bash
# View Sentinel logs
aws logs tail /aws/lambda/nephos-sentinel-dev --follow
```

**Check DynamoDB Tables:**
- Go to AWS Console → DynamoDB
- Open `CloudPulseInstances-dev` table
- You should see your Vultr instances

**Check Frontend:**
- Navigate to "Instances" tab
- Your Vultr servers should appear within 2 minutes

---

## Deployment Path: Option B (Full Monitoring)

**Do Option A first**, then continue:

### Step 7: Install Agent on Vultr Server

#### 7.1 Get Vultr Instance ID

**From Vultr Dashboard:**
1. Log into https://my.vultr.com
2. Click on your instance
3. Copy the Instance ID (e.g., `17b0f286-a9e8-4a4d-a1db-54b74cb97cc3`)

**From Vultr API:**
```bash
curl "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer YOUR_VULTR_API_KEY" | jq
```

#### 7.2 SSH into Vultr Server

```bash
ssh root@YOUR_VULTR_IP
```

#### 7.3 Install Node.js (if needed)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version  # Should show v20.x.x
```

#### 7.4 Copy Agent Files

**From your local machine:**

```bash
# Navigate to Nephos project
cd /path/to/Nephos

# Copy agent to Vultr server
scp -r backend/vultr-agent root@YOUR_VULTR_IP:/tmp/
```

**On Vultr server:**

```bash
sudo mkdir -p /opt/nephos-agent
sudo mv /tmp/vultr-agent/* /opt/nephos-agent/
cd /opt/nephos-agent

# Install dependencies
npm install

# Make executable
chmod +x nephos-agent.js
```

#### 7.5 Configure Agent

Edit the service file:

```bash
sudo nano /opt/nephos-agent/nephos-agent.service
```

Update these lines with your values:

```ini
Environment="NEPHOS_ENDPOINT=https://abc123.execute-api.us-east-2.amazonaws.com/ingest/vultr"
Environment="INSTANCE_ID=17b0f286-a9e8-4a4d-a1db-54b74cb97cc3"
Environment="INSTANCE_NAME=my-web-server"
Environment="VULTR_REGION=ewr"
Environment="HEALTH_ENDPOINT=http://localhost:3000/health"
```

Save and exit (Ctrl+X, Y, Enter).

#### 7.6 Install as System Service

```bash
# Copy service file
sudo cp nephos-agent.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable (start on boot)
sudo systemctl enable nephos-agent

# Start now
sudo systemctl start nephos-agent

# Check status
sudo systemctl status nephos-agent
```

You should see:
```
● nephos-agent.service - Nephos Monitoring Agent
   Active: active (running)
```

#### 7.7 View Agent Logs

```bash
# Real-time logs
sudo journalctl -u nephos-agent -f

# Last 50 lines
sudo journalctl -u nephos-agent -n 50
```

You should see:
```
Nephos Agent Starting...
Configuration: { endpoint: 'https://...', instanceId: '...' }
Metrics sent successfully: { metricsIngested: 12, ... }
```

### Step 8: Verify Metrics in Dashboard

1. Open Nephos dashboard: `http://localhost:3000`
2. Go to "Metrics" tab
3. You should see real CPU, memory, disk metrics within 30 seconds
4. Go to "Insights" tab for AI-generated summaries

---

## Understanding the Data Flow

### Option A (Sentinel-Only) Flow

```
┌─────────────────────┐
│   EventBridge       │ Every 2 minutes
│   (Scheduler)       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Sentinel Lambda    │
│  - Fetch Vultr API  │───→ Vultr API
│  - HTTP health check│
│  - Update status    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  DynamoDB Tables    │
│  - Instances        │
│  - Metrics          │
│  - Alerts           │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  DynamoDB Streams   │
│  (Change events)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  WebSocket Lambda   │───→ Frontend
│  (Broadcast)        │     (Real-time updates)
└─────────────────────┘
```

### Option B (Full Monitoring) Flow

```
┌─────────────────────┐
│   Vultr Server      │
│   + Nephos Agent    │
│   (collects metrics)│
└──────────┬──────────┘
           │ Every 30s
           ↓
┌─────────────────────┐
│   API Gateway       │
│   /ingest/vultr     │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Ingestion Lambda   │
│  - Parse metrics    │
│  - Store to DDB     │
│  - Generate alerts  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  DynamoDB Tables    │
│  (same as Option A) │
└──────────┬──────────┘
           │
           ↓
     [Same as Option A]
           +
┌─────────────────────┐
│  ETL Lambda         │───→ Snowflake
│  (DDB Stream)       │     Cortex AI
└─────────────────────┘
           │
           ↓
┌─────────────────────┐
│  Insights Lambda    │───→ Frontend
│  (AI predictions)   │     (Insights tab)
└─────────────────────┘
```

---

## Comparing the Options

| Feature | Option A (Sentinel) | Option B (Full Agent) |
|---------|--------------------|-----------------------|
| **Setup Time** | 10 minutes | 30 minutes |
| **Server Changes** | None | Install agent |
| **Instance Status** | ✅ | ✅ |
| **HTTP Health Checks** | ✅ | ✅ |
| **CPU Metrics** | ❌ | ✅ |
| **Memory Metrics** | ❌ | ✅ |
| **Disk Metrics** | ❌ | ✅ |
| **Network Metrics** | ❌ | ✅ |
| **AI Predictions** | Limited | ✅ Full |
| **Real-time Updates** | Every 2 min | Every 30 sec |
| **Custom Metrics** | ❌ | ✅ |
| **Best For** | Testing, basic monitoring | Production, AI insights |

---

## Monitoring Multiple Vultr Servers

### Option A: Automatic (No Extra Work)

Sentinel automatically discovers and monitors **all instances** in your Vultr account via the API.

### Option B: Install Agent on Each Server

Repeat the agent installation steps for each server with:
- Different `INSTANCE_ID`
- Different `INSTANCE_NAME`
- Same `NEPHOS_ENDPOINT`

Example for 3 servers:

**Server 1:**
```env
INSTANCE_ID=17b0f286-a9e8-4a4d-a1db-54b74cb97cc3
INSTANCE_NAME=web-server-01
```

**Server 2:**
```env
INSTANCE_ID=28c1g397-b0f9-5b5e-b2ec-65c85dc08dd4
INSTANCE_NAME=api-server-01
```

**Server 3:**
```env
INSTANCE_ID=39d2h408-c1ga-6c6f-c3fd-76d96ed19ee5
INSTANCE_NAME=db-server-01
```

---

## Troubleshooting

### "No instances showing up"

1. **Check Sentinel logs:**
   ```bash
   aws logs tail /aws/lambda/nephos-sentinel-dev --follow
   ```

2. **Verify Vultr API key:**
   ```bash
   curl "https://api.vultr.com/v2/instances" \
     -H "Authorization: Bearer YOUR_VULTR_API_KEY"
   ```

3. **Check DynamoDB tables exist:**
   - AWS Console → DynamoDB
   - Look for `CloudPulseInstances-dev`

### "Agent can't connect to backend"

1. **Test endpoint manually:**
   ```bash
   curl -X POST https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com/ingest/vultr \
     -H "Content-Type: application/json" \
     -d '{"instanceId":"test","metrics":[]}'
   ```

2. **Check agent logs:**
   ```bash
   sudo journalctl -u nephos-agent -n 100
   ```

3. **Verify API Gateway deployed:**
   - AWS Console → API Gateway
   - Check routes exist

### "Metrics showing but no AI insights"

1. **Check Snowflake connection:**
   - Test credentials in Snowflake console
   - Verify warehouse is running

2. **Check ETL Lambda logs:**
   ```bash
   aws logs tail /aws/lambda/nephos-etl-dev --follow
   ```

3. **Run Snowflake setup:**
   ```bash
   # Connect to Snowflake and run:
   USE DATABASE NEPHOS;
   USE SCHEMA PUBLIC;

   # Check tables exist
   SHOW TABLES;
   ```

---

## Next Steps After Integration

Once your Vultr servers are sending real data:

1. **Set up Alerts**
   - Navigate to "Alerts" tab
   - Configure thresholds (CPU > 90%, memory > 85%)
   - Add email/SNS notifications

2. **Configure Snowflake AI**
   - Run `backend/snowflake/setup.sql`
   - Test predictions with sample data
   - View natural language insights

3. **Customize Agent**
   - Add custom application metrics
   - Adjust collection intervals
   - Add custom health checks

4. **Scale Up**
   - Install agent on more Vultr servers
   - Monitor multi-cloud (AWS + Vultr + GCP)
   - Set up DynamoDB auto-scaling

5. **Production Hardening**
   - Enable API Gateway authentication
   - Set up CloudWatch alarms
   - Configure backup/restore for DynamoDB
   - Add WAF rules to API Gateway

---

## Cost Estimates

### AWS Costs (Option A - Sentinel Only)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Lambda (Sentinel) | 21,600 invocations/month | $0.00 (Free tier) |
| DynamoDB | 5 instances, 720 checks/month | $0.25 |
| API Gateway | 100,000 requests | $0.35 |
| CloudWatch Logs | 1 GB | $0.50 |
| **Total** | | **~$1.10/month** |

### AWS Costs (Option B - Full Monitoring)

| Service | Usage | Monthly Cost |
|---------|-------|--------------|
| Lambda (All functions) | ~100,000 invocations | $0.20 |
| DynamoDB | 5 instances, 86,400 writes/day | $5.00 |
| API Gateway | 2.6M requests | $9.10 |
| WebSocket API | 50 connections, 24/7 | $1.00 |
| Snowflake | Warehouse running | $2/hour when active |
| CloudWatch | 5 GB logs | $2.50 |
| **Total** | | **~$18-25/month** |

**Snowflake costs** depend on warehouse usage (pay per second).

---

## Summary: What to Do

**For quick testing:**
→ Use **Option A** - just deploy backend, see your Vultr instances immediately

**For production monitoring:**
→ Use **Option A + Option B** - full metrics, AI insights, real-time dashboards

**Recommended path:**
1. Deploy backend (10 min) → See instances in dashboard
2. Install agent on one Vultr server (20 min) → See real metrics
3. Verify everything works
4. Install agent on remaining servers (5 min each)
5. Configure Snowflake AI for predictions
6. Set up alerts and notifications

You're now monitoring your entire infrastructure with AI-powered insights!
