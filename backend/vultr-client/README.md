# Nephos Vultr Agent

Lightweight monitoring agent for Vultr servers that collects system metrics and sends them to your Nephos dashboard.

## Features

- 📊 **System Metrics**: CPU, memory, load average, uptime
- 🚨 **Automatic Alerts**: Threshold-based alerting for CPU and memory
- 🔄 **Auto-registration**: Automatically registers server with Nephos
- ⚡ **Lightweight**: No external dependencies, uses Node.js built-ins only
- 🛡️ **Graceful Shutdown**: Updates status on shutdown

## Quick Start

### On Your Vultr Server

1. **Install Node.js** (if not already installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Download the agent**:
```bash
mkdir -p /opt/nephos
cd /opt/nephos
# Copy nephos-agent.js to this directory
```

3. **Configure environment variables**:
```bash
export NEPHOS_API_URL="https://your-api-id.execute-api.us-east-1.amazonaws.com"
export NEPHOS_INSTANCE_NAME="Production Server 1"
export NEPHOS_REGION="vultr-nyc1"
```

4. **Run the agent**:
```bash
node nephos-agent.js
```

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NEPHOS_API_URL` | AWS API Gateway URL | `http://localhost:3000` | ✅ Yes |
| `NEPHOS_INSTANCE_ID` | Unique server ID | Auto-generated | No |
| `NEPHOS_INSTANCE_NAME` | Human-readable name | Hostname | No |
| `NEPHOS_REGION` | Region identifier | `vultr-default` | No |
| `NEPHOS_CHECK_INTERVAL` | Interval in ms | `30000` (30s) | No |
| `ALERT_CPU_THRESHOLD` | CPU alert threshold % | `80` | No |
| `ALERT_MEMORY_THRESHOLD` | Memory alert threshold % | `85` | No |
| `ALERT_DISK_THRESHOLD` | Disk alert threshold % | `90` | No |

### Example Configuration

Create a `.env` file:

```bash
NEPHOS_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com
NEPHOS_INSTANCE_NAME=Prod-Web-Server-01
NEPHOS_REGION=vultr-nyc1
NEPHOS_CHECK_INTERVAL=30000
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
```

Then run with:
```bash
source .env && node nephos-agent.js
```

## Running as a Service

### Using systemd (Ubuntu/Debian)

1. Create service file `/etc/systemd/system/nephos-agent.service`:

```ini
[Unit]
Description=Nephos Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/nephos
Environment="NEPHOS_API_URL=https://your-api.execute-api.us-east-1.amazonaws.com"
Environment="NEPHOS_INSTANCE_NAME=Production Server"
Environment="NEPHOS_REGION=vultr-nyc1"
ExecStart=/usr/bin/node /opt/nephos/nephos-agent.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nephos-agent
sudo systemctl start nephos-agent
```

3. Check status:

```bash
sudo systemctl status nephos-agent
```

4. View logs:

```bash
sudo journalctl -u nephos-agent -f
```

### Using PM2

1. Install PM2:
```bash
npm install -g pm2
```

2. Start the agent:
```bash
pm2 start nephos-agent.js --name nephos-agent
```

3. Save PM2 configuration:
```bash
pm2 save
pm2 startup
```

4. Monitor:
```bash
pm2 logs nephos-agent
pm2 monit
```

## Metrics Collected

The agent collects and sends the following metrics every 30 seconds (configurable):

| Metric Name | Unit | Description |
|-------------|------|-------------|
| `cpu_usage` | percent | CPU usage percentage |
| `memory_usage` | bytes | Used memory in bytes |
| `memory_usage_percent` | percent | Memory usage percentage |
| `load_average_1min` | load | 1-minute load average |
| `load_average_5min` | load | 5-minute load average |
| `load_average_15min` | load | 15-minute load average |
| `uptime` | seconds | System uptime |

## Alerts

The agent automatically creates alerts when:

- **CPU Usage** exceeds threshold (default: 80%)
  - Severity: `high` if > 80%, `critical` if > 95%

- **Memory Usage** exceeds threshold (default: 85%)
  - Severity: `high` if > 85%, `critical` if > 95%

## API Endpoints Used

The agent communicates with the following Nephos API endpoints:

- `POST /instances` - Register instance
- `PUT /instances/{id}` - Update instance status
- `POST /metrics` - Send metrics
- `POST /alerts` - Create alerts

## Troubleshooting

### Agent won't start

```bash
# Check Node.js version (must be >= 14)
node --version

# Check network connectivity
curl -I https://your-api-url

# Check environment variables
env | grep NEPHOS
```

### Metrics not appearing in dashboard

1. Verify API URL is correct
2. Check agent logs for errors
3. Verify AWS Lambda functions are deployed
4. Check DynamoDB tables exist
5. Verify CORS is enabled on API Gateway

### High CPU from agent

The agent is very lightweight (<1% CPU normally). If you see high CPU:

1. Increase `NEPHOS_CHECK_INTERVAL` (default: 30000ms)
2. Check for network issues causing request timeouts
3. Verify API is responding quickly

## Security Considerations

- **API Authentication**: Currently using open API. Add API keys or authentication for production.
- **HTTPS**: Always use HTTPS for API communication in production.
- **Permissions**: Run with minimal required permissions.
- **Firewall**: Ensure outbound HTTPS (443) is allowed.

## Development

### Testing Locally

```bash
# Set local API URL
export NEPHOS_API_URL=http://localhost:3000

# Run agent
node nephos-agent.js
```

### Simulating High Load

```bash
# CPU stress test
yes > /dev/null &  # Run in background
# Kill with: pkill yes

# Memory stress test
stress --vm 1 --vm-bytes 512M --timeout 60s
```

## Uninstalling

1. Stop the service:
```bash
# systemd
sudo systemctl stop nephos-agent
sudo systemctl disable nephos-agent

# PM2
pm2 stop nephos-agent
pm2 delete nephos-agent
```

2. Remove files:
```bash
sudo rm -rf /opt/nephos
sudo rm /etc/systemd/system/nephos-agent.service
```

3. Delete instance from dashboard (optional)

## Support

For issues or questions:
- Check logs: `journalctl -u nephos-agent -f` or `pm2 logs`
- Verify environment variables
- Test API connectivity
- Check Nephos dashboard for errors

## License

MIT
