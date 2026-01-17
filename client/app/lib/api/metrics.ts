// Metrics API Service

import { apiClient } from './client';
import type {
  Metric,
  MetricsListResponse,
  CreateMetricRequest,
  PaginationParams,
} from '@/app/types';

export const metricsApi = {
  /**
   * Get all metrics with optional pagination
   */
  async getMetrics(params?: PaginationParams): Promise<MetricsListResponse> {
    const queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<MetricsListResponse>('/metrics', queryParams);
  },

  /**
   * Get a specific metric by ID
   */
  async getMetric(id: string): Promise<Metric> {
    return apiClient.get<Metric>(`/metrics/${id}`);
  },

  /**
   * Create a new metric
   */
  async createMetric(data: CreateMetricRequest): Promise<Metric> {
    return apiClient.post<Metric>('/metrics', data);
  },

  /**
   * Get metrics for a specific instance
   */
  async getMetricsByInstance(
    instanceId: string,
    params?: PaginationParams
  ): Promise<MetricsListResponse> {
    const queryParams: Record<string, string> = {
      instanceId,
    };

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<MetricsListResponse>('/metrics', queryParams);
  },

  /**
   * Get metrics by name
   */
  async getMetricsByName(
    metricName: string,
    params?: PaginationParams
  ): Promise<MetricsListResponse> {
    const queryParams: Record<string, string> = {
      metricName,
    };

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<MetricsListResponse>('/metrics', queryParams);
  },
};
