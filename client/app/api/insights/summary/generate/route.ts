// Mock AI Summary Generate API Route
import { NextResponse } from 'next/server';
import type { InsightsSummary } from '@/app/types';

// Generate a fresh AI summary with current analysis
function generateFreshSummary(): InsightsSummary {
  const now = new Date();
  const hour = now.getHours();

  // Different summaries based on time of day for variety
  const summaries = [
    {
      summary: `**Infrastructure Health: STABLE with 2 Critical Items**\n\nYour cloud infrastructure is currently running at 80% healthy. However, immediate attention is required for the cache server (inst-004) which is experiencing severe performance degradation. Additionally, predictive analysis indicates your database server will reach capacity within 48 hours.\n\n**Key Findings:**\n• Cache server response times increased by 900% (120ms → 1,200ms)\n• Database disk usage at 82% and growing 2.5% daily\n• Network anomaly detected at 3:42 AM with 250% traffic spike\n• CPU patterns show consistent peak hours (2-4 PM)\n\n**Immediate Actions:**\n1. Restart cache service and verify configuration\n2. Provision additional database storage\n3. Investigate network anomaly for security concerns`,
      criticalInsight: {
        severity: 'high',
        description: 'Cache server performance has degraded critically - response times are 10x normal. This will impact user experience immediately.',
        recommendations: 'Restart cache service NOW. If issue persists, failover to backup cache instance.',
        affectedInstances: ['inst-004'],
      },
    },
    {
      summary: `**Infrastructure Health: GOOD with Proactive Monitoring**\n\nYour systems are performing well overall with 4 out of 5 instances healthy. AI analysis has identified several patterns and one critical prediction that requires planning.\n\n**Positive Trends:**\n• API and web servers maintaining excellent uptime\n• CPU patterns are predictable and manageable\n• Worker server performing optimally\n\n**Areas of Concern:**\n• Database capacity reaching critical threshold in 48 hours\n• Cache server showing degraded performance metrics\n• Unusual network activity detected during off-peak hours\n\n**Next 24-48 Hours:**\nFocus on database capacity expansion and cache optimization. All other systems are stable.`,
      criticalInsight: {
        severity: 'high',
        description: 'Database will reach 95% capacity in 48 hours. Running databases above 90% capacity can cause severe performance issues and potential data loss.',
        recommendations: 'Add 500GB storage immediately or archive data older than 90 days.',
        affectedInstances: ['inst-003'],
      },
    },
    {
      summary: `**Infrastructure Health: REQUIRES ATTENTION**\n\nSnowflake Cortex AI has analyzed 12,450 metrics across 5 instances over the past 24 hours. Overall health score: 75/100.\n\n**Critical Findings:**\n• Cache server (inst-004): Cache hit rate dropped from 95% to 45%\n• Database server (inst-003): Projected to hit capacity in 2 days\n• Network anomaly: 250% spike detected at unusual time\n\n**Predicted Issues (Next 7 Days):**\n1. Database storage exhaustion (48 hours)\n2. Potential traffic overflow during Black Friday (if applicable)\n3. Routine maintenance needed for worker server\n\n**Recommended Priority:**\n🔴 HIGH: Address cache and database issues within 24 hours\n🟡 MEDIUM: Plan capacity scaling for upcoming traffic events\n🟢 LOW: Schedule routine maintenance`,
      criticalInsight: {
        severity: 'high',
        description: 'Multiple critical issues detected: cache degradation AND database capacity concerns. These compound to create potential system-wide failure risk.',
        recommendations: 'Form incident response team. Address cache immediately, then database capacity. Monitor closely for next 48 hours.',
        affectedInstances: ['inst-003', 'inst-004'],
      },
    },
  ];

  // Pick summary based on time for variety
  const selectedSummary = summaries[hour % summaries.length];

  return {
    summary: selectedSummary.summary,
    overallHealthScore: 75,
    totalInsights: 7,
    criticalInsight: selectedSummary.criticalInsight,
    generatedAt: now.toISOString(),
    metadata: {
      aiModel: 'Snowflake Cortex - Mistral Large',
      analysisTimeMs: 1847,
      metricsAnalyzed: 12450,
      timeRange: '24 hours',
      confidence: 0.89,
    },
  };
}

export async function POST(request: Request) {
  try {
    // Simulate AI processing delay (2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 2500));

    const freshSummary = generateFreshSummary();

    return NextResponse.json(freshSummary);
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI summary' },
      { status: 500 }
    );
  }
}
