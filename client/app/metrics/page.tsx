'use client';

import { useMetrics } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MetricsPage() {
  const {
    metrics,
    loading,
    error,
    refetch,
  } = useMetrics({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.metrics,
  });

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load metrics: {error.message}
            <button onClick={refetch} className="ml-4 underline hover:no-underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Group metrics by name for stats
  const metricsByName = metrics.reduce((acc, metric) => {
    if (!acc[metric.metricName]) {
      acc[metric.metricName] = [];
    }
    acc[metric.metricName].push(metric);
    return acc;
  }, {} as Record<string, typeof metrics>);

  const uniqueMetricNames = Object.keys(metricsByName);

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Metrics</h1>
        <p className="text-muted-foreground mt-2">
          Real-time performance metrics from your infrastructure
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unique Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueMetricNames.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Instances Monitored</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(metrics.map((m) => m.instanceId)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Latest Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {metrics.length > 0
                ? new Date(
                    Math.max(...metrics.map((m) => m.timestamp))
                  ).toLocaleTimeString()
                : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metrics by Type */}
      {uniqueMetricNames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Metrics by Type</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {uniqueMetricNames.map((metricName) => {
              const metricGroup = metricsByName[metricName];
              const latestMetric = metricGroup.sort(
                (a, b) => b.timestamp - a.timestamp
              )[0];
              const avgValue =
                metricGroup.reduce((sum, m) => sum + m.metricValue, 0) /
                metricGroup.length;

              return (
                <Card key={metricName}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{metricName}</CardTitle>
                      <Activity className="h-4 w-4 text-primary" />
                    </div>
                    <CardDescription>{metricGroup.length} readings</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Latest:</span>
                        <span className="text-lg font-bold">
                          {latestMetric.metricValue} {latestMetric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Average:</span>
                        <span className="text-sm font-medium">
                          {avgValue.toFixed(2)} {latestMetric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Max:</span>
                        <span className="text-sm font-medium">
                          {Math.max(...metricGroup.map((m) => m.metricValue)).toFixed(2)}{' '}
                          {latestMetric.unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Min:</span>
                        <span className="text-sm font-medium">
                          {Math.min(...metricGroup.map((m) => m.metricValue)).toFixed(2)}{' '}
                          {latestMetric.unit}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Last updated: {new Date(latestMetric.timestamp).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Metrics</CardTitle>
          <CardDescription>Latest metrics from all instances</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Metrics Available</h3>
              <p className="text-muted-foreground">
                Metrics will appear here once instances are monitored
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 50)
                .map((metric) => (
                  <div
                    key={metric.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Activity className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{metric.metricName}</h4>
                          {metric.tags && Object.keys(metric.tags).length > 0 && (
                            <div className="flex gap-1">
                              {Object.entries(metric.tags).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}: {value}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          Instance: {metric.instanceId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {metric.metricValue} {metric.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(metric.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
