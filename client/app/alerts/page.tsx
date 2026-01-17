'use client';

import { useAlerts, useUpdateAlert, useDeleteAlert } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Trash2, Check } from 'lucide-react';
import { useState } from 'react';
import type { AlertStatus } from '@/app/types';

export default function AlertsPage() {
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');

  const {
    alerts,
    loading,
    error,
    refetch,
  } = useAlerts({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.alerts,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const { acknowledgeAlert, resolveAlert, loading: updating } = useUpdateAlert();
  const { deleteAlert, loading: deleting } = useDeleteAlert();

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    refetch();
  };

  const handleResolve = async (id: string) => {
    await resolveAlert(id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this alert?')) {
      await deleteAlert(id);
      refetch();
    }
  };

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load alerts: {error.message}
            <button onClick={refetch} className="ml-4 underline hover:no-underline">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor system alerts
          </p>
        </div>

        <Select
          value={filterStatus}
          onValueChange={(value) => setFilterStatus(value as AlertStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter((a) => a.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter((a) => a.status === 'acknowledged').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter((a) => a.status === 'resolved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Alerts</CardTitle>
          <CardDescription>
            {filterStatus === 'all'
              ? 'Showing all alerts'
              : `Showing ${filterStatus} alerts`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">No Alerts Found</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'all'
                  ? 'There are no alerts in the system'
                  : `No ${filterStatus} alerts at this time`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{alert.alertType}</h3>
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'destructive'
                            : alert.severity === 'high'
                            ? 'default'
                            : alert.severity === 'medium'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline">{alert.status}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">{alert.message}</p>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">ID: {alert.id.substring(0, 8)}...</span>
                      <span className="font-mono">
                        Instance: {alert.instanceId.substring(0, 12)}...
                      </span>
                      <span>Created: {new Date(alert.createdAt).toLocaleString()}</span>
                      <span>Updated: {new Date(alert.updatedAt).toLocaleString()}</span>
                      {alert.resolvedAt && (
                        <span className="text-green-600">
                          Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {alert.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={updating || deleting}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResolve(alert.id)}
                          disabled={updating || deleting}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <Button
                        size="sm"
                        onClick={() => handleResolve(alert.id)}
                        disabled={updating || deleting}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(alert.id)}
                      disabled={updating || deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
