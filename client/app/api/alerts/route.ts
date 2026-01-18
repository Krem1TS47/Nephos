import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const allAlerts = [
    {
      id: 'alert-1',
      instanceId: 'instance-4',
      alertType: 'memory_usage_critical',
      severity: 'critical',
      message: 'Memory usage is critical: 95% (threshold: 90)',
      status: 'active',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-2',
      instanceId: '17b0f286-a9e8-4a4d-a1db-54b74cb97cc3',
      alertType: 'cpu_usage_warning',
      severity: 'high',
      message: 'CPU usage is high: 78% (threshold: 70)',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-3',
      instanceId: 'instance-2',
      alertType: 'response_time_warning',
      severity: 'medium',
      message: 'Response time is high: 1200ms (threshold: 1000)',
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'alert-4',
      instanceId: 'instance-3',
      alertType: 'disk_usage_warning',
      severity: 'low',
      message: 'Disk usage: 82% (threshold: 80)',
      status: 'resolved',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const filteredAlerts = status
    ? allAlerts.filter((alert) => alert.status === status)
    : allAlerts;

  return NextResponse.json({
    alerts: filteredAlerts,
    count: filteredAlerts.length,
  });
}
