'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LiveMetricChartProps {
  title: string;
  description?: string;
  data: Array<{ timestamp: string; value: number }>;
  color?: string;
  unit?: string;
  maxValue?: number;
  showArea?: boolean;
}

export function LiveMetricChart({
  title,
  description,
  data,
  color = '#8884d8',
  unit = '',
  maxValue,
  showArea = true,
}: LiveMetricChartProps) {
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    setChartData(data);
  }, [data]);

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get current value
  const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;

  // Calculate trend (comparing first and last value)
  const trend = chartData.length > 1
    ? ((chartData[chartData.length - 1].value - chartData[0].value) / chartData[0].value) * 100
    : 0;

  // Determine health status based on value and max
  const getHealthStatus = () => {
    if (!maxValue) return 'default';
    const percentage = (currentValue / maxValue) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 75) return 'warning';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {currentValue.toFixed(1)}{unit}
            </div>
            {maxValue && (
              <div className="text-xs text-muted-foreground">
                of {maxValue}{unit}
              </div>
            )}
          </div>
        </div>
        {trend !== 0 && (
          <div className={`text-xs ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% from start
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-2">
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            {showArea ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, maxValue || 'auto']}
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={formatTime}
                  formatter={(value: number) => [`${value.toFixed(2)}${unit}`, title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fill={`url(#gradient-${title})`}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                />
                <YAxis
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, maxValue || 'auto']}
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={formatTime}
                  formatter={(value: number) => [`${value.toFixed(2)}${unit}`, title]}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        {/* Health indicator */}
        {maxValue && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  healthStatus === 'critical'
                    ? 'bg-red-500'
                    : healthStatus === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((currentValue / maxValue) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {((currentValue / maxValue) * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
