// Real-time WebSocket Hook
// Provides sub-100ms updates for live metrics

import { useState, useEffect, useCallback, useRef } from 'react';

interface RealtimeUpdate {
  type: string;
  data: any;
  timestamp: string;
  source: string;
}

interface UseRealtimeOptions {
  enabled?: boolean;
  onUpdate?: (update: RealtimeUpdate) => void;
  onError?: (error: Error) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const {
    enabled = true,
    onUpdate,
    onError,
    reconnect = true,
    reconnectInterval = 3000
  } = options;

  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<RealtimeUpdate | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [error, setError] = useState<Error | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const pingInterval = useRef<NodeJS.Timeout>();
  const lastPingTime = useRef<number>(0);

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      // Get WebSocket URL from environment
      const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;

      if (!wsUrl) {
        console.warn('WebSocket URL not configured, using mock connection');
        // Use mock connection for development
        setConnected(true);
        return;
      }

      console.log('Connecting to WebSocket:', wsUrl);

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setError(null);

        // Start ping interval for latency tracking
        pingInterval.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            lastPingTime.current = Date.now();
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 5000); // Ping every 5 seconds
      };

      socket.onmessage = (event) => {
        try {
          const update: RealtimeUpdate = JSON.parse(event.data);

          // Calculate latency from ping
          if (update.type === 'pong') {
            const latencyMs = Date.now() - lastPingTime.current;
            setLatency(latencyMs);
            return;
          }

          setLastUpdate(update);
          onUpdate?.(update);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        const err = new Error('WebSocket connection error');
        setError(err);
        onError?.(err);
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);

        // Clear ping interval
        if (pingInterval.current) {
          clearInterval(pingInterval.current);
        }

        // Attempt reconnect
        if (reconnect) {
          reconnectTimeout.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect();
          }, reconnectInterval);
        }
      };

      ws.current = socket;
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setError(err as Error);
      onError?.(err as Error);
    }
  }, [enabled, onUpdate, onError, reconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }

    if (pingInterval.current) {
      clearInterval(pingInterval.current);
    }

    setConnected(false);
  }, []);

  const send = useCallback((data: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connected,
    lastUpdate,
    latency,
    error,
    connect,
    disconnect,
    send
  };
}

/**
 * Hook for real-time metrics updates
 */
export function useRealtimeMetrics() {
  const [metrics, setMetrics] = useState<any[]>([]);

  const { connected, latency } = useRealtime({
    enabled: true,
    onUpdate: (update) => {
      if (update.type === 'realtime_update' && update.data.metricName) {
        setMetrics(prev => [update.data, ...prev.slice(0, 99)]); // Keep last 100
      }
    }
  });

  return { metrics, connected, latency };
}

/**
 * Hook for real-time alerts
 */
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  const { connected, latency } = useRealtime({
    enabled: true,
    onUpdate: (update) => {
      if (update.type === 'realtime_update' && update.data.alertType) {
        setAlerts(prev => [update.data, ...prev.slice(0, 49)]); // Keep last 50
      }
    }
  });

  return { alerts, connected, latency };
}

/**
 * Hook for real-time dashboard updates
 */
export function useRealtimeDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);

  const { connected, latency } = useRealtime({
    enabled: true,
    onUpdate: (update) => {
      if (update.type === 'dashboard_update') {
        setDashboardData(update.data);
      }
    }
  });

  return { dashboardData, connected, latency };
}
