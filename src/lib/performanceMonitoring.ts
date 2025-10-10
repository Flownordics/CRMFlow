/**
 * Performance Monitoring
 * Comprehensive performance monitoring and analytics
 */

import { logger } from './logger';

// ===== PERFORMANCE TYPES =====

export interface PerformanceMetric {
    name: string;
    value: number;
    timestamp: number;
    category: 'navigation' | 'resource' | 'measure' | 'custom';
    metadata?: Record<string, unknown>;
}

export interface PerformanceThreshold {
    name: string;
    threshold: number;
    severity: 'warning' | 'error' | 'critical';
    category: string;
}

export interface PerformanceReport {
    timestamp: number;
    metrics: PerformanceMetric[];
    violations: PerformanceThreshold[];
    summary: {
        totalMetrics: number;
        averageValue: number;
        maxValue: number;
        minValue: number;
    };
}

// ===== PERFORMANCE MONITOR =====

export class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private thresholds: PerformanceThreshold[] = [];
    private observers: Map<string, PerformanceObserver> = new Map();
    private isMonitoring = false;

    constructor() {
        this.setupDefaultThresholds();
    }

    /**
     * Start performance monitoring
     */
    start(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.setupObservers();
        logger.info('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stop(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        logger.info('Performance monitoring stopped');
    }

    /**
     * Setup default performance thresholds
     */
    private setupDefaultThresholds(): void {
        this.thresholds = [
            // Navigation timing
            { name: 'domContentLoaded', threshold: 2000, severity: 'warning', category: 'navigation' },
            { name: 'loadComplete', threshold: 3000, severity: 'error', category: 'navigation' },
            { name: 'firstContentfulPaint', threshold: 1500, severity: 'warning', category: 'navigation' },
            { name: 'largestContentfulPaint', threshold: 2500, severity: 'error', category: 'navigation' },

            // Resource timing
            { name: 'resourceLoadTime', threshold: 1000, severity: 'warning', category: 'resource' },
            { name: 'apiResponseTime', threshold: 2000, severity: 'warning', category: 'resource' },

            // Custom metrics
            { name: 'componentRenderTime', threshold: 100, severity: 'warning', category: 'custom' },
            { name: 'queryExecutionTime', threshold: 500, severity: 'warning', category: 'custom' }
        ];
    }

    /**
     * Setup performance observers
     */
    private setupObservers(): void {
        // Navigation timing
        if ('PerformanceObserver' in window) {
            try {
                const navObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.recordMetric({
                            name: entry.name,
                            value: entry.duration,
                            timestamp: entry.startTime,
                            category: 'navigation',
                            metadata: {
                                entryType: entry.entryType,
                                startTime: entry.startTime
                            }
                        });
                    });
                });
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.set('navigation', navObserver);
            } catch (error) {
                logger.warn('Failed to setup navigation observer', { error });
            }

            // Resource timing
            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.recordMetric({
                            name: entry.name,
                            value: entry.duration,
                            timestamp: entry.startTime,
                            category: 'resource',
                            metadata: {
                                entryType: entry.entryType,
                                initiatorType: (entry as PerformanceResourceTiming).initiatorType,
                                transferSize: (entry as PerformanceResourceTiming).transferSize
                            }
                        });
                    });
                });
                resourceObserver.observe({ entryTypes: ['resource'] });
                this.observers.set('resource', resourceObserver);
            } catch (error) {
                logger.warn('Failed to setup resource observer', { error });
            }

            // Paint timing
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        this.recordMetric({
                            name: entry.name,
                            value: entry.startTime,
                            timestamp: entry.startTime,
                            category: 'navigation',
                            metadata: {
                                entryType: entry.entryType
                            }
                        });
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.observers.set('paint', paintObserver);
            } catch (error) {
                logger.warn('Failed to setup paint observer', { error });
            }
        }
    }

    /**
     * Record a performance metric
     */
    recordMetric(metric: PerformanceMetric): void {
        this.metrics.push(metric);

        // Check thresholds
        this.checkThresholds(metric);

        // Log performance data
        logger.performance(`Performance metric recorded`, {
            name: metric.name,
            value: metric.value,
            category: metric.category
        });
    }

    /**
     * Check performance thresholds
     */
    private checkThresholds(metric: PerformanceMetric): void {
        const relevantThresholds = this.thresholds.filter(
            threshold => threshold.name === metric.name ||
                (threshold.category === metric.category && threshold.name.includes(metric.name))
        );

        for (const threshold of relevantThresholds) {
            if (metric.value > threshold.threshold) {
                logger.warn(`Performance threshold violated`, {
                    metric: metric.name,
                    value: metric.value,
                    threshold: threshold.threshold,
                    severity: threshold.severity,
                    category: threshold.category
                });
            }
        }
    }

    /**
     * Measure custom performance
     */
    measure(name: string, fn: () => void | Promise<void>): void {
        const start = performance.now();

        try {
            const result = fn();

            if (result instanceof Promise) {
                result.finally(() => {
                    const duration = performance.now() - start;
                    this.recordMetric({
                        name,
                        value: duration,
                        timestamp: start,
                        category: 'custom'
                    });
                });
            } else {
                const duration = performance.now() - start;
                this.recordMetric({
                    name,
                    value: duration,
                    timestamp: start,
                    category: 'custom'
                });
            }
        } catch (error) {
            logger.error('Performance measurement failed', { error, name });
        }
    }

    /**
     * Get performance report
     */
    getReport(): PerformanceReport {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(
            metric => now - metric.timestamp < 5 * 60 * 1000 // Last 5 minutes
        );

        const violations = this.thresholds.filter(threshold => {
            const relevantMetrics = recentMetrics.filter(
                metric => metric.name === threshold.name ||
                    (threshold.category === metric.category && threshold.name.includes(metric.name))
            );

            return relevantMetrics.some(metric => metric.value > threshold.threshold);
        });

        const values = recentMetrics.map(metric => metric.value);
        const summary = {
            totalMetrics: recentMetrics.length,
            averageValue: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
            maxValue: values.length > 0 ? Math.max(...values) : 0,
            minValue: values.length > 0 ? Math.min(...values) : 0
        };

        return {
            timestamp: now,
            metrics: recentMetrics,
            violations,
            summary
        };
    }

    /**
     * Clear metrics
     */
    clearMetrics(): void {
        this.metrics = [];
        logger.info('Performance metrics cleared');
    }

    /**
     * Add custom threshold
     */
    addThreshold(threshold: PerformanceThreshold): void {
        this.thresholds.push(threshold);
    }

    /**
     * Get metrics by category
     */
    getMetricsByCategory(category: string): PerformanceMetric[] {
        return this.metrics.filter(metric => metric.category === category);
    }

    /**
     * Get average performance for a metric
     */
    getAveragePerformance(metricName: string, timeWindow: number = 5 * 60 * 1000): number {
        const now = Date.now();
        const relevantMetrics = this.metrics.filter(
            metric => metric.name === metricName &&
                now - metric.timestamp < timeWindow
        );

        if (relevantMetrics.length === 0) {
            return 0;
        }

        return relevantMetrics.reduce((sum, metric) => sum + metric.value, 0) / relevantMetrics.length;
    }
}

