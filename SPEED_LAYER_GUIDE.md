# Nephos Speed Layer - Complete Guide

The speed layer handles real-time data ingestion from Vultr servers to AWS Lambda, DynamoDB, and your frontend dashboard.

## Architecture Overview

```
┌─────────────────┐
│  Vultr Server   │
│  (Agent Running)│
└────────┬────────┘
         │ HTTP/HTTPS
         │ Every 30s
         ▼
┌─────────────────────────────────────┐
│      AWS API Gateway (HTTP API)     │
│  /metrics, /alerts, /instances      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│         AWS Lambda Functions        │
│  ┌─────────────────────────────┐   │
│  │ metrics/index.js            │   │
│  │ alerts/index.js             │   │
│  │ instances/index.js          │   │
│  │ analytics/index.js          │   │
│  └─────────────────────────────┘   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│           DynamoDB Tables           │
│  ┌─────────────────────────────┐   │
│  │ nephos-metrics-{stage}      │   │
│  │ nephos-alerts-{stage}       │   │
│  │ nephos-instances-{stage}    │   │
│  └─────────────────────────────┘   │
└────────┬────────────────────────────┘
         │ DynamoDB Stream (optional)
         ▼
┌─────────────────────────────────────┐
│       Snowflake (Batch Layer)       │
│  Analytics & Historical Data        │
└─────────────────────────────────────┘
         ▲
         │ API Queries
         │
┌─────────────────────────────────────┐
│      Next.js Frontend Dashboard     │
│  Real-time metrics & alerts display │
└─────────────────────────────────────┘
```

## Data Flow

### 1. **Vultr Server → AWS Lambda** (Speed Layer Ingestion)

**Vultr Agent** (`nephos-agent.js`):
- Collects system metrics every 30 seconds
- Sends HTTP POST requests to API Gateway
- Auto-registers server on startup
- Creates alerts when thresholds are exceeded

**Endpoints Used**:
- `POST /instances` - Register server
- `POST /metrics` - Send metrics
- `POST /alerts` - Create alerts
- `PUT /instances/{id}` - Update health status

### 2. **AWS Lambda → DynamoDB** (Storage)

**Lambda Functions**:
- Parse and validate incoming data
- Generate UUIDs for records
- Write to DynamoDB tables
- Return success/error responses

**DynamoDB Tables**:
- **Metrics**: `id` (HASH), `timestamp` (RANGE), GSI on `instanceId`
- **Alerts**: `id` (HASH), GSI on `status`
- **Instances**: `id` (HASH), GSI on `status`

### 3. **Frontend → AWS Lambda** (Retrieval)

**Frontend Hooks**:
- Poll API endpoints every 30-60 seconds
- Display real-time data in dashboard
- Auto-refresh on data changes

**Endpoints Used**:
- `GET /analytics/dashboard` - Dashboard summary
- `GET /metrics` - List metrics
- `GET /alerts` - List alerts
- `GET /instances` - List instances

## Deployment Steps

### Step 1: Deploy Backend to AWS

```bash
cd backend

# Install dependencies
npm ci
cd functions/api/metrics && npm ci && cd ../../..
cd functions/api/alerts && npm ci && cd ../../..
cd functions/api/instances && npm ci && cd ../../..
cd functions/api/analytics && npm ci && cd ../../..

# Deploy to AWS
./scripts/deploy.sh dev us-east-1
```

**Expected Output**:
```
✅ Deployment completed successfully!

Service Information:
service: nephos-backend
stage: dev
region: us-east-1
stack: nephos-backend-dev
endpoint: https://abc123xyz.execute-api.us-east-1.amazonaws.com

functions:
  metricsApi: nephos-backend-dev-metricsApi
  alertsApi: nephos-backend-dev-alertsApi
  instancesApi: nephos-backend-dev-instancesApi
  analyticsApi: nephos-backend-dev-analyticsApi
```

**Copy the API Gateway URL** - you'll need it for the next steps!

### Step 2: Configure Frontend

```bash
cd client

# Update .env.local with your API URL
echo "NEXT_PUBLIC_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com" > .env.local

# Restart frontend (if running)
# The dev server will auto-reload
```

### Step 3: Deploy Vultr Agent

**On your Vultr server**:

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Create agent directory**:
```bash
sudo mkdir -p /opt/nephos
cd /opt/nephos
```

3. **Copy the agent file**:
```bash
# Transfer nephos-agent.js to /opt/nephos/nephos-agent.js
# You can use scp, rsync, or copy-paste
```

4. **Configure environment**:
```bash
sudo nano /opt/nephos/.env
```

