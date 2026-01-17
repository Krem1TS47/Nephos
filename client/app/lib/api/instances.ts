// Instances API Service

import { apiClient } from './client';
import type {
  Instance,
  InstancesListResponse,
  CreateInstanceRequest,
  UpdateInstanceRequest,
  PaginationParams,
  InstanceStatus,
} from '@/app/types';

export const instancesApi = {
  /**
   * Get all instances with optional pagination
   */
  async getInstances(params?: PaginationParams): Promise<InstancesListResponse> {
    const queryParams: Record<string, string> = {};

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<InstancesListResponse>('/instances', queryParams);
  },

  /**
   * Get a specific instance by ID
   */
  async getInstance(id: string): Promise<Instance> {
    return apiClient.get<Instance>(`/instances/${id}`);
  },

  /**
   * Create a new instance
   */
  async createInstance(data: CreateInstanceRequest): Promise<Instance> {
    return apiClient.post<Instance>('/instances', data);
  },

  /**
   * Update an existing instance
   */
  async updateInstance(id: string, data: UpdateInstanceRequest): Promise<Instance> {
    return apiClient.put<Instance>(`/instances/${id}`, data);
  },

  /**
   * Delete an instance
   */
  async deleteInstance(id: string): Promise<void> {
    return apiClient.delete<void>(`/instances/${id}`);
  },

  /**
   * Get instances by status
   */
  async getInstancesByStatus(
    status: InstanceStatus,
    params?: PaginationParams
  ): Promise<InstancesListResponse> {
    const queryParams: Record<string, string> = {
      status,
    };

    if (params?.limit) {
      queryParams.limit = params.limit.toString();
    }

    if (params?.lastEvaluatedKey) {
      queryParams.lastEvaluatedKey = params.lastEvaluatedKey;
    }

    return apiClient.get<InstancesListResponse>('/instances', queryParams);
  },

  /**
   * Get healthy instances
   */
  async getHealthyInstances(params?: PaginationParams): Promise<InstancesListResponse> {
    return this.getInstancesByStatus('healthy', params);
  },

  /**
   * Get unhealthy instances
   */
  async getUnhealthyInstances(params?: PaginationParams): Promise<InstancesListResponse> {
    return this.getInstancesByStatus('unhealthy', params);
  },
};
