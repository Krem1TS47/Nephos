#!/usr/bin/env node

/**
 * Vultr Monitoring Script
 *
 * This script runs on Vultr instances to collect metrics and send them
 * to the AWS Lambda ingestion endpoint.
 *
 * Usage:
 *   node vultr-monitor.js
 *
 * Set environment variables:
 *   - INGESTION_ENDPOINT: AWS Lambda function URL
 *   - VULTR_INSTANCE_ID: Vultr instance ID (from metadata service)
 *   - INSTANCE_NAME: Optional friendly name
 */

const os = require('os');
const https = require('https');
const http = require('http');

const INGESTION_ENDPOINT = process.env.INGESTION_ENDPOINT || 'https://your-lambda-url.amazonaws.com/ingest';
const VULTR_INSTANCE_ID = process.env.VULTR_INSTANCE_ID || 'unknown-instance';
const INSTANCE_NAME = process.env.INSTANCE_NAME || os.hostname();
const REGION = process.env.VULTR_REGION || 'unknown';

/**
 * Collect system metrics
 */
function collectMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  // Calculate CPU usage
  let totalIdle = 0;
  let totalTick = 0;
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);

  // Memory usage
  const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  // Load average
  const loadAvg = os.loadavg();

  // Network interfaces
  const networkInterfaces = os.networkInterfaces();
  const networkMetrics = [];

  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    interfaces.forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        networkMetrics.push({
          name: `network_${name}_ip`,
          value: iface.address,
          unit: 'string',
        });
      }
    });
  }

  const timestamp = new Date().toISOString();

  return {
    instanceId: VULTR_INSTANCE_ID,
    instanceName: INSTANCE_NAME,
    region: REGION,
    instanceType: 'vultr-compute',
    metrics: [
      {
        name: 'cpu_usage',
        value: cpuUsage,
        unit: 'percent',
        timestamp,
      },
      {
        name: 'memory_usage_percent',
        value: parseFloat(memoryUsagePercent),
        unit: 'percent',
        timestamp,
      },
      {
        name: 'memory_used_bytes',
        value: usedMem,
        unit: 'bytes',
        timestamp,
      },
      {
        name: 'memory_free_bytes',
        value: freeMem,
        unit: 'bytes',
        timestamp,
      },
      {
        name: 'load_average_1min',
        value: loadAvg[0],
        unit: 'count',
        timestamp,
      },
      {
        name: 'load_average_5min',
        value: loadAvg[1],
        unit: 'count',
        timestamp,
      },
      {
        name: 'load_average_15min',
        value: loadAvg[2],
        unit: 'count',
        timestamp,
      },
      {
        name: 'uptime_seconds',
        value: os.uptime(),
        unit: 'seconds',
        timestamp,
      },
      ...networkMetrics,
    ],
    health: {
      status: cpuUsage > 90 || parseFloat(memoryUsagePercent) > 90 ? 'unhealthy' : 'healthy',
      lastCheck: timestamp,
    },
  };
}

/**
 * Send metrics to ingestion endpoint
 */
function sendMetrics(metrics) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(metrics);
    const url = new URL(INGESTION_ENDPOINT);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = lib.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ Metrics sent successfully (${res.statusCode})`);
          console.log('Response:', responseData);
          resolve(responseData);
        } else {
          console.error(`✗ Failed to send metrics (${res.statusCode})`);
          console.error('Response:', responseData);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('✗ Error sending metrics:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  console.log('=== Vultr Metrics Monitor ===');
  console.log(`Instance: ${INSTANCE_NAME} (${VULTR_INSTANCE_ID})`);
  console.log(`Region: ${REGION}`);
  console.log(`Endpoint: ${INGESTION_ENDPOINT}`);
  console.log('');

  try {
    const metrics = collectMetrics();
    console.log(`Collected ${metrics.metrics.length} metrics`);

    await sendMetrics(metrics);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { collectMetrics, sendMetrics };
