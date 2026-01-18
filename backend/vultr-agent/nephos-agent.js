#!/usr/bin/env node

/**
 * Nephos Vultr Monitoring Agent
 *
 * This agent runs on your Vultr server and sends system metrics
 * to your Nephos backend for real-time monitoring and AI analysis.
 *
 * Installation:
 * 1. npm install axios
 * 2. Configure NEPHOS_ENDPOINT and INSTANCE_ID below
 * 3. Run as systemd service (see nephos-agent.service)
 */

const os = require('os');
const axios = require('axios');
const { execSync } = require('child_process');

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // Your Nephos API Gateway Ingestion Endpoint
  // Get this after deploying backend: sam deploy outputs "VultrIngestionEndpoint"
  NEPHOS_ENDPOINT: process.env.NEPHOS_ENDPOINT || 'https://your-api-id.execute-api.us-east-2.amazonaws.com/ingest/vultr',

  // Vultr Instance ID (get from Vultr dashboard or API)
  INSTANCE_ID: process.env.INSTANCE_ID || 'your-vultr-instance-id',

  // Instance metadata
  INSTANCE_NAME: process.env.INSTANCE_NAME || os.hostname(),
  REGION: process.env.VULTR_REGION || 'ewr',
  INSTANCE_TYPE: process.env.INSTANCE_TYPE || 'vultr-compute',

  // Health check endpoint (optional - your app's health endpoint)
  HEALTH_ENDPOINT: process.env.HEALTH_ENDPOINT || '',

  // Collection interval (milliseconds)
  INTERVAL: parseInt(process.env.COLLECTION_INTERVAL || '30000', 10), // 30 seconds

  // Enable debug logging
  DEBUG: process.env.DEBUG === 'true',
};

// ========================================
// METRICS COLLECTION
// ========================================

/**
 * Collect CPU usage percentage
 */
function getCpuUsage() {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle) / total;

  return parseFloat(usage.toFixed(2));
}

/**
 * Collect memory usage
 */
function getMemoryUsage() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usagePercent = (usedMem / totalMem) * 100;

  return {
    total: Math.round(totalMem / 1024 / 1024), // MB
    used: Math.round(usedMem / 1024 / 1024), // MB
    free: Math.round(freeMem / 1024 / 1024), // MB
    percent: parseFloat(usagePercent.toFixed(2)),
  };
}

/**
 * Collect disk usage (Linux only)
 */
function getDiskUsage() {
  try {
    // Get disk usage for root partition
    const output = execSync("df -h / | tail -1 | awk '{print $5}'", {
      encoding: 'utf8',
    }).trim();

    const percent = parseFloat(output.replace('%', ''));

    // Get total and used space
    const dfOutput = execSync("df -BM / | tail -1", { encoding: 'utf8' }).trim();
    const parts = dfOutput.split(/\s+/);

    return {
      total: parseInt(parts[1].replace('M', ''), 10),
      used: parseInt(parts[2].replace('M', ''), 10),
      available: parseInt(parts[3].replace('M', ''), 10),
      percent,
    };
  } catch (error) {
    console.error('Failed to get disk usage:', error.message);
    return { total: 0, used: 0, available: 0, percent: 0 };
  }
}

/**
 * Collect network statistics
 */
function getNetworkStats() {
  try {
    const interfaces = os.networkInterfaces();
    let totalRx = 0;
    let totalTx = 0;

    // On Linux, read from /proc/net/dev
    if (process.platform === 'linux') {
      const output = execSync('cat /proc/net/dev', { encoding: 'utf8' });
      const lines = output.split('\n').slice(2); // Skip headers

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 10) {
          totalRx += parseInt(parts[1], 10) || 0; // Receive bytes
          totalTx += parseInt(parts[9], 10) || 0; // Transmit bytes
        }
      });
    }

    return {
      rxBytes: totalRx,
      txBytes: totalTx,
      rxMB: parseFloat((totalRx / 1024 / 1024).toFixed(2)),
      txMB: parseFloat((totalTx / 1024 / 1024).toFixed(2)),
    };
  } catch (error) {
    console.error('Failed to get network stats:', error.message);
    return { rxBytes: 0, txBytes: 0, rxMB: 0, txMB: 0 };
  }
}

/**
 * Get system load average
 */
function getLoadAverage() {
  const loadavg = os.loadavg();
  return {
    load1: parseFloat(loadavg[0].toFixed(2)),
    load5: parseFloat(loadavg[1].toFixed(2)),
    load15: parseFloat(loadavg[2].toFixed(2)),
  };
}

/**
 * Perform health check on local endpoint
 */
