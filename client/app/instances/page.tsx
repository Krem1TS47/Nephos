'use client';

import { useInstances, useDeleteInstance } from '@/app/lib/hooks';
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
import { Server, CheckCircle2, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import type { InstanceStatus } from '@/app/types';

export default function InstancesPage() {
  const [filterStatus, setFilterStatus] = useState<InstanceStatus | 'all'>('all');

  const {
    instances,
    loading,
    error,
    refetch,
  } = useInstances({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.instances,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  const { deleteInstance, loading: deleting } = useDeleteInstance();

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete instance "${name}"?`)) {
      const success = await deleteInstance(id);
      if (success) {
        refetch();
      }
    }
  };

  if (error) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load instances: {error.message}
            <button onClick={refetch} className="ml-4 underline hover:no-underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const healthyCount = instances.filter((i) => i.status === 'healthy').length;
  const unhealthyCount = instances.filter((i) => i.status === 'unhealthy').length;
  const warningCount = instances.filter((i) => i.status === 'warning').length;
  const unknownCount = instances.filter((i) => i.status === 'unknown').length;

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Instances</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage cloud service instances
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as InstanceStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instances</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="unhealthy">Unhealthy</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {healthyCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Unhealthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {unhealthyCount}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 dark:bg-yellow-950">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {warningCount}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unknown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unknownCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Instances List */}
      <Card>
        <CardHeader>
          <CardTitle>All Instances</CardTitle>
          <CardDescription>
            {filterStatus === 'all'
              ? 'Showing all instances'
              : `Showing ${filterStatus} instances`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : instances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Server className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Instances Found</h3>
              <p className="text-muted-foreground">
                {filterStatus === 'all'
                  ? 'Add instances to start monitoring your infrastructure'
                  : `No ${filterStatus} instances at this time`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {instances.map((instance) => (
                <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{instance.name}</CardTitle>
                      </div>
                      <Badge
                        variant={
                          instance.status === 'healthy'
                            ? 'default'
                            : instance.status === 'unhealthy'
                            ? 'destructive'
                            : instance.status === 'warning'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {instance.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{instance.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Region:</span>
                        <span className="font-medium">{instance.region}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-muted-foreground">Endpoint:</span>
                        <span className="text-xs font-mono bg-muted p-1 rounded break-all">
                          {instance.endpoint}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
                      <div>ID: {instance.id.substring(0, 16)}...</div>
                      <div>Created: {new Date(instance.createdAt).toLocaleDateString()}</div>
                      {instance.lastHealthCheck && (
                        <div>
                          Last Check: {new Date(instance.lastHealthCheck).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleDelete(instance.id, instance.name)}
                        disabled={deleting}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
