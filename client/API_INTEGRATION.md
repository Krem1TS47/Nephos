# Frontend API Integration Guide

This guide explains how to connect your Nephos frontend to the backend API.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [API Client](#api-client)
4. [Using API Services](#using-api-services)
5. [Using React Hooks](#using-react-hooks)
6. [TypeScript Types](#typescript-types)
7. [Examples](#examples)
8. [Error Handling](#error-handling)

---

## Quick Start

### 1. Set Up Environment Variables

Create a `.env.local` file in the `client` directory:

```bash
cd client
cp .env.example .env.local
```

Update `.env.local` with your backend API URL (from your backend deployment):

```bash
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true
NEXT_PUBLIC_METRICS_REFRESH_INTERVAL=30000
NEXT_PUBLIC_ALERTS_REFRESH_INTERVAL=60000
```

### 2. Import and Use Hooks

```typescript
'use client';

import { useDashboard } from '@/app/lib/hooks';

export default function MyComponent() {
  const { dashboard, loading, error } = useDashboard({
    autoFetch: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Total Instances: {dashboard?.summary.totalInstances}</h1>
    </div>
  );
}
```

---

## Environment Setup

### Available Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` |
| `NEXT_PUBLIC_ENVIRONMENT` | Environment (development/production) | `development` |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics features | `true` |
| `NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES` | Enable real-time updates | `true` |
| `NEXT_PUBLIC_METRICS_REFRESH_INTERVAL` | Metrics refresh interval (ms) | `30000` |
| `NEXT_PUBLIC_ALERTS_REFRESH_INTERVAL` | Alerts refresh interval (ms) | `60000` |

### Configuration Access

Use the `config` object to access environment variables:

```typescript
import { config } from '@/app/lib/config';

console.log(config.api.baseUrl);
console.log(config.refreshIntervals.metrics);
console.log(config.features.analytics);
```

---

## API Client

### Direct API Calls

Use the API client directly for custom requests:

```typescript
import { apiClient } from '@/app/lib/api';

// GET request
const data = await apiClient.get('/metrics');

// POST request
const newMetric = await apiClient.post('/metrics', {
  instanceId: 'instance-123',
  metricName: 'cpu_usage',
  metricValue: 45.5,
  unit: 'percent',
});

// PUT request
const updated = await apiClient.put('/alerts/alert-123', {
  status: 'resolved',
});

// DELETE request
await apiClient.delete('/instances/instance-123');
```

---

## Using API Services

API services provide typed methods for each endpoint:

### Metrics API

```typescript
import { metricsApi } from '@/app/lib/api';

// Get all metrics
const { metrics, count } = await metricsApi.getMetrics();

// Get metrics with pagination
const { metrics, lastEvaluatedKey } = await metricsApi.getMetrics({
  limit: 20,
});

// Get a specific metric
const metric = await metricsApi.getMetric('metric-id');

// Create a metric
const newMetric = await metricsApi.createMetric({
  instanceId: 'instance-123',
  metricName: 'memory_usage',
  metricValue: 2048,
  unit: 'MB',
});

// Get metrics by instance
const instanceMetrics = await metricsApi.getMetricsByInstance('instance-123');

// Get metrics by name
const cpuMetrics = await metricsApi.getMetricsByName('cpu_usage');
```

### Alerts API

```typescript
import { alertsApi } from '@/app/lib/api';

// Get all alerts
const { alerts, count } = await alertsApi.getAlerts();

// Get a specific alert
const alert = await alertsApi.getAlert('alert-id');

// Create an alert
const newAlert = await alertsApi.createAlert({
  instanceId: 'instance-123',
  alertType: 'high_latency',
  severity: 'high',
  message: 'Latency exceeded threshold',
});

// Update an alert
const updated = await alertsApi.updateAlert('alert-id', {
  status: 'acknowledged',
});

// Delete an alert
await alertsApi.deleteAlert('alert-id');

// Get active alerts
const activeAlerts = await alertsApi.getActiveAlerts();

// Acknowledge an alert
await alertsApi.acknowledgeAlert('alert-id');

// Resolve an alert
await alertsApi.resolveAlert('alert-id');
```

### Instances API

```typescript
import { instancesApi } from '@/app/lib/api';

// Get all instances
const { instances, count } = await instancesApi.getInstances();

// Get a specific instance
const instance = await instancesApi.getInstance('instance-id');

// Create an instance
const newInstance = await instancesApi.createInstance({
  name: 'Production API',
  type: 'api',
  region: 'us-east-1',
  endpoint: 'https://api.example.com',
});

// Update an instance
const updated = await instancesApi.updateInstance('instance-id', {
  status: 'healthy',
});

// Delete an instance
await instancesApi.deleteInstance('instance-id');

// Get healthy instances
const healthy = await instancesApi.getHealthyInstances();

// Get unhealthy instances
const unhealthy = await instancesApi.getUnhealthyInstances();
```

### Analytics API

```typescript
import { analyticsApi } from '@/app/lib/api';

// Get dashboard data
const dashboard = await analyticsApi.getDashboard();

// Get analytics data
const analytics = await analyticsApi.getAnalytics({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});

// Get instance analytics
const instanceAnalytics = await analyticsApi.getInstanceAnalytics('instance-123');

// Get metric analytics
const metricAnalytics = await analyticsApi.getMetricAnalytics('cpu_usage');

// Get analytics by date range
const rangeAnalytics = await analyticsApi.getAnalyticsByDateRange(
  '2024-01-01',
  '2024-01-31'
);
```

---

## Using React Hooks

React hooks provide state management and auto-refresh capabilities:

### Metrics Hooks

```typescript
import { useMetrics, useMetric, useCreateMetric } from '@/app/lib/hooks';

function MetricsComponent() {
  // Get all metrics with auto-refresh
  const { metrics, loading, error, refetch } = useMetrics({
    autoFetch: true,
    refreshInterval: 30000, // 30 seconds
  });

  // Get a specific metric
  const { metric } = useMetric('metric-id');

  // Create metric hook
  const { createMetric, loading: creating } = useCreateMetric();

  const handleCreate = async () => {
    const metric = await createMetric({
      instanceId: 'instance-123',
      metricName: 'disk_usage',
      metricValue: 75.5,
      unit: 'percent',
    });

    if (metric) {
      refetch(); // Refresh the list
    }
  };

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        <div>
          {metrics.map(m => (
            <div key={m.id}>{m.metricName}: {m.metricValue}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Alerts Hooks

```typescript
import {
  useAlerts,
  useActiveAlerts,
  useUpdateAlert,
  useDeleteAlert,
} from '@/app/lib/hooks';

function AlertsComponent() {
  // Get active alerts with auto-refresh
  const { alerts, loading, error, refetch } = useActiveAlerts({
    refreshInterval: 60000, // 1 minute
  });

  // Update alert hook
  const { acknowledgeAlert, resolveAlert } = useUpdateAlert();

  // Delete alert hook
  const { deleteAlert } = useDeleteAlert();

  return (
    <div>
      {alerts.map(alert => (
        <div key={alert.id}>
          <p>{alert.message}</p>
          <button onClick={() => acknowledgeAlert(alert.id)}>
            Acknowledge
          </button>
          <button onClick={() => resolveAlert(alert.id)}>
            Resolve
          </button>
          <button onClick={() => deleteAlert(alert.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Instances Hooks

```typescript
import {
  useInstances,
  useHealthyInstances,
  useUnhealthyInstances,
  useCreateInstance,
} from '@/app/lib/hooks';

function InstancesComponent() {
  // Get all instances
  const { instances, loading, refetch } = useInstances({
    refreshInterval: 60000,
  });

  // Get only healthy instances
  const { instances: healthy } = useHealthyInstances();

  // Get only unhealthy instances
  const { instances: unhealthy } = useUnhealthyInstances();

  // Create instance hook
  const { createInstance } = useCreateInstance();

  const handleCreate = async () => {
    const instance = await createInstance({
      name: 'New Service',
      type: 'web-service',
      region: 'us-west-2',
      endpoint: 'https://service.example.com',
    });

    if (instance) {
      refetch();
    }
  };

  return <div>...</div>;
}
```

### Analytics Hooks

```typescript
import {
  useDashboard,
  useAnalytics,
  useInstanceAnalytics,
} from '@/app/lib/hooks';

function AnalyticsComponent() {
  // Get dashboard summary
  const { dashboard, loading, error } = useDashboard({
    refreshInterval: 30000,
  });

  // Get detailed analytics
  const { data: analytics } = useAnalytics({
    query: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
    },
  });

  // Get analytics for specific instance
  const { data: instanceData } = useInstanceAnalytics('instance-123');

  return (
    <div>
      {dashboard && (
        <div>
          <p>Total Instances: {dashboard.summary.totalInstances}</p>
          <p>Healthy: {dashboard.summary.healthyInstances}</p>
          <p>Active Alerts: {dashboard.summary.activeAlerts}</p>
        </div>
      )}
    </div>
  );
}
```

---

## TypeScript Types

All API types are available from `@/app/types`:

```typescript
import type {
  Metric,
  Alert,
  Instance,
  DashboardData,
  AlertSeverity,
  InstanceStatus,
  CreateMetricRequest,
  UpdateAlertRequest,
} from '@/app/types';

const severity: AlertSeverity = 'high';
const status: InstanceStatus = 'healthy';
```

---

## Examples

### Complete Dashboard Example

See [app/components/DashboardExample.tsx](app/components/DashboardExample.tsx) for a full working example.

### Using in a Server Component

```typescript
// app/dashboard/page.tsx
import { analyticsApi } from '@/app/lib/api';

export default async function DashboardPage() {
  // Fetch on the server
  const dashboard = await analyticsApi.getDashboard();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Instances: {dashboard.summary.totalInstances}</p>
    </div>
  );
}
```

### Using in a Client Component with Real-time Updates

```typescript
'use client';

import { useDashboard } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';

export default function LiveDashboard() {
  const { dashboard, loading, error } = useDashboard({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.dashboard,
  });

  // Component updates automatically every 30 seconds
  return <div>...</div>;
}
```

---

## Error Handling

### Handling API Errors

```typescript
import { ApiError } from '@/app/lib/api';

try {
  const metrics = await metricsApi.getMetrics();
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.statusCode}: ${error.message}`);
    console.error('Details:', error.details);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Error Handling in Hooks

```typescript
const { data, error, loading } = useDashboard();

if (error) {
  // Display error to user
  return (
    <div className="error">
      <h3>Failed to load dashboard</h3>
      <p>{error.message}</p>
    </div>
  );
}
```

---

## Best Practices

1. **Use Hooks for Components**: Use React hooks in client components for automatic state management and refresh
2. **Use API Services Directly**: Use API services directly in server components or for one-off requests
3. **Handle Loading States**: Always show loading indicators while fetching data
4. **Handle Errors Gracefully**: Display user-friendly error messages and provide retry options
5. **Use TypeScript Types**: Import and use the provided types for type safety
6. **Configure Refresh Intervals**: Set appropriate refresh intervals based on data freshness requirements
7. **Cleanup on Unmount**: Hooks automatically cleanup intervals on component unmount

---

## Testing the Connection

### 1. Start Backend (if local)

```bash
cd backend
./scripts/local-dev.sh
```

### 2. Start Frontend

```bash
cd client
npm run dev
```

### 3. Test Connection

Open http://localhost:3000 and check the browser console for any API errors.

### 4. Verify API URL

Check that `NEXT_PUBLIC_API_URL` in `.env.local` matches your backend deployment URL.

---

## Troubleshooting

### CORS Errors

If you see CORS errors, ensure your backend API Gateway has CORS enabled.

### 404 Errors

Verify the API endpoint URLs match your backend deployment.

### Connection Refused

- Check that `NEXT_PUBLIC_API_URL` is correctly set
- Verify the backend is deployed and accessible
- Check network connectivity

### TypeScript Errors

Run `npm run type-check` to identify type issues.

---

## Next Steps

1. Deploy your backend using the deployment scripts
2. Update `.env.local` with the deployed API URL
3. Build your dashboard UI using the provided hooks
4. Customize the components to match your design
5. Add authentication if needed

For more information, see:
- [DEPLOYMENT.md](../DEPLOYMENT.md) - Backend deployment guide
- [README.md](../README.md) - Project overview
