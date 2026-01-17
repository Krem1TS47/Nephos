'use client';

import { useState, useEffect, useCallback } from 'react';
import { metricsApi } from '../api';
import type { Metric, MetricsListResponse, CreateMetricRequest, PaginationParams } from '@/app/types';

interface UseMetricsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  params?: PaginationParams;
}

export function useMetrics(options: UseMetricsOptions = {}) {
  const { autoFetch = true, refreshInterval, params } = options;

  const [data, setData] = useState<MetricsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await metricsApi.getMetrics(params);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (autoFetch) {
      fetchMetrics();
    }
  }, [autoFetch, fetchMetrics]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchMetrics]);

  return {
    metrics: data?.metrics || [],
    count: data?.count || 0,
    lastEvaluatedKey: data?.lastEvaluatedKey,
    loading,
    error,
    refetch: fetchMetrics,
  };
}

export function useMetric(id: string) {
  const [metric, setMetric] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetric = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await metricsApi.getMetric(id);
      setMetric(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metric'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMetric();
  }, [fetchMetric]);

  return {
    metric,
    loading,
    error,
    refetch: fetchMetric,
  };
}

export function useCreateMetric() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMetric = async (data: CreateMetricRequest): Promise<Metric | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await metricsApi.createMetric(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create metric');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createMetric,
    loading,
    error,
  };
}
