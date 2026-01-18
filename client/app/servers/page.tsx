'use client';

import { useState, useEffect } from 'react';
import { useInstances, useMetrics } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Server, Activity, Cpu, MemoryStick, HardDrive, Network, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LiveMetricChart } from '../components/live-metric-chart';
import type { Instance, Metric } from '@/app/types';

export default function ServersPage() {
    const {
        instances,
        loading: instancesLoading,
        error: instancesError,
    } = useInstances({
        autoFetch: true,
        refreshInterval: config.refreshIntervals.instances,
    });

    const {
        metrics,
        loading: metricsLoading,
    } = useMetrics({
        autoFetch: true,
        refreshInterval: 5000, // Refresh every 5 seconds for live data
    });

    const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);

    // Auto-select first instance
    useEffect(() => {
        if (instances.length > 0 && !selectedInstance) {
            setSelectedInstance(instances[0]);
        }
    }, [instances, selectedInstance]);

    // Filter metrics for selected instance
    const instanceMetrics = selectedInstance
        ? metrics.filter((m) => m.instanceId === selectedInstance.id)
        : [];

    // Group metrics by type for the selected instance
    const getMetricsByType = (metricName: string) => {
        return instanceMetrics
            .filter((m) => m.metricName === metricName)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
            .slice(-20) // Last 20 data points
            .map((m) => ({
                timestamp: m.timestamp,
                value: m.value,
            }));
    };

    if (instancesError) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <Alert variant="destructive" className="max-w-md">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load servers: {instancesError.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-background">
            <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Servers</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor individual server metrics and performance in real-time
                    </p>
                </div>

                {instancesLoading ? (
                    <div className="grid gap-6 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-32 w-full" />
                        ))}
                    </div>
                ) : instances.length === 0 ? (
                    <Alert>
                        <Server className="h-4 w-4" />
                        <AlertDescription>
                            No servers configured. Add instances to start monitoring.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-12">
                        {/* Server List */}
                        <div className="lg:col-span-3 space-y-3">
                            <h2 className="text-lg font-semibold mb-4">Your Servers</h2>
                            {instances.map((instance) => (
                                <Card
                                    key={instance.id}
                                    className={`cursor-pointer transition-all hover:shadow-md ${
                                        selectedInstance?.id === instance.id
                                            ? 'ring-2 ring-primary'
                                            : ''
                                    }`}
                                    onClick={() => setSelectedInstance(instance)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Server className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-semibold text-sm">{instance.name}</h3>
                                            </div>
                                            <Badge
                                                variant={
                                                    instance.status === 'healthy'
                                                        ? 'default'
                                                        : instance.status === 'unhealthy'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                                className="text-xs"
                                            >
                                                {instance.status}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div>{instance.provider} • {instance.region}</div>
                                            <div className="font-mono">{instance.type}</div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Server Details & Metrics */}
                        <div className="lg:col-span-9 space-y-6">
                            {selectedInstance ? (
                                <>
                                    {/* Server Info Header */}
                                    <Card>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-2xl">{selectedInstance.name}</CardTitle>
                                                    <CardDescription className="mt-2">
                                                        {selectedInstance.provider} • {selectedInstance.region} • {selectedInstance.type}
                                                    </CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {selectedInstance.status === 'healthy' ? (
                                                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                                                    ) : (
                                                        <AlertTriangle className="h-8 w-8 text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <div className="text-muted-foreground">Status</div>
                                                    <div className="font-semibold capitalize">{selectedInstance.status}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Endpoint</div>
                                                    <div className="font-mono text-xs truncate">{selectedInstance.endpoint || 'N/A'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Last Check</div>
                                                    <div className="text-xs">
                                                        {selectedInstance.lastHealthCheck
                                                            ? new Date(selectedInstance.lastHealthCheck).toLocaleTimeString()
                                                            : 'Never'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground">Instance ID</div>
                                                    <div className="font-mono text-xs truncate">{selectedInstance.id}</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Live Metrics */}
                                    {metricsLoading && instanceMetrics.length === 0 ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            {[...Array(6)].map((_, i) => (
                                                <Skeleton key={i} className="h-64 w-full" />
                                            ))}
                                        </div>
                                    ) : instanceMetrics.length === 0 ? (
                                        <Alert>
                                            <Activity className="h-4 w-4" />
                                            <AlertDescription>
                                                No metrics available for this server yet. Metrics will appear once data is collected.
                                            </AlertDescription>
                                        </Alert>
                                    ) : (
                                        <>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                {/* CPU Usage */}
                                                <LiveMetricChart
                                                    title="CPU Usage"
                                                    description="Processor utilization"
                                                    data={getMetricsByType('cpu_usage')}
                                                    color="#3b82f6"
                                                    unit="%"
                                                    maxValue={100}
                                                    showArea={true}
                                                />

                                                {/* Memory Usage */}
                                                <LiveMetricChart
                                                    title="Memory Usage"
                                                    description="RAM utilization"
                                                    data={getMetricsByType('memory_usage_percent')}
                                                    color="#8b5cf6"
                                                    unit="%"
                                                    maxValue={100}
                                                    showArea={true}
                                                />

                                                {/* Disk Usage */}
                                                <LiveMetricChart
                                                    title="Disk Usage"
                                                    description="Storage utilization"
                                                    data={getMetricsByType('disk_usage_percent')}
                                                    color="#f59e0b"
                                                    unit="%"
                                                    maxValue={100}
                                                    showArea={true}
                                                />

                                                {/* Response Time */}
                                                <LiveMetricChart
                                                    title="Response Time"
                                                    description="Average latency"
                                                    data={getMetricsByType('response_time_ms')}
                                                    color="#10b981"
                                                    unit="ms"
                                                    showArea={true}
                                                />

                                                {/* Network In */}
                                                <LiveMetricChart
                                                    title="Network In"
                                                    description="Incoming traffic"
                                                    data={getMetricsByType('network_rx_mb')}
                                                    color="#06b6d4"
                                                    unit=" MB"
                                                    showArea={true}
                                                />

                                                {/* Network Out */}
                                                <LiveMetricChart
                                                    title="Network Out"
                                                    description="Outgoing traffic"
                                                    data={getMetricsByType('network_tx_mb')}
                                                    color="#ec4899"
                                                    unit=" MB"
                                                    showArea={true}
                                                />
                                            </div>

                                            {/* System Load */}
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-base">System Load Average</CardTitle>
                                                    <CardDescription>Load over different time periods</CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {['load_average_1min', 'load_average_5min', 'load_average_15min'].map((metric, idx) => {
                                                            const data = getMetricsByType(metric);
                                                            const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
                                                            return (
                                                                <div key={metric} className="text-center p-4 border rounded-lg">
                                                                    <div className="text-2xl font-bold">{currentValue.toFixed(2)}</div>
                                                                    <div className="text-xs text-muted-foreground mt-1">
                                                                        {idx === 0 ? '1 min' : idx === 1 ? '5 min' : '15 min'}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </>
                            ) : (
                                <Card className="h-64 flex items-center justify-center">
                                    <CardContent>
                                        <div className="text-center">
                                            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <p className="text-muted-foreground">Select a server to view metrics</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
