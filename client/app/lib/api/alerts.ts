// Alerts API Service

import { apiClient } from './client';
import type {
  Alert,
  AlertsListResponse,
  CreateAlertRequest,
  UpdateAlertRequest,
  PaginationParams,
  AlertStatus,
} from '@/app/types';

export const alertsApi = {
  /**
   * Get all alerts with optional pagination
   */
  async getAlerts(params?: PaginationParams): Promise<AlertsListResponse> {
    const queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<AlertsListResponse>('/alerts', queryParams);
  },

  /**
   * Get a specific alert by ID
   */
  async getAlert(id: string): Promise<Alert> {
    return apiClient.get<Alert>(`/alerts/${id}`);
  },

  /**
   * Create a new alert
   */
  async createAlert(data: CreateAlertRequest): Promise<Alert> {
    return apiClient.post<Alert>('/alerts', data);
  },

  /**
   * Update an existing alert
   */
  async updateAlert(id: string, data: UpdateAlertRequest): Promise<Alert> {
    return apiClient.put<Alert>(`/alerts/${id}`, data);
  },

  /**
   * Delete an alert
   */
  async deleteAlert(id: string): Promise<void> {
    return apiClient.delete<void>(`/alerts/${id}`);
  },

  /**
   * Get alerts by status
   */
  async getAlertsByStatus(
    status: AlertStatus,
    params?: PaginationParams
  ): Promise<AlertsListResponse> {
    const queryParams: Record<string, string> = {
      status,
    };

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<AlertsListResponse>('/alerts', queryParams);
  },

  /**
   * Get active alerts
   */
  async getActiveAlerts(params?: PaginationParams): Promise<AlertsListResponse> {
    return this.getAlertsByStatus('active', params);
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, { status: 'acknowledged' });
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(id: string): Promise<Alert> {
    return this.updateAlert(id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  },

  /**
   * Get alerts for a specific instance
   */
  async getAlertsByInstance(
    instanceId: string,
    params?: PaginationParams
  ): Promise<AlertsListResponse> {
    const queryParams: Record<string, string> = {
      instanceId,
    };

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<AlertsListResponse>('/alerts', queryParams);
  },
};