// ===== REACT PERFORMANCE HOOKS =====

export function usePerformanceMonitoring() {
    const monitor = performanceMonitor;

    const measureComponent = (componentName: string, fn: () => void) => {
        monitor.measure(`component_${componentName}`, fn);
    };

    const measureAsync = async (name: string, fn: () => Promise<void>) => {
        monitor.measure(name, fn);
    };

    const recordCustomMetric = (name: string, value: number, metadata?: Record<string, unknown>) => {
        monitor.recordMetric({
            name,
            value,
            timestamp: performance.now(),
            category: 'custom',
            metadata
        });
    };

    return {
        measureComponent,
        measureAsync,
        recordCustomMetric,
        getReport: () => monitor.getReport(),
        getMetricsByCategory: (category: string) => monitor.getMetricsByCategory(category)
    };
}

// ===== GLOBAL INSTANCE =====

export const performanceMonitor = new PerformanceMonitor();

// ===== CONVENIENCE FUNCTIONS =====

export function startPerformanceMonitoring() {
    performanceMonitor.start();
}

export function stopPerformanceMonitoring() {
    performanceMonitor.stop();
}

export function measurePerformance(name: string, fn: () => void | Promise<void>) {
    performanceMonitor.measure(name, fn);
}

export function recordPerformanceMetric(name: string, value: number, category: string = 'custom', metadata?: Record<string, unknown>) {
    performanceMonitor.recordMetric({
        name,
        value,
        timestamp: performance.now(),
        category: category as any,
        metadata
    });
}

export function getPerformanceReport() {
    return performanceMonitor.getReport();
}

export default {
    PerformanceMonitor,
    usePerformanceMonitoring,
    performanceMonitor,
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    measurePerformance,
    recordPerformanceMetric,
    getPerformanceReport
};
