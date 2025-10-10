/**
 * Performance Dashboard
 * Real-time performance monitoring dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Activity,
    AlertTriangle,
    Clock,
    Download,
    RefreshCw,
    TrendingUp,
    Zap
} from 'lucide-react';
import { usePerformanceMonitoring, getPerformanceReport } from '@/lib/performanceMonitoring';
import { logger } from '@/lib/logger';

interface PerformanceDashboardProps {
    className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
    const { getReport, getMetricsByCategory } = usePerformanceMonitoring();
    const [report, setReport] = useState(getReport());
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setReport(getReport());
        }, 5000);

        return () => clearInterval(interval);
    }, [getReport]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            setReport(getReport());
        } finally {
            setIsRefreshing(false);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'destructive';
            case 'error': return 'destructive';
            case 'warning': return 'secondary';
            default: return 'default';
        }
    };

    const formatValue = (value: number, unit: string = 'ms') => {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(2)}s`;
        }
        return `${value.toFixed(2)}${unit}`;
    };

    const navigationMetrics = getMetricsByCategory('navigation');
    const resourceMetrics = getMetricsByCategory('resource');
    const customMetrics = getMetricsByCategory('custom');

    return (
        <div className={`space-y-6 ${className}`}>
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Performance Dashboard</h2>
                <Button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    variant="outline"
                    size="sm"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.summary.totalMetrics}</div>
                        <p className="text-xs text-muted-foreground">
                            Last 5 minutes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatValue(report.summary.averageValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Average performance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Max Response</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatValue(report.summary.maxValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Peak performance
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Violations</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{report.violations.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Threshold violations
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Metrics */}
            <Tabs defaultValue="navigation" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="navigation">Navigation</TabsTrigger>
                    <TabsTrigger value="resource">Resources</TabsTrigger>
                    <TabsTrigger value="custom">Custom</TabsTrigger>
                    <TabsTrigger value="violations">Violations</TabsTrigger>
                </TabsList>

                <TabsContent value="navigation" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Navigation Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {navigationMetrics.map((metric, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex items-center space-x-2">
                                            <Zap className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{metric.name}</span>
                                        </div>
                                        <Badge variant="outline">
                                            {formatValue(metric.value)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="resource" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Resource Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {resourceMetrics.map((metric, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex items-center space-x-2">
                                            <Download className="h-4 w-4 text-green-500" />
                                            <span className="font-medium">{metric.name}</span>
                                        </div>
                                        <Badge variant="outline">
                                            {formatValue(metric.value)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Custom Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {customMetrics.map((metric, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                                        <div className="flex items-center space-x-2">
                                            <Activity className="h-4 w-4 text-purple-500" />
                                            <span className="font-medium">{metric.name}</span>
                                        </div>
                                        <Badge variant="outline">
                                            {formatValue(metric.value)}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="violations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Threshold Violations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {report.violations.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No threshold violations detected
                                    </div>
                                ) : (
                                    report.violations.map((violation, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                                            <div className="flex items-center space-x-2">
                                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                                <span className="font-medium">{violation.name}</span>
                                            </div>
                                            <Badge variant={getSeverityColor(violation.severity)}>
                                                {violation.severity}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default PerformanceDashboard;
