// Hooks Module - Central export point

export {
  useMetrics,
  useMetric,
  useCreateMetric,
} from './useMetrics';

export {
  useAlerts,
  useAlert,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useActiveAlerts,
} from './useAlerts';

export {
  useInstances,
  useInstance,
  useCreateInstance,
  useUpdateInstance,
  useDeleteInstance,
  useHealthyInstances,
  useUnhealthyInstances,
} from './useInstances';

export {
  useAnalytics,
  useDashboard,
  useInstanceAnalytics,
  useMetricAnalytics,
  useDateRangeAnalytics,
} from './useAnalytics';
