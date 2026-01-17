# Nephos Frontend Guide

Complete guide for the Nephos cloud monitoring dashboard frontend.

## Overview

The Nephos frontend is built with:
- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Charts**: Recharts
- **TypeScript**: Full type safety

## Project Structure

```
client/
├── app/
│   ├── layout.tsx              # Root layout with navbar
│   ├── page.tsx                # Dashboard page
│   ├── alerts/
│   │   └── page.tsx            # Alerts management
│   ├── instances/
│   │   └── page.tsx            # Instances management
│   ├── metrics/
│   │   └── page.tsx            # Metrics overview
│   ├── components/
│   │   ├── navbar.tsx          # Navigation bar
│   │   ├── stats-card.tsx      # Reusable stats card
│   │   ├── metric-chart.tsx    # Chart component
│   │   └── DashboardExample.tsx # Example component
│   ├── lib/
│   │   ├── api/                # API client & services
│   │   ├── hooks/              # React hooks
│   │   ├── config.ts           # App configuration
│   │   └── utils.ts            # Utility functions
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── globals.css             # Global styles
├── components/
│   └── ui/                     # shadcn components
├── .env.example                # Environment template
└── package.json                # Dependencies
```

## Features

### Pages

#### 1. Dashboard (/)
- **Stats Cards**: Total instances, healthy instances, active alerts, critical alerts, avg latency
- **Recent Alerts**: Latest 5 alerts with severity badges
- **Instance Status**: Health overview of monitored instances
- **Tabs**: Overview, Metrics, Active Alerts
- **Auto-refresh**: Every 30 seconds

#### 2. Alerts (/alerts)
- **Filter**: By status (all, active, acknowledged, resolved)
- **Actions**: Acknowledge, resolve, delete alerts
- **Stats**: Count by status
- **Real-time updates**: Every 60 seconds

#### 3. Instances (/instances)
- **Filter**: By status (all, healthy, unhealthy, warning, unknown)
- **Stats**: Count by health status
- **Card View**: Grid layout with instance details
- **Actions**: Delete instances

#### 4. Metrics (/metrics)
- **Stats**: Total metrics, unique metrics, instances monitored
- **Metrics by Type**: Grouped cards with avg/max/min values
- **Recent Metrics**: Latest 50 readings
- **Auto-refresh**: Every 30 seconds

### Components

#### StatsCard
Reusable card for displaying statistics with optional icons and variants.

```typescript
<StatsCard
  title="Total Instances"
  value={42}
  description="Monitored services"
  icon={Server}
  variant="success"
/>
```

**Variants**: `default`, `success`, `warning`, `danger`

#### MetricChart
Line chart for displaying metric trends over time.

```typescript
<MetricChart
  title="CPU Usage"
  description="Hourly average"
  data={metricsData}
  metricName="cpu_usage"
/>
```

#### Navbar
Top navigation with logo, links, and system status indicator.

### Hooks

All hooks support auto-fetch and auto-refresh:

```typescript
// Dashboard hook
const { dashboard, loading, error, refetch } = useDashboard({
  autoFetch: true,
  refreshInterval: 30000, // 30 seconds
});

// Alerts hooks
const { alerts, loading, error } = useAlerts();
const { alerts } = useActiveAlerts();
const { acknowledgeAlert, resolveAlert } = useUpdateAlert();
const { deleteAlert } = useDeleteAlert();

// Instances hooks
const { instances, loading, error } = useInstances();
const { instances: healthy } = useHealthyInstances();
const { deleteInstance } = useDeleteInstance();

// Metrics hooks
const { metrics, loading, error } = useMetrics();
const { createMetric } = useCreateMetric();
```

## Setup

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true
NEXT_PUBLIC_METRICS_REFRESH_INTERVAL=30000
NEXT_PUBLIC_ALERTS_REFRESH_INTERVAL=60000
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Styling Guide

### Colors

The app uses semantic color tokens from shadcn/ui:

```css
--background: Background color
--foreground: Text color
--primary: Primary brand color
--secondary: Secondary color
--accent: Accent color
--muted: Muted text/backgrounds
--destructive: Error/danger color
```

### Status Colors

```typescript
// Instance status
healthy → green
unhealthy → red
warning → yellow
unknown → gray

// Alert severity
critical → red (destructive)
high → default
medium → secondary
low → outline
```

### Responsive Design