async function performHealthCheck() {
  if (!CONFIG.HEALTH_ENDPOINT) {
    return { status: 'healthy', latency: 0 };
  }

  const startTime = Date.now();
  try {
    const response = await axios.get(CONFIG.HEALTH_ENDPOINT, {
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status
    });

    const latency = Date.now() - startTime;
    const status = response.status >= 200 && response.status < 300 ? 'healthy' : 'degraded';

    return { status, latency, httpStatus: response.status };
  } catch (error) {
    return { status: 'unhealthy', latency: Date.now() - startTime, error: error.message };
  }
}

/**
 * Collect all metrics
 */
async function collectMetrics() {
  const timestamp = new Date().toISOString();
  const memory = getMemoryUsage();
  const disk = getDiskUsage();
  const network = getNetworkStats();
  const load = getLoadAverage();
  const health = await performHealthCheck();

  const metrics = [
    {
      name: 'cpu_usage',
      value: getCpuUsage(),
      unit: 'percent',
      timestamp,
    },
    {
      name: 'memory_usage_percent',
      value: memory.percent,
      unit: 'percent',
      timestamp,
    },
    {
      name: 'memory_used_mb',
      value: memory.used,
      unit: 'megabytes',
      timestamp,
    },
    {
      name: 'memory_free_mb',
      value: memory.free,
      unit: 'megabytes',
      timestamp,
    },
    {
      name: 'disk_usage_percent',
      value: disk.percent,
      unit: 'percent',
      timestamp,
    },
    {
      name: 'disk_used_mb',
      value: disk.used,
      unit: 'megabytes',
      timestamp,
    },
    {
      name: 'disk_available_mb',
      value: disk.available,
      unit: 'megabytes',
      timestamp,
    },
    {
      name: 'load_average_1min',
      value: load.load1,
      unit: 'count',
      timestamp,
    },
    {
      name: 'load_average_5min',
      value: load.load5,
      unit: 'count',
      timestamp,
    },
    {
      name: 'load_average_15min',
      value: load.load15,
      unit: 'count',
      timestamp,
    },
    {
      name: 'network_rx_mb',
      value: network.rxMB,
      unit: 'megabytes',
      timestamp,
    },
    {
      name: 'network_tx_mb',
      value: network.txMB,
      unit: 'megabytes',
      timestamp,
    },
  ];

  if (health.latency > 0) {
    metrics.push({
      name: 'response_time_ms',
      value: health.latency,
      unit: 'milliseconds',
      timestamp,
    });
  }

  return {
    metrics,
    health: {
      status: health.status,
      lastCheck: timestamp,
    },
  };
}

// ========================================
// DATA TRANSMISSION
// ========================================

/**
 * Send metrics to Nephos backend
 */
async function sendMetrics(metricsData) {
  const payload = {
    instanceId: CONFIG.INSTANCE_ID,
    instanceName: CONFIG.INSTANCE_NAME,
    region: CONFIG.REGION,
    instanceType: CONFIG.INSTANCE_TYPE,
    endpoint: CONFIG.HEALTH_ENDPOINT || '',
    metrics: metricsData.metrics,
    health: metricsData.health,
  };

  if (CONFIG.DEBUG) {
    console.log('Sending payload:', JSON.stringify(payload, null, 2));
  }

  try {
    const response = await axios.post(CONFIG.NEPHOS_ENDPOINT, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`[${new Date().toISOString()}] Metrics sent successfully:`, response.data);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send metrics:`, error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
    return false;
  }
}

// ========================================
// MAIN LOOP
// ========================================

/**
 * Main monitoring loop
 */
async function monitoringLoop() {
  console.log('Nephos Agent Starting...');
  console.log('Configuration:', {
    endpoint: CONFIG.NEPHOS_ENDPOINT,
    instanceId: CONFIG.INSTANCE_ID,
    instanceName: CONFIG.INSTANCE_NAME,
    interval: `${CONFIG.INTERVAL / 1000}s`,
  });
  console.log('---');

  // Validate configuration
  if (CONFIG.NEPHOS_ENDPOINT.includes('your-api-id')) {
    console.error('ERROR: Please configure NEPHOS_ENDPOINT in the script or environment variable');
    process.exit(1);
  }

  if (CONFIG.INSTANCE_ID === 'your-vultr-instance-id') {
    console.error('ERROR: Please configure INSTANCE_ID in the script or environment variable');
    process.exit(1);
  }

  // Main collection loop
  setInterval(async () => {
    try {
      const metricsData = await collectMetrics();
      await sendMetrics(metricsData);
    } catch (error) {
      console.error('Error in monitoring loop:', error);
    }
  }, CONFIG.INTERVAL);

  // Send initial metrics immediately
  try {
    const metricsData = await collectMetrics();
    await sendMetrics(metricsData);
  } catch (error) {
    console.error('Error sending initial metrics:', error);
  }
}

// ========================================
// SIGNAL HANDLERS
// ========================================

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// ========================================
// START
// ========================================

if (require.main === module) {
  monitoringLoop();
}

module.exports = { collectMetrics, sendMetrics };
