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
  const [generating, setGenerating] = useState(false);
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

  const generateInsights = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await insightsApi.generateInsights();
      setInsights(response.insights);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate insights'));
    } finally {
      setGenerating(false);
    }
  }, []);

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
    generating,
    error,
    refetch: fetchInsights,
    generate: generateInsights,
  };
}

export function useInsightsSummary(options: Omit<UseInsightsOptions, 'severity' | 'type' | 'limit'> = {}) {
  const { autoFetch = true, refreshInterval } = options;

  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const generateSummary = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await insightsApi.generateSummary();
      setSummary(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate summary'));
    } finally {
      setGenerating(false);
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
    generating,
    error,
    refetch: fetchSummary,
    generate: generateSummary,
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
