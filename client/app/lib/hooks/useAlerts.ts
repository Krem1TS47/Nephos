'use client';

import { useState, useEffect, useCallback } from 'react';
import { alertsApi } from '../api';
import type {
  Alert,
  AlertsListResponse,
  CreateAlertRequest,
  UpdateAlertRequest,
  PaginationParams,
  AlertStatus,
} from '@/app/types';

interface UseAlertsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  params?: PaginationParams;
  status?: AlertStatus;
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const { autoFetch = true, refreshInterval, params, status } = options;

  const [data, setData] = useState<AlertsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = status
        ? await alertsApi.getAlertsByStatus(status, params)
        : await alertsApi.getAlerts(params);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
    } finally {
      setLoading(false);
    }
  }, [params, status]);

  useEffect(() => {
    if (autoFetch) {
      fetchAlerts();
    }
  }, [autoFetch, fetchAlerts]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchAlerts]);

  return {
    alerts: data?.alerts || [],
    count: data?.count || 0,
    lastEvaluatedKey: data?.lastEvaluatedKey,
    loading,
    error,
    refetch: fetchAlerts,
  };
}

export function useAlert(id: string) {
  const [alert, setAlert] = useState<Alert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAlert = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await alertsApi.getAlert(id);
      setAlert(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch alert'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAlert();
  }, [fetchAlert]);

  return {
    alert,
    loading,
    error,
    refetch: fetchAlert,
  };
}

export function useCreateAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAlert = async (data: CreateAlertRequest): Promise<Alert | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await alertsApi.createAlert(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create alert');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createAlert,
    loading,
    error,
  };
}

export function useUpdateAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateAlert = async (id: string, data: UpdateAlertRequest): Promise<Alert | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await alertsApi.updateAlert(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update alert');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (id: string): Promise<Alert | null> => {
    return updateAlert(id, { status: 'acknowledged' });
  };

  const resolveAlert = async (id: string): Promise<Alert | null> => {
    return updateAlert(id, {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    });
  };

  return {
    updateAlert,
    acknowledgeAlert,
    resolveAlert,
    loading,
    error,
  };
}

export function useDeleteAlert() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteAlert = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await alertsApi.deleteAlert(id);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete alert');
      setError(error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteAlert,
    loading,
    error,
  };
}

export function useActiveAlerts(options: Omit<UseAlertsOptions, 'status'> = {}) {
  return useAlerts({ ...options, status: 'active' });
}
