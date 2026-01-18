# Nephos Agent Installation Guide for Vultr Servers

This guide shows you how to install the Nephos monitoring agent on your Vultr server to send real-time system metrics to your Nephos backend.

## Prerequisites

- A Vultr server running Linux (Ubuntu/Debian/CentOS)
- Node.js 18+ installed on the server
- Nephos backend deployed to AWS (to get the ingestion endpoint)
- SSH access to your Vultr server

## Step 1: Get Your Configuration Values

Before installing, you need these values:

### 1.1 Nephos Ingestion Endpoint

After deploying your backend with `sam deploy`, you'll see outputs like:

```
Outputs:
  VultrIngestionEndpoint: https://abc123xyz.execute-api.us-east-2.amazonaws.com/ingest/vultr
```

Copy this URL - you'll need it for `NEPHOS_ENDPOINT`.

### 1.2 Vultr Instance ID

**Option A: From Vultr Dashboard**
1. Log into Vultr dashboard
2. Click on your instance
3. Copy the Instance ID (looks like: `17b0f286-a9e8-4a4d-a1db-54b74cb97cc3`)

**Option B: From Vultr API**
```bash
curl "https://api.vultr.com/v2/instances" \
  -H "Authorization: Bearer YOUR_VULTR_API_KEY" | jq '.instances[].id'
```

### 1.3 Instance Metadata

- **INSTANCE_NAME**: A friendly name (e.g., "web-server-01")
- **VULTR_REGION**: Your Vultr region (e.g., "ewr", "lax", "ord")
- **HEALTH_ENDPOINT**: (Optional) Your app's health check URL (e.g., "http://localhost:3000/health")

## Step 2: Install Node.js (if not already installed)

