'use client';

import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api';
import type { AnalyticsData, DashboardData, AnalyticsQuery } from '@/app/types';

interface UseAnalyticsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  query?: AnalyticsQuery;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { autoFetch = true, refreshInterval, query } = options;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await analyticsApi.getAnalytics(query);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (autoFetch) {
      fetchAnalytics();
    }
  }, [autoFetch, fetchAnalytics]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics,
  };
}

export function useDashboard(options: Omit<UseAnalyticsOptions, 'query'> = {}) {
  const { autoFetch = true, refreshInterval } = options;

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await analyticsApi.getDashboard();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchDashboard();
    }
  }, [autoFetch, fetchDashboard]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchDashboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchDashboard]);

  return {
    dashboard: data,
    loading,
    error,
    refetch: fetchDashboard,
  };
}

export function useInstanceAnalytics(instanceId: string, options: UseAnalyticsOptions = {}) {
  const { autoFetch = true, refreshInterval, query } = options;

  return useAnalytics({
    autoFetch,
    refreshInterval,
    query: {
      ...query,
      instanceId,
    },
  });
}

export function useMetricAnalytics(metricName: string, options: UseAnalyticsOptions = {}) {
  const { autoFetch = true, refreshInterval, query } = options;

  return useAnalytics({
    autoFetch,
    refreshInterval,
    query: {
      ...query,
      metricName,
    },
  });
}

export function useDateRangeAnalytics(
  startDate: string,
  endDate: string,
  options: UseAnalyticsOptions = {}
) {
  const { autoFetch = true, refreshInterval, query } = options;

  return useAnalytics({
    autoFetch,
    refreshInterval,
    query: {
      ...query,
      startDate,
      endDate,
    },
  });
}