Add:
```bash
NEPHOS_API_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com
NEPHOS_INSTANCE_NAME=Production Server 1
NEPHOS_REGION=vultr-nyc1
NEPHOS_CHECK_INTERVAL=30000
```

5. **Create systemd service**:
```bash
sudo nano /etc/systemd/system/nephos-agent.service
```

Add:
```ini
[Unit]
Description=Nephos Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nephos
EnvironmentFile=/opt/nephos/.env
ExecStart=/usr/bin/node /opt/nephos/nephos-agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

6. **Start the service**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable nephos-agent
sudo systemctl start nephos-agent
sudo systemctl status nephos-agent
```

7. **View logs**:
```bash
sudo journalctl -u nephos-agent -f
```

**Expected Output**:
```
🚀 Nephos Vultr Agent Starting...
Instance ID: vultr-server-abc123
Instance Name: Production Server 1
API URL: https://abc123xyz.execute-api.us-east-1.amazonaws.com
Check Interval: 30000ms

✅ Instance registered: uuid-here
💚 Instance status updated: healthy
📊 Sent metric: cpu_usage = 25.4 percent
📊 Sent metric: memory_usage = 2147483648 bytes
✅ Metrics collection cycle complete
✅ Agent running. Press Ctrl+C to stop.
```

## Testing the Pipeline

### Test 1: Verify Instance Registration

```bash
# On your Vultr server
sudo journalctl -u nephos-agent -f | grep "Instance registered"
```

**Check dashboard**:
- Open http://localhost:3000/instances
- Should see your Vultr server listed
- Status should be "healthy"

### Test 2: Verify Metrics Flow

**Wait 30 seconds**, then:

```bash
# Check agent logs
sudo journalctl -u nephos-agent -f | grep "Sent metric"
```

**Check dashboard**:
- Open http://localhost:3000/metrics
- Should see metrics appearing
- cpu_usage, memory_usage, load_average, etc.

### Test 3: Trigger an Alert

**On Vultr server, stress CPU**:
```bash
# Install stress tool
sudo apt-get install -y stress

# Stress CPU (will trigger alert if > 80%)
stress --cpu 4 --timeout 60s
```

**Check agent logs**:
```bash
sudo journalctl -u nephos-agent -f | grep "alert"
```

**Check dashboard**:
- Open http://localhost:3000/alerts
- Should see "high_cpu_usage" alert
- Severity: high or critical

### Test 4: End-to-End Dashboard Test

1. **Open dashboard**: http://localhost:3000

2. **Verify stats cards show**:
   - Total Instances: 1 (or more)
   - Healthy Instances: 1
   - Active Alerts: Count of active alerts
   - Average Latency: Updated value

3. **Check tabs**:
   - Overview: Shows recent alerts and instances
   - Metrics: Shows recent metrics
   - Alerts: Shows active alerts

4. **Verify auto-refresh**:
   - Wait 30 seconds
   - Dashboard should update automatically
   - New metrics should appear

## API Endpoints Reference

### Metrics API

**POST /metrics** - Create metric
```json
{
  "instanceId": "vultr-server-123",
  "metricName": "cpu_usage",
  "metricValue": 45.5,
  "unit": "percent",
  "timestamp": 1705523400000,
  "tags": {}
}
```

**GET /metrics** - List metrics
```
Query params:
  - instanceId: Filter by instance
  - metricName: Filter by metric name
  - limit: Max results (default: 100)
```

**GET /metrics/{id}** - Get specific metric

### Alerts API

**POST /alerts** - Create alert
```json
{
  "instanceId": "vultr-server-123",
  "alertType": "high_cpu_usage",
  "severity": "high",
  "message": "CPU usage is at 85%"
}
```

**GET /alerts** - List alerts
```
Query params:
  - status: Filter by status (active, acknowledged, resolved)
  - instanceId: Filter by instance
  - limit: Max results
```

**PUT /alerts/{id}** - Update alert
```json
{
  "status": "acknowledged"
}
```

**DELETE /alerts/{id}** - Delete alert

### Instances API

**POST /instances** - Register instance
```json
{
  "name": "Production Server 1",
  "type": "vultr-server",
  "region": "vultr-nyc1",
  "endpoint": "http://hostname",
  "metadata": {}
}
```

**GET /instances** - List instances
```
Query params:
  - status: Filter by status (healthy, unhealthy, warning, unknown)
  - limit: Max results
```

**PUT /instances/{id}** - Update instance
```json
{
  "status": "healthy",
  "lastHealthCheck": "2026-01-17T20:00:00.000Z"
}
```

**DELETE /instances/{id}** - Delete instance

### Analytics API

