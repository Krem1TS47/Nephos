'use client';

import { useInsightsSummary, useInsights } from '@/app/lib/hooks';
import { config } from '@/app/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Sparkles, TrendingUp, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function InsightsPage() {
    const {
        summary: aiSummary,
        loading: summaryLoading,
        generating: summaryGenerating,
        error: summaryError,
        generate: generateSummary,
    } = useInsightsSummary({
        autoFetch: true,
        refreshInterval: config.refreshIntervals.dashboard,
    });

    const {
        insights: aiInsights,
        loading: insightsLoading,
        generating: insightsGenerating,
        error: insightsError,
        generate: generateInsights,
    } = useInsights({
        autoFetch: true,
        limit: 20,
        refreshInterval: config.refreshIntervals.dashboard,
    });

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-background">
            <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">AI Insights</h1>
                    <p className="text-muted-foreground mt-2">
                        Snowflake Cortex AI-powered analysis of your cloud infrastructure
                    </p>
                </div>

                {/* AI Summary Card */}
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-purple-600" />
                                    <CardTitle>AI-Powered Health Summary</CardTitle>
                                </div>
                                <CardDescription className="mt-2">
                                    Real-time analysis using Mistral Large language model
                                </CardDescription>
                            </div>
                            <Button
                                onClick={generateSummary}
                                disabled={summaryGenerating}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${summaryGenerating ? 'animate-spin' : ''}`} />
                                {summaryGenerating ? 'Generating...' : 'Generate New Insights'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {summaryLoading ? (
                            <Skeleton className="h-32 w-full" />
                        ) : summaryError ? (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Failed to load AI summary: {summaryError.message}
                                </AlertDescription>
                            </Alert>
                        ) : aiSummary ? (
                            <div className="space-y-4">
                                <div className="prose dark:prose-invert max-w-none">
                                    <p className="text-sm leading-relaxed whitespace-pre-line">{aiSummary.summary}</p>
                                </div>
                                {aiSummary.criticalInsight && (
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <Zap className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                                                    Critical Insight
                                                </h4>
                                                <p className="text-sm text-red-800 dark:text-red-200">
                                                    {aiSummary.criticalInsight.description}
                                                </p>
                                                {aiSummary.criticalInsight.recommendations && (
                                                    <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                                                        <strong>Recommended:</strong> {aiSummary.criticalInsight.recommendations}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-sm">
                                No AI summary available. Data is being analyzed...
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* AI Insights Grid */}
                <div className="grid gap-4 md:grid-cols-3">
                    {/* Patterns */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                <CardTitle className="text-base">Patterns</CardTitle>
                            </div>
                            <CardDescription>Identified trends and behaviors</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insightsLoading ? (
                                <Skeleton className="h-32 w-full" />
                            ) : (
                                <div className="space-y-2">
                                    {aiInsights
                                        .filter((i) => i.type === 'pattern')
                                        .slice(0, 3)
                                        .map((insight) => (
                                            <div
                                                key={insight.id}
                                                className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm"
                                            >
                                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                                    {insight.title}
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                    Confidence: {(insight.confidenceScore * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        ))}
                                    {aiInsights.filter((i) => i.type === 'pattern').length === 0 && (
                                        <p className="text-sm text-muted-foreground">No patterns detected</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Anomalies */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-orange-600" />
                                <CardTitle className="text-base">Anomalies</CardTitle>
                            </div>
                            <CardDescription>Unusual behavior detected</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insightsLoading ? (
                                <Skeleton className="h-32 w-full" />
                            ) : (
                                <div className="space-y-2">
                                    {aiInsights
                                        .filter((i) => i.type === 'anomaly')
                                        .slice(0, 3)
                                        .map((insight) => (
                                            <div
                                                key={insight.id}
                                                className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg text-sm"
                                            >
                                                <p className="font-medium text-orange-900 dark:text-orange-100">
                                                    {insight.title}
                                                </p>
                                                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                                    Confidence: {(insight.confidenceScore * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        ))}
                                    {aiInsights.filter((i) => i.type === 'anomaly').length === 0 && (
                                        <p className="text-sm text-muted-foreground">No anomalies detected</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Predictions */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-purple-600" />
                                <CardTitle className="text-base">Predictions</CardTitle>
                            </div>
                            <CardDescription>Forecasted issues and trends</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insightsLoading ? (
                                <Skeleton className="h-32 w-full" />
                            ) : (
                                <div className="space-y-2">
                                    {aiInsights
                                        .filter((i) => i.type === 'prediction')
                                        .slice(0, 3)
                                        .map((insight) => (
                                            <div
                                                key={insight.id}
                                                className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-sm"
                                            >
                                                <p className="font-medium text-purple-900 dark:text-purple-100">
                                                    {insight.title}
                                                </p>
                                                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                                                    Confidence: {(insight.confidenceScore * 100).toFixed(0)}%
                                                </p>
                                            </div>
                                        ))}
                                    {aiInsights.filter((i) => i.type === 'prediction').length === 0 && (
                                        <p className="text-sm text-muted-foreground">No predictions available</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Insights List */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>All AI Insights</CardTitle>
                                <CardDescription>Comprehensive analysis from Snowflake Cortex AI</CardDescription>
                            </div>
                            <Button
                                onClick={generateInsights}
                                disabled={insightsGenerating}
                                variant="outline"
                                size="sm"
                                className="gap-2"
                            >
                                <Brain className={`h-4 w-4 ${insightsGenerating ? 'animate-spin' : ''}`} />
                                {insightsGenerating ? 'Analyzing...' : 'Analyze Now'}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {insightsLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        ) : insightsError ? (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    Failed to load insights: {insightsError.message}
                                </AlertDescription>
                            </Alert>
                        ) : aiInsights.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Brain className="h-16 w-16 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold">No Insights Yet</h3>
                                <p className="text-muted-foreground">
                                    AI analysis will appear here once data is collected
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {aiInsights.map((insight) => (
                                    <div
                                        key={insight.id}
                                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge
                                                        variant={
                                                            insight.type === 'pattern'
                                                                ? 'default'
                                                                : insight.type === 'anomaly'
                                                                    ? 'destructive'
                                                                    : 'secondary'
                                                        }
                                                    >
                                                        {insight.type}
                                                    </Badge>
                                                    <Badge
                                                        variant={
                                                            insight.severity === 'high'
                                                                ? 'destructive'
                                                                : insight.severity === 'medium'
                                                                    ? 'default'
                                                                    : 'secondary'
                                                        }
                                                    >
                                                        {insight.severity}
                                                    </Badge>
                                                </div>
                                                <h4 className="font-semibold mb-1">{insight.title}</h4>
                                                <p className="text-sm text-muted-foreground mb-2">
                                                    {insight.description}
                                                </p>
                                                {insight.recommendations && (
                                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                                                        <strong className="text-blue-900 dark:text-blue-100">
                                                            Recommendation:
                                                        </strong>{' '}
                                                        <span className="text-blue-800 dark:text-blue-200">
                                                            {insight.recommendations}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex gap-4 text-xs text-muted-foreground mt-3">
                                                    <span>
                                                        Affected: {insight.affectedInstances.length} instance(s)
                                                    </span>
                                                    <span>
                                                        Confidence: {(insight.confidenceScore * 100).toFixed(0)}%
                                                    </span>
                                                    <span>
                                                        {new Date(insight.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
