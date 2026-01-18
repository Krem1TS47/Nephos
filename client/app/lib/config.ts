// Application Configuration

export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  },

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',

  features: {
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES === 'true',
  },

  refreshIntervals: {
    metrics: parseInt(process.env.NEXT_PUBLIC_METRICS_REFRESH_INTERVAL || '30000', 10),
    alerts: parseInt(process.env.NEXT_PUBLIC_ALERTS_REFRESH_INTERVAL || '60000', 10),
    dashboard: parseInt(process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL || '30000', 10),
    instances: parseInt(process.env.NEXT_PUBLIC_INSTANCES_REFRESH_INTERVAL || '60000', 10),
  },

  isProduction: process.env.NEXT_PUBLIC_ENVIRONMENT === 'production',
  isDevelopment: process.env.NEXT_PUBLIC_ENVIRONMENT === 'development',
} as const;
