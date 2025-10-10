/**
 * Comprehensive Monitoring and Logging System
 * Provides metrics collection, performance monitoring, and error tracking
 */

import { logger } from './logger';
import { handleError } from './errorHandler';

// ===== MONITORING TYPES =====

export interface MetricData {
    name: string;
    value: number;
    unit: string;
    timestamp: number;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
}

export interface PerformanceMetric {
    operation: string;
    duration: number;
    success: boolean;
    timestamp: number;
    context?: Record<string, any>;
}

export interface ErrorMetric {
    error: Error;
    context: string;
    timestamp: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    user?: string;
    session?: string;
    metadata?: Record<string, any>;
}

export interface BundleMetric {
    name: string;
    size: number;
    gzippedSize: number;
    loadTime: number;
    timestamp: number;
}

export interface APIMetric {
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    timestamp: number;
    user?: string;
    requestSize?: number;
    responseSize?: number;
}

// ===== METRICS COLLECTOR =====

/**
 * Metrics collector for performance and business metrics
 */
export class MetricsCollector {
    private metrics: MetricData[] = [];
    private maxMetrics = 10000;
    private flushInterval = 60000; // 1 minute
    private flushTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.startFlushTimer();
    }

    /**
     * Record a metric
     */
    recordMetric(
        name: string,
        value: number,
        unit: string = 'count',
        tags?: Record<string, string>,
        metadata?: Record<string, any>
    ): void {
        const metric: MetricData = {
            name,
            value,
            unit,
            timestamp: Date.now(),
            tags,
            metadata
        };

        this.metrics.push(metric);

        // Prevent memory overflow
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }

        logger.debug('Metric recorded', { name, value, unit, tags });
    }

    /**
     * Record performance metric
     */
    recordPerformance(metric: PerformanceMetric): void {
        this.recordMetric(
            `performance.${metric.operation}`,
            metric.duration,
            'ms',
            {
                success: metric.success.toString(),
                operation: metric.operation
            },
            metric.context
        );
    }

    /**
     * Record error metric
     */
    recordError(metric: ErrorMetric): void {
        this.recordMetric(
            `error.${metric.context}`,
            1,
            'count',
            {
                severity: metric.severity,
                context: metric.context,
                errorType: metric.error.name
            },
            {
                message: metric.error.message,
                stack: metric.error.stack,
                user: metric.user,
                session: metric.session,
                ...metric.metadata
            }
        );
    }

    /**
     * Record API metric
     */
    recordAPI(metric: APIMetric): void {
        this.recordMetric(
            `api.${metric.endpoint}`,
            metric.duration,
            'ms',
            {
                method: metric.method,
                statusCode: metric.statusCode.toString(),
                endpoint: metric.endpoint
            },
            {
                user: metric.user,
                requestSize: metric.requestSize,
                responseSize: metric.responseSize
            }
        );
    }

    /**
     * Record bundle metric
     */
    recordBundle(metric: BundleMetric): void {
        this.recordMetric(
            `bundle.${metric.name}`,
            metric.size,
            'bytes',
            {
                bundle: metric.name
            },
            {
                gzippedSize: metric.gzippedSize,
                loadTime: metric.loadTime
            }
        );
    }

    /**
     * Get metrics by name
     */
    getMetrics(name: string, limit?: number): MetricData[] {
        const filtered = this.metrics.filter(m => m.name === name);
        return limit ? filtered.slice(-limit) : filtered;
    }

    /**
     * Get metrics by time range
     */
    getMetricsByTimeRange(
        startTime: number,
        endTime: number,
        name?: string
    ): MetricData[] {
        return this.metrics.filter(m => {
            const matchesTime = m.timestamp >= startTime && m.timestamp <= endTime;
            const matchesName = !name || m.name === name;
            return matchesTime && matchesName;
        });
    }

    /**
     * Get aggregated metrics
     */
    getAggregatedMetrics(
        name: string,
        aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
        timeRange?: { start: number; end: number }
    ): number {
        let metrics = this.getMetrics(name);

        if (timeRange) {
            metrics = metrics.filter(m =>
                m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
            );
        }

        if (metrics.length === 0) return 0;

        switch (aggregation) {
            case 'sum':
                return metrics.reduce((sum, m) => sum + m.value, 0);
            case 'avg':
                return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
            case 'min':
                return Math.min(...metrics.map(m => m.value));
            case 'max':
                return Math.max(...metrics.map(m => m.value));
            case 'count':
                return metrics.length;
            default:
                return 0;
        }
    }

    /**
     * Clear metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        logger.info('Metrics cleared');
    }

    /**
     * Export metrics
     */
    exportMetrics(): MetricData[] {
        return [...this.metrics];
    }

    /**
     * Start flush timer
     */
    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            this.flushMetrics();
        }, this.flushInterval);
    }

    /**
     * Flush metrics to external service
     */
    private flushMetrics(): void {
        if (this.metrics.length === 0) return;

        // In a real implementation, this would send metrics to an external service
        logger.debug('Flushing metrics', { count: this.metrics.length });

        // For now, just log the metrics
        this.metrics.forEach(metric => {
            logger.info('Metric', metric);
        });

        // Clear metrics after flush
        this.metrics = [];
    }

    /**
     * Stop flush timer
     */
    stop(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
}

