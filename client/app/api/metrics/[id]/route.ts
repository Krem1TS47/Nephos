// Mock Metric by ID API Route
import { NextResponse } from 'next/server';
import type { Metric } from '@/app/types';

// Generate a single mock metric for demonstration
const createMockMetric = (id: string): Metric => {
  return {
    id,
    instanceId: 'inst-001',
    metricName: 'cpu_usage',
    value: Math.random() * 100,
    unit: 'percent',
    timestamp: new Date().toISOString(),
    metadata: {
      region: 'ewr',
      provider: 'vultr',
    },
  };
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // In a real implementation, we would look up the metric by ID
    // For now, we'll create a mock metric with the requested ID
    const metric = createMockMetric(params.id);

    return NextResponse.json(metric);
  } catch (error) {
    console.error('Error fetching metric:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metric' },
      { status: 500 }
    );
  }
}
