// API Response Types for Nephos Backend

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Metrics Types
export interface Metric {
  id: string;
  instanceId: string;
  timestamp: number;
  metricName: string;
  metricValue: number;
  unit: string;
  tags?: Record<string, string>;
  createdAt: string;
}

export interface MetricsListResponse {
  metrics: Metric[];
  count: number;
  lastEvaluatedKey?: string;
}

export interface CreateMetricRequest {
  instanceId: string;
  metricName: string;
  metricValue: number;
  unit: string;
  tags?: Record<string, string>;
}

// Alerts Types
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  instanceId: string;
  alertType: string;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface AlertsListResponse {
  alerts: Alert[];
  count: number;
  lastEvaluatedKey?: string;
}

export interface CreateAlertRequest {
  instanceId: string;
  alertType: string;
  severity: AlertSeverity;
  message: string;
}

export interface UpdateAlertRequest {
  status?: AlertStatus;
  message?: string;
  resolvedAt?: string;
}

// Instances Types
export type InstanceStatus = 'healthy' | 'unhealthy' | 'unknown' | 'warning';
export type InstanceType = 'web-service' | 'api' | 'database' | 'cache' | 'queue' | 'other';

export interface Instance {
  id: string;
  name: string;
  type: InstanceType;
  status: InstanceStatus;
  region: string;
  endpoint: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastHealthCheck?: string;
}

export interface InstancesListResponse {
  instances: Instance[];
  count: number;
  lastEvaluatedKey?: string;
}

export interface CreateInstanceRequest {
  name: string;
  type: InstanceType;
  region: string;
  endpoint: string;
  metadata?: Record<string, any>;
}

export interface UpdateInstanceRequest {
  name?: string;
  type?: InstanceType;
  status?: InstanceStatus;
  region?: string;
  endpoint?: string;
  metadata?: Record<string, any>;
}

// Analytics Types
export interface MetricAggregation {
  instanceId: string;
  metricName: string;
  hour: string;
  avgValue: number;
  maxValue: number;
  minValue: number;
  sampleCount: number;
}

export interface AnalyticsData {
  hourlyMetrics: MetricAggregation[];
  activeAlertsCount: number;
  healthyInstancesCount: number;
  unhealthyInstancesCount: number;
  totalInstancesCount: number;
}

export interface DashboardData {
  instances: Instance[];
  recentAlerts: Alert[];
  recentMetrics: Metric[];
  summary: {
    totalInstances: number;
    healthyInstances: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgLatency: number;
  };
}

export interface AnalyticsQuery {
  startDate?: string;
  endDate?: string;
  instanceId?: string;
  metricName?: string;
}

// Health Check Types
export interface HealthCheck {
  id: string;
  instanceId: string;
  status: InstanceStatus;
  latencyMs: number;
  errorMessage?: string;
  timestamp: string;
}

// Pagination Types
export interface PaginationParams {
  limit?: number;
  lastEvaluatedKey?: string;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

// AI Insights Types
export type InsightType = 'pattern' | 'anomaly' | 'prediction';
export type InsightSeverity = 'low' | 'medium' | 'high';

export interface AIInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  affectedInstances: string[];
  metricsAnalyzed: string[];
  confidenceScore: number;
  recommendations?: string;
  createdAt: string;
  expiresAt: string;
  metadata?: Record<string, any>;
}

export interface InsightsListResponse {
  insights: AIInsight[];
  count: number;
}

export interface InsightsSummary {
  summary: string;
  stats: Array<{
    INSIGHT_TYPE: string;
    SEVERITY: string;
    COUNT: number;
  }>;
  criticalInsight: AIInsight | null;
  generatedAt: string;
}
