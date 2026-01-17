'use client';

import { useState, useEffect, useCallback } from 'react';
import { insightsApi } from '../api/insights';
import type {
  AIInsight,
  InsightsSummary,
  InsightType,
  InsightSeverity,
} from '@/app/types';

interface UseInsightsOptions {
  autoFetch?: boolean;
  refreshInterval?: number;
  severity?: InsightSeverity;
  type?: InsightType;
  limit?: number;
}

export function useInsights(options: UseInsightsOptions = {}) {
  const { autoFetch = true, refreshInterval, severity, type, limit } = options;

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await insightsApi.getInsights({ severity, type, limit });
      setInsights(response.insights);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch insights'));
    } finally {
      setLoading(false);
    }
  }, [severity, type, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchInsights();
    }
  }, [autoFetch, fetchInsights]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchInsights]);

  return {
    insights,
    loading,
    error,
    refetch: fetchInsights,
  };
}

export function useInsightsSummary(options: Omit<UseInsightsOptions, 'severity' | 'type' | 'limit'> = {}) {
  const { autoFetch = true, refreshInterval } = options;

  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await insightsApi.getSummary();
      setSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch summary'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchSummary();
    }
  }, [autoFetch, fetchSummary]);

  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
}

export function usePatterns(options: Omit<UseInsightsOptions, 'type'> = {}) {
  return useInsights({ ...options, type: 'pattern' });
}

export function useAnomalies(options: Omit<UseInsightsOptions, 'type'> = {}) {
  return useInsights({ ...options, type: 'anomaly' });
}

export function usePredictions(options: Omit<UseInsightsOptions, 'type'> = {}) {
  return useInsights({ ...options, type: 'prediction' });
}