### Ubuntu/Debian:
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### CentOS/RHEL:
```bash
# Install Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 3: Install the Nephos Agent

### 3.1 Create installation directory

```bash
sudo mkdir -p /opt/nephos-agent
cd /opt/nephos-agent
```

### 3.2 Copy agent files to server

**Option A: Using SCP (from your local machine)**
```bash
# Run this from your local machine in the Nephos project directory
scp -r backend/vultr-agent/* root@YOUR_VULTR_IP:/opt/nephos-agent/
```

**Option B: Manual copy**
```bash
# SSH into your Vultr server first
cd /opt/nephos-agent

# Create the files manually (copy/paste content)
sudo nano nephos-agent.js    # Paste content from nephos-agent.js
sudo nano package.json       # Paste content from package.json
```

### 3.3 Install dependencies

```bash
cd /opt/nephos-agent
sudo npm install
```

### 3.4 Make the agent executable

```bash
sudo chmod +x nephos-agent.js
```

## Step 4: Configure the Agent

Edit the systemd service file with your configuration:

```bash
sudo nano /opt/nephos-agent/nephos-agent.service
```

Update these environment variables:

```ini
Environment="NEPHOS_ENDPOINT=https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com/ingest/vultr"
Environment="INSTANCE_ID=17b0f286-a9e8-4a4d-a1db-54b74cb97cc3"
Environment="INSTANCE_NAME=web-server-01"
Environment="VULTR_REGION=ewr"
Environment="HEALTH_ENDPOINT=http://localhost:3000/health"
```

Save and exit (Ctrl+X, then Y, then Enter).

## Step 5: Install as Systemd Service

### 5.1 Copy service file to systemd

```bash
sudo cp /opt/nephos-agent/nephos-agent.service /etc/systemd/system/
```

### 5.2 Reload systemd

```bash
sudo systemctl daemon-reload
```

### 5.3 Enable the service (start on boot)

```bash
sudo systemctl enable nephos-agent
```

### 5.4 Start the service

```bash
sudo systemctl start nephos-agent
```

## Step 6: Verify Installation

### 6.1 Check service status

```bash
sudo systemctl status nephos-agent
```

You should see:
```
● nephos-agent.service - Nephos Monitoring Agent
   Loaded: loaded (/etc/systemd/system/nephos-agent.service; enabled)
   Active: active (running) since ...
```

### 6.2 View logs

```bash
# View real-time logs
sudo journalctl -u nephos-agent -f

# View last 50 lines
sudo journalctl -u nephos-agent -n 50
```

You should see output like:
```
Jan 17 18:30:00 nephos-agent[1234]: Nephos Agent Starting...
Jan 17 18:30:00 nephos-agent[1234]: Configuration: { endpoint: 'https://...', instanceId: '...' }
Jan 17 18:30:02 nephos-agent[1234]: Metrics sent successfully: { metricsIngested: 12, ... }
```

### 6.3 Test manual run (optional)

```bash
cd /opt/nephos-agent
sudo node nephos-agent.js
```

Press Ctrl+C to stop after you see metrics being sent.

## Step 7: Verify in Nephos Dashboard

1. Open your Nephos frontend dashboard
2. Navigate to the "Instances" tab
3. You should see your Vultr server appear within 30-60 seconds
4. Navigate to "Metrics" tab to see real-time CPU, memory, disk data

## Troubleshooting

### Agent won't start

**Check logs:**
```bash
sudo journalctl -u nephos-agent -n 100 --no-pager
```

**Common issues:**
- **"NEPHOS_ENDPOINT not configured"**: Update the service file with your actual API Gateway URL
- **"ECONNREFUSED"**: Backend not deployed or wrong endpoint URL
- **"401 Unauthorized"**: API Gateway authentication issue (check SAM template)
- **"ENOTFOUND"**: DNS resolution issue, check internet connectivity

### Metrics not appearing in dashboard

1. **Check agent is running:**
   ```bash
   sudo systemctl status nephos-agent
   ```

2. **Check agent logs for errors:**
   ```bash
   sudo journalctl -u nephos-agent -f
   ```

3. **Verify backend is deployed:**
   ```bash
   # From your local machine
   curl https://YOUR-API-ID.execute-api.us-east-2.amazonaws.com/ingest/vultr
   ```

4. **Check DynamoDB tables have data:**
   - Log into AWS Console
   - Navigate to DynamoDB
   - Check `CloudPulseMetrics-dev` table
   - Look for items with your `instanceId`

### High CPU usage from agent

The agent is lightweight (<1% CPU normally). If you see high usage:

1. **Increase collection interval:**
   ```bash
   sudo nano /etc/systemd/system/nephos-agent.service
   # Change: Environment="COLLECTION_INTERVAL=60000"  (60 seconds instead of 30)

   sudo systemctl daemon-reload
   sudo systemctl restart nephos-agent
   ```

2. **Check for network issues:**
   - Slow responses from backend can cause queuing
   - Check network latency to AWS region

### Restart the agent

```bash
sudo systemctl restart nephos-agent
sudo systemctl status nephos-agent
```

### Stop the agent

```bash
sudo systemctl stop nephos-agent
```

### Uninstall the agent

```bash
sudo systemctl stop nephos-agent
sudo systemctl disable nephos-agent
sudo rm /etc/systemd/system/nephos-agent.service
sudo systemctl daemon-reload
sudo rm -rf /opt/nephos-agent
```

## Advanced Configuration

### Custom Metrics Collection

Edit `/opt/nephos-agent/nephos-agent.js` to add custom metrics:

```javascript
// Add to collectMetrics() function
metrics.push({
  name: 'custom_metric_name',
  value: yourValue,
  unit: 'count',
  timestamp,
});
```

Restart after changes:
```bash
sudo systemctl restart nephos-agent
```

### Multiple Instances

To monitor multiple Vultr servers:

1. Repeat installation steps on each server
2. Use different `INSTANCE_ID` for each server
3. Use descriptive `INSTANCE_NAME` values

### Debug Mode

Enable verbose logging:

```bash
sudo nano /etc/systemd/system/nephos-agent.service
# Change: Environment="DEBUG=true"

sudo systemctl daemon-reload
sudo systemctl restart nephos-agent
sudo journalctl -u nephos-agent -f
```

## Security Best Practices

1. **Use HTTPS only** (default in AWS API Gateway)
2. **Rotate API keys** if using authentication
3. **Limit network access** with Vultr firewall rules
4. **Review logs** for suspicious activity
5. **Keep Node.js updated**:
   ```bash
   sudo npm install -g n
   sudo n latest
   ```

## Next Steps

After installation:

1. Check the "Insights" tab for AI-generated health summaries
2. Set up alert rules in the "Alerts" tab
3. Configure Snowflake Cortex AI for predictive insights
4. Add more Vultr servers to monitor

## Support

If you encounter issues:

1. Check logs: `sudo journalctl -u nephos-agent -n 100`
2. Verify configuration values
3. Test backend endpoint manually with `curl`
4. Check AWS CloudWatch logs for Lambda errors
