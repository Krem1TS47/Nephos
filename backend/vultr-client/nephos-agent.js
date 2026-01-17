#!/usr/bin/env node

/**
 * Nephos Vultr Agent
 *
 * This script runs on your Vultr server and collects system metrics,
 * then sends them to the Nephos AWS Lambda API endpoints.
 *
 * Usage:
 *   node nephos-agent.js
 *
 * Environment Variables:
 *   NEPHOS_API_URL - The AWS API Gateway URL
 *   NEPHOS_INSTANCE_ID - Unique identifier for this server
 *   NEPHOS_INSTANCE_NAME - Human-readable name for this server
 *   NEPHOS_REGION - Region identifier (e.g., 'us-east-1')
 *   NEPHOS_CHECK_INTERVAL - Interval in milliseconds (default: 30000)
 */

const os = require('os');
const https = require('https');
const http = require('http');

// Configuration
const config = {
  apiUrl: process.env.NEPHOS_API_URL || 'http://localhost:3000',
  instanceId: process.env.NEPHOS_INSTANCE_ID || generateInstanceId(),
  instanceName: process.env.NEPHOS_INSTANCE_NAME || os.hostname(),
  region: process.env.NEPHOS_REGION || 'vultr-default',
  checkInterval: parseInt(process.env.NEPHOS_CHECK_INTERVAL || '30000'),
  alertThresholds: {
    cpuPercent: parseFloat(process.env.ALERT_CPU_THRESHOLD || '80'),
    memoryPercent: parseFloat(process.env.ALERT_MEMORY_THRESHOLD || '85'),
    diskPercent: parseFloat(process.env.ALERT_DISK_THRESHOLD || '90'),
  },
};

// Generate a unique instance ID based on hostname and MAC address
function generateInstanceId() {
  const networkInterfaces = os.networkInterfaces();
  const macAddress = Object.values(networkInterfaces)
    .flat()
    .find(iface => iface && iface.mac && iface.mac !== '00:00:00:00:00:00')
    ?.mac || 'unknown';

  return `vultr-${os.hostname()}-${macAddress.replace(/:/g, '')}`;
}

// Make HTTP(S) request
function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(config.apiUrl + endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData || '{}'));
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Register this instance
async function registerInstance() {
  const instanceData = {
    name: config.instanceName,
    type: 'vultr-server',
    region: config.region,
    endpoint: `http://${os.hostname()}`,
    metadata: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      hostname: os.hostname(),
    },
  };

  try {
    const response = await makeRequest('POST', '/instances', instanceData);
    console.log(`✅ Instance registered: ${response.id || config.instanceId}`);
    return response;
  } catch (error) {
    console.error('❌ Failed to register instance:', error.message);
    throw error;
  }
}

// Collect CPU usage
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);

  return usage;
}

// Collect memory usage
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = (usedMem / totalMem) * 100;

  return {
    total: totalMem,
    used: usedMem,
    free: freeMem,
    percent: usagePercent,
  };
}

// Collect system load
function getLoadAverage() {
  const loads = os.loadavg();
  return {
    '1min': loads[0],
    '5min': loads[1],
    '15min': loads[2],
  };
}

// Collect uptime
function getUptime() {
  return os.uptime();
}

// Send metric to API
async function sendMetric(metricName, metricValue, unit, tags = {}) {
  const metric = {
    instanceId: config.instanceId,
    metricName,
    metricValue,
    unit,
    tags,
    timestamp: Date.now(),
  };

  try {
    await makeRequest('POST', '/metrics', metric);
    console.log(`📊 Sent metric: ${metricName} = ${metricValue} ${unit}`);
  } catch (error) {
    console.error(`❌ Failed to send metric ${metricName}:`, error.message);
  }
}

// Send alert to API
async function sendAlert(alertType, severity, message) {
  const alert = {
    instanceId: config.instanceId,
    alertType,
    severity,
    message,
  };

  try {
    await makeRequest('POST', '/alerts', alert);
    console.log(`🚨 Sent alert: ${alertType} (${severity})`);
  } catch (error) {
    console.error(`❌ Failed to send alert ${alertType}:`, error.message);
  }
}

// Check thresholds and create alerts if needed
async function checkThresholds(metrics) {
  // Check CPU
  if (metrics.cpuUsage > config.alertThresholds.cpuPercent) {
    await sendAlert(
      'high_cpu_usage',
      metrics.cpuUsage > 95 ? 'critical' : 'high',
      `CPU usage is at ${metrics.cpuUsage.toFixed(2)}%`
    );
  }

  // Check Memory
  if (metrics.memoryUsage.percent > config.alertThresholds.memoryPercent) {
    await sendAlert(
      'high_memory_usage',
      metrics.memoryUsage.percent > 95 ? 'critical' : 'high',
      `Memory usage is at ${metrics.memoryUsage.percent.toFixed(2)}%`
    );
  }
}

// Collect and send all metrics
async function collectAndSendMetrics() {
  try {
    const cpuUsage = getCpuUsage();
    const memoryUsage = getMemoryUsage();
    const loadAvg = getLoadAverage();
    const uptime = getUptime();

    const metrics = {
      cpuUsage,
      memoryUsage,
      loadAvg,
      uptime,
    };

    // Send metrics
    await sendMetric('cpu_usage', cpuUsage, 'percent');
    await sendMetric('memory_usage', memoryUsage.used, 'bytes');
    await sendMetric('memory_usage_percent', memoryUsage.percent, 'percent');
    await sendMetric('load_average_1min', loadAvg['1min'], 'load');
    await sendMetric('load_average_5min', loadAvg['5min'], 'load');
    await sendMetric('load_average_15min', loadAvg['15min'], 'load');
    await sendMetric('uptime', uptime, 'seconds');

    // Check for alerts
    await checkThresholds(metrics);

    console.log(`✅ Metrics collection cycle complete`);
  } catch (error) {
    console.error('❌ Error collecting metrics:', error.message);
  }
}

// Update instance health status
async function updateInstanceStatus(status) {
  try {
    await makeRequest('PUT', `/instances/${config.instanceId}`, {
      status,
      lastHealthCheck: new Date().toISOString(),
    });
    console.log(`💚 Instance status updated: ${status}`);
  } catch (error) {
    console.error('❌ Failed to update instance status:', error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Nephos Vultr Agent Starting...');
  console.log(`Instance ID: ${config.instanceId}`);
  console.log(`Instance Name: ${config.instanceName}`);
  console.log(`API URL: ${config.apiUrl}`);
  console.log(`Check Interval: ${config.checkInterval}ms`);
  console.log('');

  // Register instance
  try {
    await registerInstance();
    await updateInstanceStatus('healthy');
  } catch (error) {
    console.error('Failed to initialize:', error.message);
    process.exit(1);
  }

  // Initial metric collection
  await collectAndSendMetrics();

  // Set up interval for metric collection
  setInterval(async () => {
    await collectAndSendMetrics();
    await updateInstanceStatus('healthy');
  }, config.checkInterval);

  console.log('✅ Agent running. Press Ctrl+C to stop.');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  try {
    await updateInstanceStatus('unknown');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down...');
  try {
    await updateInstanceStatus('unknown');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
});

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { collectAndSendMetrics, registerInstance };
