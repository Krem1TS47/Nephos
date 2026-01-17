// API Module - Central export point

export { apiClient, ApiError, handleApiResponse } from './client';
export { metricsApi } from './metrics';
export { alertsApi } from './alerts';
export { instancesApi } from './instances';
export { analyticsApi } from './analytics';

// Re-export all API services as a single object
import { metricsApi } from './metrics';
import { alertsApi } from './alerts';
import { instancesApi } from './instances';
import { analyticsApi } from './analytics';

export const api = {
  metrics: metricsApi,
  alerts: alertsApi,
  instances: instancesApi,
  analytics: analyticsApi,
};
