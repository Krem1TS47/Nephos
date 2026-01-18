// Mock AI Insights Generate API Route
import { NextResponse } from 'next/server';
import type { AIInsight, InsightsListResponse } from '@/app/types';

// Generate fresh mock insights with current timestamp
function generateFreshInsights(): AIInsight[] {
  const now = new Date();
  const insights: AIInsight[] = [];

  // Pattern insights
  insights.push({
    id: `insight-pattern-${now.getTime()}-1`,
    type: 'pattern',
    severity: 'medium',
    title: 'CPU usage follows daily traffic pattern',
    description: 'CPU utilization consistently peaks between 2PM-4PM EST, correlating with user traffic patterns. Average increase of 45% during peak hours.',
    affectedInstances: ['inst-001', 'inst-002'],
    confidenceScore: 0.92,
    recommendations: 'Consider auto-scaling policies to handle peak traffic more efficiently.',
    metadata: {
      peakHours: '14:00-16:00 EST',
      avgIncrease: '45%',
      pattern: 'daily',
    },
    createdAt: now.toISOString(),
  });

  insights.push({
    id: `insight-pattern-${now.getTime()}-2`,
    type: 'pattern',
    severity: 'low',
    title: 'Memory usage gradually increasing',
    description: 'Memory consumption has increased by 15% over the past 7 days, suggesting potential memory leak or increased data volume.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.78,
    recommendations: 'Review application for memory leaks and optimize data caching strategies.',
    metadata: {
      increase: '15%',
      timeframe: '7 days',
    },
    createdAt: now.toISOString(),
  });

  // Anomaly insights
  insights.push({
    id: `insight-anomaly-${now.getTime()}-1`,
    type: 'anomaly',
    severity: 'high',
    title: 'Unusual spike in network traffic',
    description: 'Network outbound traffic exceeded baseline by 250% at 3:42 AM. This is unusual for off-peak hours.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.88,
    recommendations: 'Investigate for potential security breach or unauthorized data transfer. Review access logs.',
    metadata: {
      timestamp: new Date(now.getTime() - 6 * 3600 * 1000).toISOString(),
      spike: '250%',
      baseline: '150 MB/s',
      actual: '525 MB/s',
    },
    createdAt: now.toISOString(),
  });

  insights.push({
    id: `insight-anomaly-${now.getTime()}-2`,
    type: 'anomaly',
    severity: 'high',
    title: 'Cache server showing degraded performance',
    description: 'Response times increased from 120ms to 1,200ms. Cache hit rate dropped from 95% to 45%.',
    affectedInstances: ['inst-004'],
    confidenceScore: 0.95,
    recommendations: 'Critical: Restart cache service and verify Redis/Memcached configuration. Check for memory pressure.',
    metadata: {
      normalResponseTime: '120ms',
      currentResponseTime: '1200ms',
      cacheHitRate: '45%',
    },
    createdAt: now.toISOString(),
  });

  // Prediction insights
  insights.push({
    id: `insight-prediction-${now.getTime()}-1`,
    type: 'prediction',
    severity: 'high',
    title: 'Database server will reach capacity in 48 hours',
    description: 'Based on current growth rate, database disk usage will reach 95% capacity within 48 hours. Current usage: 82%.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.91,
    recommendations: 'Immediate action required: Provision additional storage or archive old data. Consider implementing data retention policies.',
    metadata: {
      currentUsage: '82%',
      projectedUsage: '95%',
      timeToCapacity: '48 hours',
      growthRate: '2.5% per day',
    },
    createdAt: now.toISOString(),
  });

  insights.push({
    id: `insight-prediction-${now.getTime()}-2`,
    type: 'prediction',
    severity: 'medium',
    title: 'API server may experience downtime during Black Friday',
    description: 'Historical patterns suggest 3x traffic increase during Black Friday. Current infrastructure can handle 2.2x maximum.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.82,
    recommendations: 'Scale up API server capacity before Nov 24. Add 2 additional instances to handle projected load.',
    metadata: {
      projectedIncrease: '3x',
      currentCapacity: '2.2x',
      event: 'Black Friday',
      date: '2024-11-24',
    },
    createdAt: now.toISOString(),
  });

  insights.push({
    id: `insight-prediction-${now.getTime()}-3`,
    type: 'prediction',
    severity: 'low',
    title: 'Worker server will need routine maintenance soon',
    description: 'Worker server uptime will reach 90 days in 5 days. Recommend scheduled maintenance window.',
    affectedInstances: ['inst-005'],
    confidenceScore: 0.85,
    recommendations: 'Schedule maintenance window during low-traffic hours (2-4 AM) within next week.',
    metadata: {
      currentUptime: '85 days',
      recommendedMaintenanceInterval: '90 days',
    },
    createdAt: now.toISOString(),
  });

  return insights;
}

export async function POST(request: Request) {
  try {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const freshInsights = generateFreshInsights();

    const response: InsightsListResponse = {
      insights: freshInsights,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
