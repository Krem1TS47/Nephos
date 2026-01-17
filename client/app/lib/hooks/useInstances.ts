'use client';

import { useState, useEffect, useCallback } from 'react';
import { instancesApi } from '../api';
import type {
  Instance,
  InstancesListResponse,
  CreateInstanceRequest,
  UpdateInstanceRequest,
  PaginationParams,
  InstanceStatus,
} from '@/app/types';

interface UseInstancesOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  params?: PaginationParams;
  status?: InstanceStatus;
}

export function useInstances(options: UseInstancesOptions = {}) {
  const { autoFetch = true, refreshInterval, params, status } = options;

  const [data, setData] = useState<InstancesListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = status
        ? await instancesApi.getInstancesByStatus(status, params)
        : await instancesApi.getInstances(params);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch instances'));
    } finally {
      setLoading(false);
    }
  }, [params, status]);

  useEffect(() => {
    if (autoFetch) {
      fetchInstances();
    }
  }, [autoFetch, fetchInstances]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchInstances, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchInstances]);

  return {
    instances: data?.instances || [],
    count: data?.count || 0,
    lastEvaluatedKey: data?.lastEvaluatedKey,
    loading,
    error,
    refetch: fetchInstances,
  };
}

export function useInstance(id: string) {
  const [instance, setInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInstance = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await instancesApi.getInstance(id);
      setInstance(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch instance'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  return {
    instance,
    loading,
    error,
    refetch: fetchInstance,
  };
}

export function useCreateInstance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createInstance = async (data: CreateInstanceRequest): Promise<Instance | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await instancesApi.createInstance(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create instance');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createInstance,
    loading,
    error,
  };
}

export function useUpdateInstance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateInstance = async (id: string, data: UpdateInstanceRequest): Promise<Instance | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await instancesApi.updateInstance(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update instance');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateInstance,
    loading,
    error,
  };
}

export function useDeleteInstance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteInstance = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await instancesApi.deleteInstance(id);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete instance');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteInstance,
    loading,
    error,
  };
}

export function useHealthyInstances(options: Omit<UseInstancesOptions, 'status'> = {}) {
  return useInstances({ ...options, status: 'healthy' });
}

export function useUnhealthyInstances(options: Omit<UseInstancesOptions, 'status'> = {}) {
  return useInstances({ ...options, status: 'unhealthy' });
}