- Mobile: Single column
- Tablet (md): 2 columns
- Desktop (lg): 3-5 columns depending on component

## UI Components (shadcn/ui)

Installed components:
- `Button` - Action buttons with variants
- `Card` - Container component
- `Badge` - Status indicators
- `Alert` - Notification messages
- `Avatar` - User avatars
- `Dialog` - Modal dialogs
- `Dropdown Menu` - Action menus
- `Select` - Dropdown selects
- `Table` - Data tables
- `Tabs` - Tabbed interfaces
- `Input` - Form inputs
- `Label` - Form labels
- `Textarea` - Multi-line inputs
- `Separator` - Visual dividers
- `Scroll Area` - Scrollable containers
- `Skeleton` - Loading placeholders

### Adding More Components

```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add tooltip
npx shadcn@latest add popover
npx shadcn@latest add sheet
```

## Customization

### Adding a New Page

1. Create directory: `app/my-page/`
2. Create `page.tsx`:

```typescript
'use client';

export default function MyPage() {
  return (
    <div className="container py-8">
      <h1 className="text-4xl font-bold">My Page</h1>
    </div>
  );
}
```

3. Add to navbar in `app/components/navbar.tsx`

### Adding a New API Endpoint

1. Define types in `app/types/index.ts`:

```typescript
export interface MyData {
  id: string;
  name: string;
}
```

2. Create API service in `app/lib/api/my-api.ts`:

```typescript
import { apiClient } from './client';
import type { MyData } from '@/app/types';

export const myApi = {
  async getData(): Promise<MyData[]> {
    return apiClient.get<MyData[]>('/my-endpoint');
  },
};
```

3. Create hook in `app/lib/hooks/useMyData.ts`:

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { myApi } from '../api/my-api';
import type { MyData } from '@/app/types';

export function useMyData() {
  const [data, setData] = useState<MyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await myApi.getData();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

4. Use in component:

```typescript
import { useMyData } from '@/app/lib/hooks/useMyData';

function MyComponent() {
  const { data, loading, error } = useMyData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Use data */}</div>;
}
```

## Performance Optimization

### Auto-refresh Best Practices

- **Dashboard**: 30 seconds (high priority)
- **Alerts**: 60 seconds (medium priority)
- **Instances**: 60 seconds (medium priority)
- **Metrics**: 30 seconds (high priority)

### Loading States

Always show skeletons during initial load:

```typescript
{loading ? (
  <Skeleton className="h-24 w-full" />
) : (
  <ActualContent />
)}
```

### Error Handling

Always handle errors gracefully:

```typescript
if (error) {
  return (
    <Alert variant="destructive">
      <AlertDescription>
        {error.message}
        <button onClick={refetch}>Retry</button>
      </AlertDescription>
    </Alert>
  );
}
```

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_ENVIRONMENT=production`

### Alternative: AWS Amplify

1. Connect GitHub repository
2. Set build settings:
   - Build command: `npm run build`
   - Output directory: `.next`
3. Add environment variables
4. Deploy

## Troubleshooting

### API Connection Issues

1. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Verify backend is deployed and accessible
3. Check browser console for CORS errors
4. Verify API Gateway has CORS enabled

### Build Errors

```bash
# Clear cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### TypeScript Errors

```bash
# Type check
npm run type-check

# or
npx tsc --noEmit
```

### Styling Issues

1. Ensure Tailwind config is correct
2. Check `globals.css` imports
3. Verify shadcn components are installed

## Best Practices

1. **Always use TypeScript types** - Import from `@/app/types`
2. **Use hooks for data fetching** - Don't call API directly in components
3. **Show loading states** - Use Skeleton components
4. **Handle errors** - Show error messages with retry option
5. **Use semantic HTML** - Accessible markup
6. **Mobile-first** - Design for mobile, enhance for desktop
7. **Dark mode ready** - All components support dark mode
8. **Consistent spacing** - Use Tailwind spacing utilities
9. **Reusable components** - Extract common patterns
10. **Document new features** - Add comments for complex logic

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/icons)
- [Recharts Docs](https://recharts.org)

## Getting Help

- Check [API_INTEGRATION.md](./API_INTEGRATION.md) for API usage
- Check [DEPLOYMENT.md](../DEPLOYMENT.md) for backend deployment
- Check [README.md](../README.md) for project overview

---

**Built with Next.js, shadcn/ui, and Tailwind CSS**
