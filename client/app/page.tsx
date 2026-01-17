'use client';

import { useDashboard, useActiveAlerts } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';
import { StatsCard } from './components/stats-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Server, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.dashboard,
  });

  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useActiveAlerts({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.alerts,
  });

  if (dashboardError) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard: {dashboardError.message}
            <button
              onClick={refetchDashboard}
              className="ml-4 underline hover:no-underline"
            >
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your cloud infrastructure in real-time
        </p>
      </div>

      {/* Stats Cards */}
      {dashboardLoading && !dashboard ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : dashboard?.summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatsCard
            title="Total Instances"
            value={dashboard.summary.totalInstances}
            description="Monitored services"
            icon={Server}
            variant="default"
          />

          <StatsCard
            title="Healthy Instances"
            value={dashboard.summary.healthyInstances}
            description={`${dashboard.summary.totalInstances > 0 ? Math.round((dashboard.summary.healthyInstances / dashboard.summary.totalInstances) * 100) : 0}% uptime`}
            icon={CheckCircle2}
            variant="success"
          />

          <StatsCard
            title="Active Alerts"
            value={dashboard.summary.activeAlerts}
            description="Requiring attention"
            icon={AlertTriangle}
            variant={dashboard.summary.activeAlerts > 0 ? 'warning' : 'default'}
          />

          <StatsCard
            title="Critical Alerts"
            value={dashboard.summary.criticalAlerts}
            description="High priority"
            icon={AlertTriangle}
            variant={dashboard.summary.criticalAlerts > 0 ? 'danger' : 'default'}
          />

          <StatsCard
            title="Avg Latency"
            value={`${dashboard.summary.avgLatency.toFixed(0)}ms`}
            description="Response time"
            icon={Clock}
            variant={dashboard.summary.avgLatency > 1000 ? 'warning' : 'success'}
          />
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            No monitoring data available. Add instances to start monitoring.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Active Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Recent Alerts */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>Latest alerts from your infrastructure</CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : alertsError ? (
                  <Alert variant="destructive">
                    <AlertDescription>
                      Failed to load alerts: {alertsError.message}
                    </AlertDescription>
                  </Alert>
                ) : alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">No active alerts</p>
                    <p className="text-sm text-muted-foreground">
                      All systems are running smoothly
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{alert.alertType}</h4>
                            <Badge
                              variant={
                                alert.severity === 'critical'
                                  ? 'destructive'
                                  : alert.severity === 'high'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instances Status */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Instance Status</CardTitle>
                <CardDescription>Health overview of monitored instances</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : dashboard?.instances && dashboard.instances.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.instances.slice(0, 5).map((instance) => (
                      <div
                        key={instance.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{instance.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {instance.type} • {instance.region}
                          </p>
                        </div>
                        <Badge
                          variant={
                            instance.status === 'healthy'
                              ? 'default'
                              : instance.status === 'unhealthy'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {instance.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Server className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No instances configured</p>
                    <p className="text-sm text-muted-foreground">
                      Add instances to start monitoring
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {dashboardLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : dashboard?.recentMetrics && dashboard.recentMetrics.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recent Metrics</CardTitle>
                <CardDescription>Latest performance metrics from your infrastructure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.recentMetrics.slice(0, 10).map((metric) => (
                    <div
                      key={metric.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <Activity className="h-4 w-4 text-primary" />
                        <div>
                          <h4 className="font-medium">{metric.metricName}</h4>
                          <p className="text-xs text-muted-foreground font-mono">
                            Instance: {metric.instanceId.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {metric.metricValue} {metric.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No metrics available</p>
                <p className="text-sm text-muted-foreground">
                  Metrics will appear here once instances are monitored
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>All active alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">All Clear!</h3>
                  <p className="text-muted-foreground">
                    No active alerts at this time
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{alert.alertType}</h4>
                          <Badge
                            variant={
                              alert.severity === 'critical'
                                ? 'destructive'
                                : alert.severity === 'high'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {alert.message}
                        </p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Instance: {alert.instanceId.substring(0, 12)}...</span>
                          <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
