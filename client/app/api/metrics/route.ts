// Mock Metrics API Route
import { NextResponse } from 'next/server';
import type { Metric, MetricsListResponse } from '@/app/types';

// Generate mock metrics data
function generateMockMetrics(): Metric[] {
  const metrics: Metric[] = [];
  const instances = ['17b0f286-a9e8-4a4d-a1db-54b74cb97cc3', 'inst-002', 'inst-003', 'inst-004', 'inst-005'];
  const metricNames = [
    'cpu_usage',
    'memory_usage_percent',
    'disk_usage_percent',
    'network_rx_mb',
    'network_tx_mb',
    'response_time_ms',
    'load_average_1min',
    'load_average_5min',
    'load_average_15min',
  ];

  // Generate metrics for the last 2 hours (24 data points, 5-minute intervals)
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(Date.now() - i * 5 * 60 * 1000);

    instances.forEach((instanceId) => {
      metricNames.forEach((metricName) => {
        let value: number;
        let unit: string;

        // Generate realistic values based on metric type
        switch (metricName) {
          case 'cpu_usage':
            value = 20 + Math.random() * 50;
            unit = 'percent';
            break;
          case 'memory_usage_percent':
            value = 40 + Math.random() * 40;
            unit = 'percent';
            break;
          case 'disk_usage_percent':
            value = 35 + Math.random() * 20;
            unit = 'percent';
            break;
          case 'network_rx_mb':
            value = Math.random() * 100;
            unit = 'MB';
            break;
          case 'network_tx_mb':
            value = Math.random() * 50;
            unit = 'MB';
            break;
          case 'response_time_ms':
            value = 100 + Math.random() * 400;
            unit = 'ms';
            break;
          case 'load_average_1min':
            value = Math.random() * 2;
            unit = 'count';
            break;
          case 'load_average_5min':
            value = Math.random() * 1.8;
            unit = 'count';
            break;
          case 'load_average_15min':
            value = Math.random() * 1.5;
            unit = 'count';
            break;
          default:
            value = Math.random() * 100;
            unit = 'unknown';
        }

        metrics.push({
          id: `metric-${instanceId}-${metricName}-${timestamp.getTime()}`,
          instanceId,
          metricName,
          value,
          unit,
          timestamp: timestamp.toISOString(),
          metadata: {
            region: instanceId === '17b0f286-a9e8-4a4d-a1db-54b74cb97cc3' ? 'lax' : 'ewr',
            provider: instanceId === '17b0f286-a9e8-4a4d-a1db-54b74cb97cc3' ? 'vultr' : 'aws',
          },
        });
      });
    });
  }

  // Sort by timestamp descending (newest first)
  return metrics.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

const mockMetrics = generateMockMetrics();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');
    const metricName = searchParams.get('metricName');
    const limit = searchParams.get('limit');
    const lastEvaluatedKey = searchParams.get('lastEvaluatedKey');

    // Filter metrics
    let filteredMetrics = mockMetrics;

    if (instanceId) {
      filteredMetrics = filteredMetrics.filter((m) => m.instanceId === instanceId);
    }

    if (metricName) {
      filteredMetrics = filteredMetrics.filter((m) => m.metricName === metricName);
    }

    // Handle pagination
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const startIndex = lastEvaluatedKey
      ? filteredMetrics.findIndex((m) => m.id === lastEvaluatedKey) + 1
      : 0;
    const paginatedMetrics = filteredMetrics.slice(
      startIndex,
      startIndex + parsedLimit
    );

    const response: MetricsListResponse = {
      metrics: paginatedMetrics,
      lastEvaluatedKey:
        startIndex + parsedLimit < filteredMetrics.length
          ? paginatedMetrics[paginatedMetrics.length - 1].id
          : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Create a new metric (mock)
    const newMetric: Metric = {
      id: `metric-${Date.now()}`,
      instanceId: body.instanceId,
      metricName: body.metricName,
      value: body.value,
      unit: body.unit,
      timestamp: new Date().toISOString(),
      metadata: body.metadata || {},
    };

    return NextResponse.json(newMetric, { status: 201 });
  } catch (error) {
    console.error('Error creating metric:', error);
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    );
  }
}
