import { NextResponse } from 'next/server';

export async function GET() {
  const summary = {
    summary: 'Your cloud infrastructure is currently operating at 80% health. While most systems are functioning normally, there are 3 active concerns requiring attention: 1) Critical memory usage on Cache Server (95%), 2) Increasing memory trend across multiple instances, and 3) Predicted disk space shortage on Database Primary within 48 hours. Immediate action recommended for the critical memory issue. The predictive analysis suggests proactive capacity planning in the next 2 days.',
    stats: [
      { INSIGHT_TYPE: 'pattern', SEVERITY: 'medium', COUNT: 2 },
      { INSIGHT_TYPE: 'pattern', SEVERITY: 'low', COUNT: 1 },
      { INSIGHT_TYPE: 'anomaly', SEVERITY: 'high', COUNT: 1 },
      { INSIGHT_TYPE: 'anomaly', SEVERITY: 'low', COUNT: 1 },
      { INSIGHT_TYPE: 'prediction', SEVERITY: 'medium', COUNT: 1 },
    ],
    criticalInsight: {
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
    generatedAt: new Date().toISOString(),
  };

  return NextResponse.json(summary);
}