**GET /analytics/dashboard** - Get dashboard data
```json
{
  "summary": {
    "totalInstances": 1,
    "healthyInstances": 1,
    "activeAlerts": 0,
    "criticalAlerts": 0,
    "avgLatency": 0
  },
  "instances": [...],
  "recentAlerts": [...],
  "recentMetrics": [...]
}
```

**GET /analytics** - Get analytics
```
Query params:
  - startDate: Start date (ISO string)
  - endDate: End date (ISO string)
  - instanceId: Filter by instance
  - metricName: Filter by metric
```

## Troubleshooting

### Issue: Agent can't connect to API

**Symptoms**:
```
❌ Failed to register instance: connect ECONNREFUSED
```

**Solutions**:
1. Verify API URL in `.env`
2. Check AWS Lambda deployment
3. Test API manually:
   ```bash
   curl https://your-api-url/instances
   ```
4. Check firewall allows outbound HTTPS

### Issue: Metrics not appearing in dashboard

**Symptoms**: Dashboard shows "No metrics available"

**Solutions**:
1. Check agent is running: `systemctl status nephos-agent`
2. Check agent logs: `journalctl -u nephos-agent -f`
3. Verify API URL in frontend `.env.local`
4. Check DynamoDB tables have data:
   ```bash
   aws dynamodb scan --table-name nephos-metrics-dev --limit 5
   ```

### Issue: CORS errors in browser

**Symptoms**: Console shows "CORS policy" errors

**Solutions**:
1. Verify Lambda functions include CORS headers
2. Check API Gateway CORS configuration
3. Redeploy backend: `./scripts/deploy.sh dev us-east-1`

### Issue: High alert frequency

**Symptoms**: Too many alerts being created

**Solutions**:
1. Adjust thresholds in Vultr agent `.env`:
   ```bash
   ALERT_CPU_THRESHOLD=90
   ALERT_MEMORY_THRESHOLD=90
   ```
2. Increase check interval:
   ```bash
   NEPHOS_CHECK_INTERVAL=60000  # 1 minute
   ```
3. Restart agent: `systemctl restart nephos-agent`

## Performance Optimization

### Reduce API Costs

1. **Increase check intervals**:
   ```bash
   # Vultr agent
   NEPHOS_CHECK_INTERVAL=60000  # 1 minute instead of 30s

   # Frontend
   NEXT_PUBLIC_METRICS_REFRESH_INTERVAL=60000
   ```

2. **Batch metrics** (future enhancement):
   - Collect metrics locally for 5 minutes
   - Send batch of metrics in single request

### Improve Dashboard Performance

1. **Limit query results**:
   ```typescript
   // In frontend hooks
   const { metrics } = useMetrics({
     params: { limit: 50 }  // Instead of 100
   });
   ```

2. **Increase refresh intervals**:
   ```bash
   # In .env.local
   NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL=60000
   ```

## Scaling Considerations

### Multiple Vultr Servers

Each server needs:
1. Unique `NEPHOS_INSTANCE_NAME`
2. Same `NEPHOS_API_URL`
3. Different `NEPHOS_INSTANCE_ID` (auto-generated)

**Deploy agent on each server**:
```bash
# Server 1
NEPHOS_INSTANCE_NAME="Web Server 1"

# Server 2
NEPHOS_INSTANCE_NAME="Database Server 1"

# Server 3
NEPHOS_INSTANCE_NAME="Cache Server 1"
```

### High-Volume Metrics

For 10+ servers sending metrics every 30s:

1. **DynamoDB**: Uses on-demand billing (auto-scales)
2. **Lambda**: Adjust concurrency if needed
3. **API Gateway**: No limit for HTTP API
4. **Consider**: CloudWatch for Lambda metrics

## Next Steps

1. ✅ Deploy backend to AWS
2. ✅ Configure frontend with API URL
3. ✅ Deploy agent to Vultr server
4. ✅ Verify data flow end-to-end
5. ⏳ Add more servers
6. ⏳ Configure Snowflake ETL (batch layer)
7. ⏳ Add authentication
8. ⏳ Set up alerting (SNS, email)

## Security Checklist

- [ ] Use HTTPS for API (automatically done by API Gateway)
- [ ] Add API authentication (API keys or JWT)
- [ ] Restrict API Gateway to known IPs (optional)
- [ ] Rotate AWS credentials regularly
- [ ] Use IAM roles with least privilege
- [ ] Enable CloudTrail for audit logs
- [ ] Encrypt DynamoDB tables at rest
- [ ] Use VPC for Lambda (if needed)

---

**Your speed layer is now complete and ready to handle real-time monitoring data!** 🚀

Visit your dashboard at http://localhost:3000 to see live data flowing from your Vultr servers!
