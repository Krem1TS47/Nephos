// AI Insights API Service

import { apiClient } from './client';
import type {
  AIInsight,
  InsightsListResponse,
  InsightsSummary,
  InsightType,
  InsightSeverity,
} from '@/app/types';

export const insightsApi = {
  /**
   * Get all AI insights with optional filters
   */
  async getInsights(params?: {
    limit?: number;
    severity?: InsightSeverity;
    type?: InsightType;
  }): Promise<InsightsListResponse> {
    const queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.severity) {
      queryParams.severity = params.severity;
    }

    if (params?.type) {
      queryParams.type = params.type;
    }

    return apiClient.get<InsightsListResponse>('/insights', queryParams);
  },

  /**
   * Get AI summary report
   */
  async getSummary(): Promise<InsightsSummary> {
    return apiClient.get<InsightsSummary>('/insights/summary');
  },

  /**
   * Get pattern insights
   */
  async getPatterns(): Promise<InsightsListResponse> {
    return apiClient.get<InsightsListResponse>('/insights/patterns');
  },

  /**
   * Get anomaly insights
   */
  async getAnomalies(): Promise<InsightsListResponse> {
    return apiClient.get<InsightsListResponse>('/insights/anomalies');
  },

  /**
   * Get predictive insights
   */
  async getPredictions(): Promise<InsightsListResponse> {
    return apiClient.get<InsightsListResponse>('/insights/predictions');
  },
};
