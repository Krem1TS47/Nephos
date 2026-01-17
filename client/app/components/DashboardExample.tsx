'use client';

import { useDashboard, useActiveAlerts, useInstances } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';

/**
 * Example Dashboard Component
 *
 * This component demonstrates how to use the API hooks to fetch data from the backend.
 * It shows real-time dashboard data, active alerts, and instances.
 */
export default function DashboardExample() {
  // Fetch dashboard data with auto-refresh
  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.dashboard,
  });

  // Fetch active alerts with auto-refresh
  const {
    alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useActiveAlerts({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.alerts,
  });

  // Fetch all instances
  const {
    instances,
    loading: instancesLoading,
    error: instancesError,
  } = useInstances({
    autoFetch: true,
    refreshInterval: config.refreshIntervals.instances,
  });

  if (dashboardLoading && !dashboard) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h3>
          <p className="text-red-600">{dashboardError.message}</p>
          <button
            onClick={refetchDashboard}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Nephos Dashboard</h1>
        <p className="text-gray-600">Real-time cloud monitoring and health checks</p>
      </div>

      {/* Summary Cards */}
      {dashboard?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Instances</div>
            <div className="text-3xl font-bold">{dashboard.summary.totalInstances}</div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg shadow">
            <div className="text-sm text-green-600 mb-1">Healthy Instances</div>
            <div className="text-3xl font-bold text-green-700">
              {dashboard.summary.healthyInstances}
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg shadow">
            <div className="text-sm text-yellow-600 mb-1">Active Alerts</div>
            <div className="text-3xl font-bold text-yellow-700">
              {dashboard.summary.activeAlerts}
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg shadow">
            <div className="text-sm text-red-600 mb-1">Critical Alerts</div>
            <div className="text-3xl font-bold text-red-700">
              {dashboard.summary.criticalAlerts}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-lg shadow">
            <div className="text-sm text-blue-600 mb-1">Avg Latency</div>
            <div className="text-3xl font-bold text-blue-700">
              {dashboard.summary.avgLatency.toFixed(0)}ms
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Active Alerts</h2>
          </div>
          <div className="p-6">
            {alertsLoading ? (
              <div className="text-gray-500">Loading alerts...</div>
            ) : alertsError ? (
              <div className="text-red-500">Error: {alertsError.message}</div>
            ) : alerts.length === 0 ? (
              <div className="text-gray-500">No active alerts</div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === 'critical'
                        ? 'bg-red-50 border-red-200'
                        : alert.severity === 'high'
                        ? 'bg-orange-50 border-orange-200'
                        : alert.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{alert.alertType}</div>
                        <div className="text-sm text-gray-600">{alert.message}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          alert.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : alert.severity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : alert.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instances */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Instances</h2>
          </div>
          <div className="p-6">
            {instancesLoading ? (
              <div className="text-gray-500">Loading instances...</div>
            ) : instancesError ? (
              <div className="text-red-500">Error: {instancesError.message}</div>
            ) : instances.length === 0 ? (
              <div className="text-gray-500">No instances configured</div>
            ) : (
              <div className="space-y-3">
                {instances.slice(0, 5).map((instance) => (
                  <div key={instance.id} className="p-4 rounded-lg border">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{instance.name}</div>
                        <div className="text-sm text-gray-600">
                          {instance.type} • {instance.region}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          instance.status === 'healthy'
                            ? 'bg-green-100 text-green-700'
                            : instance.status === 'unhealthy'
                            ? 'bg-red-100 text-red-700'
                            : instance.status === 'warning'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {instance.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Metrics */}
      {dashboard?.recentMetrics && dashboard.recentMetrics.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Recent Metrics</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-600 border-b">
                    <th className="pb-3">Metric Name</th>
                    <th className="pb-3">Value</th>
                    <th className="pb-3">Unit</th>
                    <th className="pb-3">Instance ID</th>
                    <th className="pb-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentMetrics.slice(0, 10).map((metric) => (
                    <tr key={metric.id} className="border-b last:border-0">
                      <td className="py-3">{metric.metricName}</td>
                      <td className="py-3 font-semibold">{metric.metricValue}</td>
                      <td className="py-3 text-sm text-gray-600">{metric.unit}</td>
                      <td className="py-3 text-sm text-gray-600 font-mono">
                        {metric.instanceId.substring(0, 8)}...
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
