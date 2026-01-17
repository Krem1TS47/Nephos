// Analytics API Service

import { apiClient } from './client';
import type {
  AnalyticsData,
  DashboardData,
  AnalyticsQuery,
} from '@/app/types';

export const analyticsApi = {
  /**
   * Get analytics data with optional filtering
   */
  async getAnalytics(query?: AnalyticsQuery): Promise<AnalyticsData> {
    const queryParams: Record<string, string> = {};

    if (query?.startDate) {
      queryParams.startDate = query.startDate;
    }

    if (query?.endDate) {
      queryParams.endDate = query.endDate;
    }

    if (query?.instanceId) {
      queryParams.instanceId = query.instanceId;
    }

    if (query?.metricName) {
      queryParams.metricName = query.metricName;
    }

    return apiClient.get<AnalyticsData>('/analytics', queryParams);
  },

  /**
   * Get dashboard data (summary view)
   */
  async getDashboard(): Promise<DashboardData> {
    return apiClient.get<DashboardData>('/analytics/dashboard');
  },

  /**
   * Get analytics for a specific instance
   */
  async getInstanceAnalytics(
    instanceId: string,
    query?: Omit<AnalyticsQuery, 'instanceId'>
  ): Promise<AnalyticsData> {
    return this.getAnalytics({
      ...query,
      instanceId,
    });
  },

  /**
   * Get analytics for a specific metric
   */
  async getMetricAnalytics(
    metricName: string,
    query?: Omit<AnalyticsQuery, 'metricName'>
  ): Promise<AnalyticsData> {
    return this.getAnalytics({
      ...query,
      metricName,
    });
  },

  /**
   * Get analytics for a date range
   */
  async getAnalyticsByDateRange(
    startDate: string,
    endDate: string,
    query?: Omit<AnalyticsQuery, 'startDate' | 'endDate'>
  ): Promise<AnalyticsData> {
    return this.getAnalytics({
      ...query,
      startDate,
      endDate,
    });
  },
};
