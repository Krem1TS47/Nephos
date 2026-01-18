import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const severity = searchParams.get('severity');

  const allInsights = [
    {
      id: 'insight-1',
      type: 'pattern',
      severity: 'medium',
      title: 'Increasing Memory Usage Trend',
      description: 'Memory usage has been steadily increasing by 2% per day over the last week across 3 instances. At this rate, instances may reach capacity in 15 days.',
      affectedInstances: ['instance-4', 'instance-2', 'instance-3'],
      metricsAnalyzed: ['memory_usage_percent', 'memory_free_bytes'],
      confidenceScore: 0.85,
      recommendations: 'Consider scaling up memory or investigating memory leaks in applications.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_model: 'mistral-large',
        analysis_type: 'pattern',
      },
    },
    {
      id: 'insight-2',
      type: 'anomaly',
      severity: 'high',
      title: 'CPU Spike Detected on Instance-4',
      description: 'CPU usage spiked to 95% at 14:23 UTC, which is 4.2 standard deviations above the 24-hour baseline of 35%. This anomaly correlates with increased network traffic.',
      affectedInstances: ['instance-4'],
      metricsAnalyzed: ['cpu_usage', 'network_in', 'network_out'],
      confidenceScore: 0.92,
      recommendations: 'Investigate processes running at 14:23 UTC. Consider implementing auto-scaling rules or upgrading instance type.',
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_model: 'mistral-large',
        analysis_type: 'anomaly',
      },
    },
    {
      id: 'insight-3',
      type: 'prediction',
      severity: 'medium',
      title: 'Potential Disk Space Issue in 48 Hours',
      description: 'Based on current trends, instance-3 will reach 90% disk capacity within 48 hours. Disk usage is growing at 5GB per day with current usage at 75%.',
      affectedInstances: ['instance-3'],
      metricsAnalyzed: ['disk_usage_percent', 'disk_used_bytes'],
      confidenceScore: 0.78,
      recommendations: 'Clear old logs, expand disk size to at least 200GB, or implement automated log rotation policies.',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_model: 'mistral-large',
        analysis_type: 'prediction',
        predicted_timeframe: '48 hours',
      },
    },
    {
      id: 'insight-4',
      type: 'pattern',
      severity: 'low',
      title: 'Consistent Low Load During Off-Peak Hours',
      description: 'Analysis shows that CPU and memory usage drop significantly between 2 AM - 6 AM UTC across all instances. Average utilization during this period is only 15%.',
      affectedInstances: ['17b0f286-a9e8-4a4d-a1db-54b74cb97cc3', 'instance-2', 'instance-5'],
      metricsAnalyzed: ['cpu_usage', 'memory_usage_percent', 'load_average_1min'],
      confidenceScore: 0.91,
      recommendations: 'Consider scheduling resource-intensive batch jobs during off-peak hours or reducing instance sizes during these periods with auto-scaling.',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_model: 'mistral-large',
        analysis_type: 'pattern',
      },
    },
    {
      id: 'insight-5',
      type: 'anomaly',
      severity: 'low',
      title: 'Unusual Network Traffic Pattern',
      description: 'Network outbound traffic on instance-2 showed an unusual spike of 500MB at 16:45 UTC, while all other metrics remained normal.',
      affectedInstances: ['instance-2'],
      metricsAnalyzed: ['network_out', 'network_in'],
      confidenceScore: 0.73,
      recommendations: 'Review application logs around 16:45 UTC. This could be legitimate batch processing or data export.',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ai_model: 'mistral-large',
        analysis_type: 'anomaly',
      },
    },
  ];

  let filteredInsights = allInsights;

  if (type) {
    filteredInsights = filteredInsights.filter((insight) => insight.type === type);
  }

  if (severity) {
    filteredInsights = filteredInsights.filter((insight) => insight.severity === severity);
  }

  return NextResponse.json({
    insights: filteredInsights,
    count: filteredInsights.length,
  });
}