// ===== PERFORMANCE MONITOR =====

/**
 * Performance monitor for tracking application performance
 */
export class PerformanceMonitor {
    private static instance: PerformanceMonitor;
    private metricsCollector: MetricsCollector;
    private performanceEntries: Map<string, number> = new Map();

    constructor(metricsCollector: MetricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    static getInstance(metricsCollector?: MetricsCollector): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor(
                metricsCollector || new MetricsCollector()
            );
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Start performance measurement
     */
    startMeasurement(operation: string): string {
        const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.performanceEntries.set(id, performance.now());
        return id;
    }

    /**
     * End performance measurement
     */
    endMeasurement(
        id: string,
        success: boolean = true,
        context?: Record<string, any>
    ): void {
        const startTime = this.performanceEntries.get(id);
        if (!startTime) {
            logger.warn('Performance measurement not found', { id });
            return;
        }

        const duration = performance.now() - startTime;
        this.performanceEntries.delete(id);

        this.metricsCollector.recordPerformance({
            operation: id.split('_')[0],
            duration,
            success,
            timestamp: Date.now(),
            context
        });
    }

    /**
     * Measure function execution
     */
    async measureFunction<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: Record<string, any>
    ): Promise<T> {
        const id = this.startMeasurement(operation);

        try {
            const result = await fn();
            this.endMeasurement(id, true, context);
            return result;
        } catch (error) {
            this.endMeasurement(id, false, { ...context, error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Measure synchronous function execution
     */
    measureSyncFunction<T>(
        operation: string,
        fn: () => T,
        context?: Record<string, any>
    ): T {
        const id = this.startMeasurement(operation);

        try {
            const result = fn();
            this.endMeasurement(id, true, context);
            return result;
        } catch (error) {
            this.endMeasurement(id, false, { ...context, error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary(operation?: string): {
        operation: string;
        count: number;
        avgDuration: number;
        minDuration: number;
        maxDuration: number;
        successRate: number;
    }[] {
        const metrics = operation
            ? this.metricsCollector.getMetrics(`performance.${operation}`)
            : this.metricsCollector.exportMetrics().filter(m => m.name.startsWith('performance.'));

        const grouped = metrics.reduce((acc, metric) => {
            const op = metric.tags?.operation || 'unknown';
            if (!acc[op]) {
                acc[op] = [];
            }
            acc[op].push(metric);
            return acc;
        }, {} as Record<string, MetricData[]>);

        return Object.entries(grouped).map(([operation, metrics]) => {
            const durations = metrics.map(m => m.value);
            const successCount = metrics.filter(m => m.tags?.success === 'true').length;

            return {
                operation,
                count: metrics.length,
                avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
                minDuration: Math.min(...durations),
                maxDuration: Math.max(...durations),
                successRate: successCount / metrics.length
            };
        });
    }
}

// ===== ERROR TRACKER =====

/**
 * Error tracker for comprehensive error monitoring
 */
export class ErrorTracker {
    private static instance: ErrorTracker;
    private metricsCollector: MetricsCollector;
    private errorCounts: Map<string, number> = new Map();
    private recentErrors: ErrorMetric[] = [];
    private maxRecentErrors = 100;

    constructor(metricsCollector: MetricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    static getInstance(metricsCollector?: MetricsCollector): ErrorTracker {
        if (!ErrorTracker.instance) {
            ErrorTracker.instance = new ErrorTracker(
                metricsCollector || new MetricsCollector()
            );
        }
        return ErrorTracker.instance;
    }

    /**
     * Track an error
     */
    trackError(
        error: Error,
        context: string,
        severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
        user?: string,
        session?: string,
        metadata?: Record<string, any>
    ): void {
        const errorMetric: ErrorMetric = {
            error,
            context,
            timestamp: Date.now(),
            severity,
            user,
            session,
            metadata
        };

        // Record in metrics
        this.metricsCollector.recordError(errorMetric);

        // Track error counts
        const errorKey = `${context}:${error.name}`;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        // Store recent errors
        this.recentErrors.push(errorMetric);
        if (this.recentErrors.length > this.maxRecentErrors) {
            this.recentErrors = this.recentErrors.slice(-this.maxRecentErrors);
        }

        // Log based on severity
        switch (severity) {
            case 'critical':
                logger.error('Critical error tracked', { error, context, user, session });
                break;
            case 'high':
                logger.error('High severity error tracked', { error, context, user, session });
                break;
            case 'medium':
                logger.warn('Medium severity error tracked', { error, context, user, session });
                break;
            case 'low':
                logger.info('Low severity error tracked', { error, context, user, session });
                break;
        }
    }

    /**
     * Get error summary
     */
    getErrorSummary(): {
        totalErrors: number;
        errorCounts: Record<string, number>;
        recentErrors: ErrorMetric[];
        severityBreakdown: Record<string, number>;
    } {
        const severityBreakdown = this.recentErrors.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalErrors: this.recentErrors.length,
            errorCounts: Object.fromEntries(this.errorCounts),
            recentErrors: this.recentErrors,
            severityBreakdown
        };
    }

    /**
     * Get errors by context
     */
    getErrorsByContext(context: string): ErrorMetric[] {
        return this.recentErrors.filter(e => e.context === context);
    }

    /**
     * Get errors by severity
     */
    getErrorsBySeverity(severity: string): ErrorMetric[] {
        return this.recentErrors.filter(e => e.severity === severity);
    }

    /**
     * Clear error history
     */
    clearErrors(): void {
        this.errorCounts.clear();
        this.recentErrors = [];
        logger.info('Error history cleared');
    }
}

// ===== BUNDLE MONITOR =====

/**
 * Bundle monitor for tracking bundle size and performance
 */
export class BundleMonitor {
    private static instance: BundleMonitor;
    private metricsCollector: MetricsCollector;
    private bundleMetrics: BundleMetric[] = [];

    constructor(metricsCollector: MetricsCollector) {
        this.metricsCollector = metricsCollector;
    }

    static getInstance(metricsCollector?: MetricsCollector): BundleMonitor {
        if (!BundleMonitor.instance) {
            BundleMonitor.instance = new BundleMonitor(
                metricsCollector || new MetricsCollector()
            );
        }
        return BundleMonitor.instance;
    }

    /**
     * Record bundle metric
     */
    recordBundle(
        name: string,
        size: number,
        gzippedSize: number,
        loadTime: number
    ): void {
        const metric: BundleMetric = {
            name,
            size,
            gzippedSize,
            loadTime,
            timestamp: Date.now()
        };

        this.bundleMetrics.push(metric);
        this.metricsCollector.recordBundle(metric);

        logger.debug('Bundle metric recorded', { name, size, gzippedSize, loadTime });
    }

    /**
     * Get bundle summary
     */
    getBundleSummary(): {
        totalSize: number;
        totalGzippedSize: number;
        avgLoadTime: number;
        bundles: BundleMetric[];
    } {
        const totalSize = this.bundleMetrics.reduce((sum, b) => sum + b.size, 0);
        const totalGzippedSize = this.bundleMetrics.reduce((sum, b) => sum + b.gzippedSize, 0);
        const avgLoadTime = this.bundleMetrics.reduce((sum, b) => sum + b.loadTime, 0) / this.bundleMetrics.length;

        return {
            totalSize,
            totalGzippedSize,
            avgLoadTime: avgLoadTime || 0,
            bundles: this.bundleMetrics
        };
    }

    /**
     * Check bundle size thresholds
     */
    checkBundleThresholds(
        maxSize: number = 500 * 1024, // 500KB
        maxGzippedSize: number = 200 * 1024 // 200KB
    ): {
        warnings: string[];
        errors: string[];
    } {
        const warnings: string[] = [];
        const errors: string[] = [];

        this.bundleMetrics.forEach(bundle => {
            if (bundle.size > maxSize) {
                errors.push(`Bundle ${bundle.name} exceeds size limit: ${bundle.size} > ${maxSize}`);
            } else if (bundle.size > maxSize * 0.8) {
                warnings.push(`Bundle ${bundle.name} approaching size limit: ${bundle.size} > ${maxSize * 0.8}`);
            }

            if (bundle.gzippedSize > maxGzippedSize) {
                errors.push(`Bundle ${bundle.name} exceeds gzipped size limit: ${bundle.gzippedSize} > ${maxGzippedSize}`);
            } else if (bundle.gzippedSize > maxGzippedSize * 0.8) {
                warnings.push(`Bundle ${bundle.name} approaching gzipped size limit: ${bundle.gzippedSize} > ${maxGzippedSize * 0.8}`);
            }
        });

        return { warnings, errors };
    }
}

// ===== GLOBAL INSTANCES =====

export const metricsCollector = new MetricsCollector();
export const performanceMonitor = PerformanceMonitor.getInstance(metricsCollector);
export const errorTracker = ErrorTracker.getInstance(metricsCollector);
export const bundleMonitor = BundleMonitor.getInstance(metricsCollector);

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Track performance
 */
export function trackPerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
): Promise<T> {
    return performanceMonitor.measureFunction(operation, fn, context);
}

/**
 * Track error
 */
export function trackError(
    error: Error,
    context: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    user?: string,
    session?: string,
    metadata?: Record<string, any>
): void {
    errorTracker.trackError(error, context, severity, user, session, metadata);
}

/**
 * Record metric
 */
export function recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags?: Record<string, string>,
    metadata?: Record<string, any>
): void {
    metricsCollector.recordMetric(name, value, unit, tags, metadata);
}

/**
 * Record API metric
 */
export function recordAPI(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    user?: string,
    requestSize?: number,
    responseSize?: number
): void {
    metricsCollector.recordAPI({
        endpoint,
        method,
        statusCode,
        duration,
        timestamp: Date.now(),
        user,
        requestSize,
        responseSize
    });
}

export default {
    MetricsCollector,
    PerformanceMonitor,
    ErrorTracker,
    BundleMonitor,
    trackPerformance,
    trackError,
    recordMetric,
    recordAPI,
    metricsCollector,
    performanceMonitor,
    errorTracker,
    bundleMonitor
};
