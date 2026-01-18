'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cloud, Server, Database, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import type { Instance } from '@/app/types';

interface UnifiedCloudViewProps {
  instances: Instance[];
  loading?: boolean;
}

/**
 * Unified Multi-Cloud View Component
 * Single pane of glass for AWS + Vultr orchestration
 */
export function UnifiedCloudView({ instances, loading }: UnifiedCloudViewProps) {
  // Group instances by cloud provider
  const groupedByProvider = instances.reduce((acc, instance) => {
    const provider = getProviderFromInstance(instance);
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(instance);
    return acc;
  }, {} as Record<string, Instance[]>);

  const providers = Object.keys(groupedByProvider);

  // Calculate cloud-wide statistics
  const cloudStats = providers.map(provider => {
    const providerInstances = groupedByProvider[provider];
    const healthy = providerInstances.filter(i => i.status === 'healthy').length;
    const total = providerInstances.length;

    return {
      provider,
      total,
      healthy,
      unhealthy: total - healthy,
      healthPercentage: total > 0 ? (healthy / total) * 100 : 0,
      icon: getProviderIcon(provider),
      color: getProviderColor(provider)
    };
  });

  return (
    <div className="space-y-6">
      {/* Multi-Cloud Overview */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-primary" />
            <CardTitle>Multi-Cloud Overview</CardTitle>
          </div>
          <CardDescription>
            Unified view across all cloud providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cloudStats.map(stat => (
              <Card key={stat.provider} className="relative overflow-hidden">
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: stat.healthPercentage > 80
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : stat.healthPercentage > 50
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)'
                  }}
                />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stat.icon}
                      <CardTitle className="text-lg">{stat.provider}</CardTitle>
                    </div>
                    <Badge
                      variant={stat.healthPercentage > 80 ? 'default' : stat.healthPercentage > 50 ? 'secondary' : 'destructive'}
                    >
                      {stat.healthPercentage.toFixed(0)}% Healthy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Instances</span>
                      <span className="font-semibold">{stat.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Healthy</span>
                      <span className="font-semibold text-green-600">{stat.healthy}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Unhealthy</span>
                      <span className="font-semibold text-red-600">{stat.unhealthy}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Provider Views */}
      <Tabs defaultValue={providers[0] || 'all'} className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Providers</TabsTrigger>
          {providers.map(provider => (
            <TabsTrigger key={provider} value={provider}>
              {provider}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Cloud Instances</CardTitle>
              <CardDescription>
                Unified view of all instances across providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {instances.map(instance => (
                  <InstanceCard key={instance.id} instance={instance} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {providers.map(provider => (
          <TabsContent key={provider} value={provider} className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {getProviderIcon(provider)}
                  <CardTitle>{provider} Instances</CardTitle>
                </div>
                <CardDescription>
                  {groupedByProvider[provider].length} instances running on {provider}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {groupedByProvider[provider].map(instance => (
                    <InstanceCard key={instance.id} instance={instance} showProvider={false} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Instance Card Component
 */
function InstanceCard({ instance, showProvider = true }: { instance: Instance; showProvider?: boolean }) {
  const provider = getProviderFromInstance(instance);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className={`p-2 rounded-lg ${getProviderBgColor(provider)}`}>
          <Server className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{instance.name}</h4>
            {showProvider && (
              <Badge variant="outline" className="text-xs">
                {provider}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span>{instance.type}</span>
            <span>•</span>
            <span>{instance.region}</span>
            {instance.lastHealthCheck && (
              <>
                <span>•</span>
                <span>Last checked: {new Date(instance.lastHealthCheck).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
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
    </div>
  );
}

/**
 * Helper Functions
 */
function getProviderFromInstance(instance: Instance): string {
  if (instance.type?.includes('vultr')) return 'Vultr';
  if (instance.type?.includes('aws') || instance.region?.startsWith('us-')) return 'AWS';
  if (instance.type?.includes('gcp')) return 'Google Cloud';
  if (instance.type?.includes('azure')) return 'Azure';
  return 'Other';
}

function getProviderIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case 'vultr':
      return <Cloud className="h-5 w-5 text-blue-600" />;
    case 'aws':
      return <Database className="h-5 w-5 text-orange-600" />;
    case 'google cloud':
      return <Zap className="h-5 w-5 text-red-600" />;
    case 'azure':
      return <Server className="h-5 w-5 text-blue-500" />;
    default:
      return <AlertCircle className="h-5 w-5 text-gray-600" />;
  }
}

function getProviderColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'vultr':
      return 'text-blue-600';
    case 'aws':
      return 'text-orange-600';
    case 'google cloud':
      return 'text-red-600';
    case 'azure':
      return 'text-blue-500';
    default:
      return 'text-gray-600';
  }
}

function getProviderBgColor(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'vultr':
      return 'bg-blue-100 dark:bg-blue-950';
    case 'aws':
      return 'bg-orange-100 dark:bg-orange-950';
    case 'google cloud':
      return 'bg-red-100 dark:bg-red-950';
    case 'azure':
      return 'bg-blue-100 dark:bg-blue-950';
    default:
      return 'bg-gray-100 dark:bg-gray-950';
  }
}
