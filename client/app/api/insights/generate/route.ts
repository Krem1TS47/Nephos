// Mock AI Insights Generate API Route
import { NextResponse } from 'next/server';
import type { AIInsight, InsightsListResponse } from '@/app/types';

// Pool of all possible insights
const insightPool: Omit<AIInsight, 'id' | 'createdAt'>[] = [
  // Pattern insights
  {
    type: 'pattern',
    severity: 'medium',
    title: 'CPU usage follows daily traffic pattern',
    description: 'CPU utilization consistently peaks between 2PM-4PM EST, correlating with user traffic patterns. Average increase of 45% during peak hours.',
    affectedInstances: ['17b0f286-a9e8-4a4d-a1db-54b74cb97cc3', 'inst-002'],
    confidenceScore: 0.92,
    recommendations: 'Consider auto-scaling policies to handle peak traffic more efficiently.',
    metadata: {
      peakHours: '14:00-16:00 EST',
      avgIncrease: '45%',
      pattern: 'daily',
    },
  },
  {
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
  },
  {
    type: 'pattern',
    severity: 'low',
    title: 'Weekly backup pattern detected',
    description: 'Database server experiences consistent CPU spike every Sunday at 2:00 AM for approximately 45 minutes. Pattern aligns with scheduled backup operations.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.96,
    recommendations: 'Pattern is expected. Consider load balancing if backup window needs to be reduced.',
    metadata: {
      pattern: 'weekly',
      day: 'Sunday',
      time: '02:00 AM',
      duration: '45 minutes',
    },
  },
  {
    type: 'pattern',
    severity: 'medium',
    title: 'Network traffic surge during business hours',
    description: 'API server shows 3x increase in network traffic between 9AM-5PM on weekdays. Weekend traffic remains stable at baseline.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.89,
    recommendations: 'Consider implementing CDN for static content to reduce network load during peak hours.',
    metadata: {
      weekdayIncrease: '300%',
      weekendTraffic: 'stable',
      peakHours: '9AM-5PM',
    },
  },
  {
    type: 'pattern',
    severity: 'low',
    title: 'Consistent disk I/O pattern on worker nodes',
    description: 'Worker servers demonstrate regular disk write patterns every 15 minutes, averaging 2.3GB per cycle. Likely related to data processing jobs.',
    affectedInstances: ['inst-005'],
    confidenceScore: 0.84,
    recommendations: 'Pattern appears normal. Monitor for deviations that could indicate job failures.',
    metadata: {
      frequency: '15 minutes',
      avgWriteSize: '2.3GB',
      consistency: 'high',
    },
  },

  // Anomaly insights
  {
    type: 'anomaly',
    severity: 'high',
    title: 'Unusual spike in network traffic',
    description: 'Network outbound traffic exceeded baseline by 250% at 3:42 AM. This is unusual for off-peak hours.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.88,
    recommendations: 'Investigate for potential security breach or unauthorized data transfer. Review access logs.',
    metadata: {
      spike: '250%',
      baseline: '150 MB/s',
      actual: '525 MB/s',
    },
  },
  {
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
  },
  {
    type: 'anomaly',
    severity: 'critical',
    title: 'Database connection pool exhaustion detected',
    description: 'Database server reached 98% connection pool utilization at 11:23 AM, causing 47 failed connection attempts.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.93,
    recommendations: 'Immediate action: Increase connection pool size and investigate application connection leaks. Review slow queries.',
    metadata: {
      poolUtilization: '98%',
      failedConnections: 47,
      timestamp: 'Today 11:23 AM',
    },
  },
  {
    type: 'anomaly',
    severity: 'high',
    title: 'Abnormal API response time spike',
    description: 'API server response time jumped to 4.2 seconds (P95) from typical 180ms. Duration: 12 minutes starting at 1:15 PM.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.91,
    recommendations: 'Investigate database queries and external API dependencies. Check for N+1 query issues.',
    metadata: {
      normalP95: '180ms',
      anomalyP95: '4200ms',
      duration: '12 minutes',
    },
  },
  {
    type: 'anomaly',
    severity: 'medium',
    title: 'Unexpected process consuming CPU',
    description: 'Unidentified process consuming 34% CPU on worker server. Process not present in baseline configuration.',
    affectedInstances: ['inst-005'],
    confidenceScore: 0.87,
    recommendations: 'Security review recommended. Identify process and verify it\'s authorized. Check for cryptocurrency mining.',
    metadata: {
      cpuUsage: '34%',
      processId: 'unknown',
      firstDetected: '2 hours ago',
    },
  },
  {
    type: 'anomaly',
    severity: 'medium',
    title: 'SSL certificate errors increasing',
    description: 'API server logging 127 SSL handshake failures in the past hour. Typical baseline: <5 per hour.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.82,
    recommendations: 'Verify SSL certificate validity and chain. Check for client-side certificate issues or potential attack.',
    metadata: {
      failures: 127,
      baseline: '<5',
      timeframe: '1 hour',
    },
  },

  // Prediction insights
  {
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
  },
  {
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
  },
  {
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
  },
  {
    type: 'prediction',
    severity: 'high',
    title: 'RAM upgrade required within 2 weeks',
    description: 'Memory usage trending upward at 4.2% per week. Projection shows 90% utilization by Feb 1st, risking OOM errors.',
    affectedInstances: ['inst-002', 'inst-005'],
    confidenceScore: 0.88,
    recommendations: 'Plan memory upgrade to 16GB or implement memory optimization. Review memory-heavy processes.',
    metadata: {
      currentUsage: '68%',
      growthRate: '4.2% per week',
      projectedDate: 'Feb 1st',
    },
  },
  {
    type: 'prediction',
    severity: 'medium',
    title: 'Cache invalidation will increase response times',
    description: 'Scheduled cache purge on Friday will temporarily increase API response times by estimated 60% for 15-20 minutes.',
    affectedInstances: ['inst-004', 'inst-002'],
    confidenceScore: 0.79,
    recommendations: 'Schedule cache purge during low-traffic window (3-4 AM). Notify stakeholders of temporary slowdown.',
    metadata: {
      scheduledTime: 'Friday 3:00 AM',
      estimatedImpact: '+60% response time',
      duration: '15-20 minutes',
    },
  },
  {
    type: 'prediction',
    severity: 'critical',
    title: 'Log storage will exceed quota in 72 hours',
    description: 'Application logs growing at 12GB/day. Current available space: 38GB. Will exceed storage quota by Monday.',
    affectedInstances: ['17b0f286-a9e8-4a4d-a1db-54b74cb97cc3', 'inst-002'],
    confidenceScore: 0.94,
    recommendations: 'Urgent: Implement log rotation, archive old logs to S3, or increase storage allocation before Monday.',
    metadata: {
      growthRate: '12GB per day',
      availableSpace: '38GB',
      timeToQuota: '72 hours',
    },
  },

  // Recommendation insights
  {
    type: 'recommendation',
    severity: 'medium',
    title: 'Enable CloudWatch detailed monitoring',
    description: 'Current 5-minute metric intervals may miss brief performance issues. 1-minute intervals would improve anomaly detection.',
    affectedInstances: ['inst-003', 'inst-005'],
    confidenceScore: 0.76,
    recommendations: 'Enable detailed monitoring for critical instances. Cost: ~$2.10/month per instance.',
    metadata: {
      currentInterval: '5 minutes',
      recommendedInterval: '1 minute',
      monthlyCost: '$2.10 per instance',
    },
  },
  {
    type: 'recommendation',
    severity: 'low',
    title: 'Optimize Docker image sizes',
    description: 'Container images average 1.2GB. Industry best practice suggests <500MB for faster deployments.',
    affectedInstances: ['inst-002', 'inst-005'],
    confidenceScore: 0.81,
    recommendations: 'Use multi-stage builds, alpine base images, and remove unnecessary dependencies. Expected 60% size reduction.',
    metadata: {
      currentAvgSize: '1.2GB',
      recommendedSize: '<500MB',
      potentialReduction: '60%',
    },
  },
  {
    type: 'recommendation',
    severity: 'medium',
    title: 'Implement database query caching',
    description: 'Analysis shows 43% of database queries are identical repeating requests. Query cache could reduce DB load significantly.',
    affectedInstances: ['inst-003'],
    confidenceScore: 0.86,
    recommendations: 'Enable MySQL query cache or implement application-level caching with Redis. Estimated 35% reduction in DB CPU.',
    metadata: {
      repeatingQueries: '43%',
      estimatedCpuReduction: '35%',
      implementationEffort: 'Medium',
    },
  },
  {
    type: 'recommendation',
    severity: 'high',
    title: 'Add health check endpoints',
    description: 'API server lacks standardized health check endpoints (/health, /ready). This limits monitoring capabilities.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.90,
    recommendations: 'Implement /health for liveness checks and /ready for readiness probes. Critical for Kubernetes deployments.',
    metadata: {
      currentHealthChecks: 'none',
      recommendedEndpoints: ['/health', '/ready', '/metrics'],
      priority: 'high',
    },
  },
  {
    type: 'recommendation',
    severity: 'low',
    title: 'Configure GZIP compression',
    description: 'API responses averaging 245KB without compression. GZIP could reduce bandwidth by 70-80%.',
    affectedInstances: ['inst-002'],
    confidenceScore: 0.83,
    recommendations: 'Enable GZIP compression in NGINX/Apache config. Improves response times for clients on slower connections.',
    metadata: {
      avgResponseSize: '245KB',
      estimatedReduction: '70-80%',
      configurationTime: '<30 minutes',
    },
  },
];

// Shuffle array helper
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate fresh mock insights with current timestamp
// Randomly selects 10-12 insights from the pool
function generateFreshInsights(): AIInsight[] {
  const now = new Date();
  const numInsights = 10 + Math.floor(Math.random() * 3); // 10-12 insights

  // Shuffle the pool and take the first N insights
  const shuffled = shuffleArray(insightPool);
  const selectedInsights = shuffled.slice(0, numInsights);

  // Add IDs and timestamps
  return selectedInsights.map((insight, index) => ({
    ...insight,
    id: `insight-${insight.type}-${now.getTime()}-${index}`,
    createdAt: now.toISOString(),
  }));
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
