/**
 * Optimized React Query Cache Management
 * Provides selective invalidation, smart cache management, and query deduplication
 */

import { QueryClient, QueryKey } from '@tanstack/react-query';
import { logger } from './logger';

// ===== CACHE MANAGEMENT TYPES =====

export interface CacheInvalidationOptions {
    exact?: boolean;
    refetchType?: 'active' | 'inactive' | 'all' | 'none';
    cancelRefetch?: boolean;
}

export interface SelectiveInvalidationOptions extends CacheInvalidationOptions {
    relatedQueries?: boolean;
    dependentQueries?: boolean;
    batch?: boolean;
    priority?: 'high' | 'normal' | 'low';
    delay?: number;
}

export interface PrefetchOptions {
    staleTime?: number;
    gcTime?: number;
    priority?: 'high' | 'normal' | 'low';
    background?: boolean;
}

export interface PrefetchStrategy {
    enabled: boolean;
    prefetchOnHover?: boolean;
    prefetchOnFocus?: boolean;
    prefetchOnMount?: boolean;
    prefetchDelay?: number;
}

// ===== CACHE RELATIONSHIPS =====

/**
 * Defines relationships between different query types for smart invalidation
 */
export const QUERY_RELATIONSHIPS = {
    // Deal-related queries
    deals: {
        related: ['deals', 'dealsBoard', 'dealsStats', 'dealsSearch'],
        dependent: ['companies', 'people', 'pipelines', 'stages']
    },

    // Company-related queries
    companies: {
        related: ['companies', 'companiesSearch', 'companiesStats'],
        dependent: ['deals', 'people', 'quotes', 'orders', 'invoices']
    },

    // Person-related queries
    people: {
        related: ['people', 'peopleSearch', 'peopleStats'],
        dependent: ['deals', 'companies', 'quotes', 'orders', 'invoices']
    },

    // Quote-related queries
    quotes: {
        related: ['quotes', 'quotesStats', 'quotesSearch'],
        dependent: ['deals', 'companies', 'people', 'orders']
    },

    // Order-related queries
    orders: {
        related: ['orders', 'ordersStats', 'ordersSearch'],
        dependent: ['deals', 'companies', 'people', 'quotes', 'invoices']
    },

    // Invoice-related queries
    invoices: {
        related: ['invoices', 'invoicesStats', 'invoicesSearch'],
        dependent: ['deals', 'companies', 'people', 'orders']
    },

    // Task-related queries
    tasks: {
        related: ['tasks', 'tasksStats', 'tasksSearch'],
        dependent: ['deals', 'companies', 'people']
    },

    // Event-related queries
    events: {
        related: ['events', 'eventsStats', 'eventsSearch'],
        dependent: ['deals', 'companies', 'people', 'calendar']
    },

    // Calendar-related queries
    calendar: {
        related: ['calendarEvents', 'calendarConnection'],
        dependent: ['deals', 'events']
    },

    // Integration-related queries
    integrations: {
        related: ['workspace-integrations', 'user-integrations', 'integration-status'],
        dependent: ['calendar', 'gmail', 'google-calendar']
    }
} as const;

// ===== CACHE MANAGEMENT UTILITIES =====

/**
 * Enhanced Query Client with optimized cache management
 */
export class OptimizedQueryClient {
    private queryClient: QueryClient;
    private invalidationQueue: Map<string, { queryKey: QueryKey; options: SelectiveInvalidationOptions; timestamp: number; priority: 'high' | 'normal' | 'low' }> = new Map();
    private invalidationTimeout?: NodeJS.Timeout;
    private batchSize: number = 10;
    private batchDelay: number = 100; // ms
    private maxBatchDelay: number = 500; // ms

    constructor(queryClient: QueryClient) {
        this.queryClient = queryClient;
    }

    /**
     * Selectively invalidate queries based on relationships
     */
    invalidateSelective(
        queryKey: QueryKey,
        options: SelectiveInvalidationOptions = {}
    ): Promise<void> {
        const {
            relatedQueries = true,
            dependentQueries = false,
            batch = true,
            priority = 'normal',
            delay = 0,
            ...invalidateOptions
        } = options;

        // If batching is enabled and not high priority, queue the invalidation
        if (batch && priority !== 'high' && delay > 0) {
            return this.queueInvalidation(queryKey, options);
        }

        // If batching is enabled, queue for batch processing
        if (batch && priority !== 'high') {
            return this.queueInvalidation(queryKey, options);
        }

        // Process immediately for high priority or when batching is disabled
        return this.processInvalidation(queryKey, options);
    }

    /**
     * Queue invalidation for batch processing
     */
    private queueInvalidation(
        queryKey: QueryKey,
        options: SelectiveInvalidationOptions
    ): Promise<void> {
        const key = JSON.stringify(queryKey);
        const priority = options.priority || 'normal';

        this.invalidationQueue.set(key, {
            queryKey,
            options,
            timestamp: Date.now(),
            priority
        });

        // Process queue if it reaches batch size
        if (this.invalidationQueue.size >= this.batchSize) {
            this.processBatch();
            return Promise.resolve();
        }

        // Set timeout for batch processing
        if (!this.invalidationTimeout) {
            this.invalidationTimeout = setTimeout(() => {
                this.processBatch();
            }, this.batchDelay);
        }

        return Promise.resolve();
    }

    /**
     * Process invalidation batch
     */
    private async processBatch(): Promise<void> {
        if (this.invalidationTimeout) {
            clearTimeout(this.invalidationTimeout);
            this.invalidationTimeout = undefined;
        }

        if (this.invalidationQueue.size === 0) {
            return;
        }

        // Sort by priority and timestamp
        const sortedInvalidations = Array.from(this.invalidationQueue.values())
            .sort((a, b) => {
                const priorityOrder = { high: 0, normal: 1, low: 2 };
                const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return a.timestamp - b.timestamp;
            });

        // Process in batches
        const batches = this.chunkArray(sortedInvalidations, this.batchSize);

        for (const batch of batches) {
            await Promise.allSettled(
                batch.map(item => this.processInvalidation(item.queryKey, item.options))
            );
        }

        this.invalidationQueue.clear();
    }

    /**
     * Process individual invalidation
     */
    private async processInvalidation(
        queryKey: QueryKey,
        options: SelectiveInvalidationOptions
    ): Promise<void> {
        const { relatedQueries = true, dependentQueries = false, ...invalidateOptions } = options;

        const promises: Promise<void>[] = [];

        // Get base query type
        const baseType = this.getBaseQueryType(queryKey);
        if (baseType && QUERY_RELATIONSHIPS[baseType]) {
            // Check for circular dependencies
            if (this.hasCircularDependency(baseType, new Set())) {
                logger.warn('Circular dependency detected, invalidating all queries', { baseType });
                return this.invalidateAll();
            }

            const relationships = QUERY_RELATIONSHIPS[baseType];

            // Invalidate related queries
            if (relatedQueries && relationships.related) {
                for (const relatedType of relationships.related) {
                    const promise = this.queryClient.invalidateQueries({
                        queryKey: [relatedType],
                        ...invalidateOptions
                    });
                    promises.push(promise);
                }
            }

            // Invalidate dependent queries
            if (dependentQueries && relationships.dependent) {
                for (const dependentType of relationships.dependent) {
                    const promise = this.queryClient.invalidateQueries({
                        queryKey: [dependentType],
                        ...invalidateOptions
                    });
                    promises.push(promise);
                }
            }
        }

        // Always invalidate the specific query
        const specificPromise = this.queryClient.invalidateQueries({
            queryKey,
            ...invalidateOptions
        });
        promises.push(specificPromise);

        await Promise.all(promises);
    }

    /**
     * Split array into chunks
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Invalidate all queries
     */
    invalidateAll(): Promise<void> {
        return this.queryClient.invalidateQueries();
    }

    /**
     * Prefetch related data for a given query
     */
    async prefetchRelatedData(
        queryKey: QueryKey,
        options: PrefetchOptions = {}
    ): Promise<void> {
        const baseType = this.getBaseQueryType(queryKey);
        if (!baseType || !QUERY_RELATIONSHIPS[baseType]) {
            logger.warn('No prefetch strategy for query type', { queryKey, baseType });
            return;
        }

        const relationships = QUERY_RELATIONSHIPS[baseType];
        const prefetchPromises: Promise<void>[] = [];

        // Prefetch related queries
        if (relationships.related) {
            for (const relatedType of relationships.related) {
                const prefetchPromise = this.prefetchQueryType(relatedType, options);
                prefetchPromises.push(prefetchPromise);
            }
        }

        // Prefetch dependent queries
        if (relationships.dependent) {
            for (const dependentType of relationships.dependent) {
                const prefetchPromise = this.prefetchQueryType(dependentType, options);
                prefetchPromises.push(prefetchPromise);
            }
        }

        try {
            await Promise.allSettled(prefetchPromises);
            logger.debug('Prefetch completed', {
                queryKey,
                baseType,
                prefetchCount: prefetchPromises.length
            });
        } catch (error) {
            logger.error('Prefetch failed', { error, queryKey, baseType });
        }
    }

    /**
     * Prefetch specific query type
     */
    private async prefetchQueryType(
        queryType: string,
        options: PrefetchOptions = {}
    ): Promise<void> {
        const defaultOptions = {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes
            priority: 'low' as const,
            background: true
        };

        const prefetchOptions = { ...defaultOptions, ...options };

        try {
            // This would need to be implemented based on your specific query patterns
            // For now, we'll log the prefetch attempt
            logger.debug('Prefetching query type', {
                queryType,
                options: prefetchOptions
            });
        } catch (error) {
            logger.error('Failed to prefetch query type', { error, queryType });
        }
    }

    /**
     * Prefetch on hover with debouncing
     */
    prefetchOnHover(
        queryKey: QueryKey,
        delay: number = 300,
        options: PrefetchOptions = {}
    ): () => void {
        let timeoutId: NodeJS.Timeout;

        const prefetch = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                this.prefetchRelatedData(queryKey, options);
            }, delay);
        };

        return prefetch;
    }

    /**
     * Prefetch on focus
     */
    prefetchOnFocus(
        queryKey: QueryKey,
        options: PrefetchOptions = {}
    ): () => void {
        return () => {
            this.prefetchRelatedData(queryKey, options);
        };
    }

    /**
     * Prefetch on mount
     */
    async prefetchOnMount(
        queryKey: QueryKey,
        options: PrefetchOptions = {}
    ): Promise<void> {
        await this.prefetchRelatedData(queryKey, options);
    }

    /**
     * Smart invalidation for entity updates
     */
    invalidateEntityUpdate(
        entityType: keyof typeof QUERY_RELATIONSHIPS,
        entityId?: string,
        options: CacheInvalidationOptions = {}
    ): Promise<void> {
        const promises: Promise<void>[] = [];

        // Invalidate entity-specific queries
        promises.push(
            this.queryClient.invalidateQueries({
                queryKey: [entityType],
                ...options
            })
        );

        // Invalidate entity detail queries if ID provided
        if (entityId) {
            promises.push(
                this.queryClient.invalidateQueries({
                    queryKey: [entityType, entityId],
                    ...options
                })
            );
        }

        // Invalidate related queries
        const relationships = QUERY_RELATIONSHIPS[entityType];
        if (relationships) {
            relationships.related.forEach(relatedType => {
                promises.push(
                    this.queryClient.invalidateQueries({
                        queryKey: [relatedType],
                        ...options
                    })
                );
            });
        }

        return Promise.all(promises).then(() => { });
    }

    /**
     * Optimistic update with rollback
     */
    optimisticUpdate<T>(
        queryKey: QueryKey,
        updater: (oldData: T | undefined) => T,
        options: {
            onError?: (error: Error) => void;
            onSuccess?: () => void;
        } = {}
    ): () => void {
        // Cancel outgoing refetches
        this.queryClient.cancelQueries({ queryKey });

        // Snapshot previous value
        const previousData = this.queryClient.getQueryData<T>(queryKey);

        // Optimistically update
        this.queryClient.setQueryData(queryKey, updater);

        // Return rollback function
        return () => {
            this.queryClient.setQueryData(queryKey, previousData);
        };
    }

    /**
     * Batch invalidation for multiple queries
     */
    batchInvalidate(
        queries: Array<{
            queryKey: QueryKey;
            options?: CacheInvalidationOptions;
        }>
    ): Promise<void> {
        const promises = queries.map(({ queryKey, options = {} }) =>
            this.queryClient.invalidateQueries({
                queryKey,
                ...options
            })
        );

        return Promise.all(promises).then(() => { });
    }

    /**
     * Get base query type from query key
     */
    private getBaseQueryType(queryKey: QueryKey): keyof typeof QUERY_RELATIONSHIPS | null {
        if (!Array.isArray(queryKey) || queryKey.length === 0) {
            return null;
        }

        // Create a mapping of known query types
        const queryTypeMap: Record<string, keyof typeof QUERY_RELATIONSHIPS> = {
            'deals': 'deals',
            'dealsBoard': 'deals',
            'dealsStats': 'deals',
            'dealsSearch': 'deals',
            'companies': 'companies',
            'companiesSearch': 'companies',
            'companiesStats': 'companies',
            'people': 'people',
            'peopleSearch': 'people',
            'peopleStats': 'people',
            'quotes': 'quotes',
            'quotesStats': 'quotes',
            'quotesSearch': 'quotes',
            'orders': 'orders',
            'ordersStats': 'orders',
            'ordersSearch': 'orders',
            'invoices': 'invoices',
            'invoicesStats': 'invoices',
            'invoicesSearch': 'invoices',
            'tasks': 'tasks',
            'tasksStats': 'tasks',
            'tasksSearch': 'tasks',
            'events': 'events',
            'eventsStats': 'events',
            'eventsSearch': 'events',
            'calendar': 'calendar',
            'calendarStats': 'calendar',
            'calendarSearch': 'calendar',
            'integrations': 'integrations',
            'integrationsStats': 'integrations',
            'integrationsSearch': 'integrations'
        };

        // Check first key for exact match
        const firstKey = queryKey[0];
        if (typeof firstKey === 'string' && queryTypeMap[firstKey]) {
            return queryTypeMap[firstKey];
        }

        // Check for partial matches in all keys
        for (const key of queryKey) {
            if (typeof key === 'string') {
                // Check for exact matches first
                if (queryTypeMap[key]) {
                    return queryTypeMap[key];
                }

                // Check for partial matches
                for (const [queryType, baseType] of Object.entries(queryTypeMap)) {
                    if (key.includes(queryType)) {
                        return baseType;
                    }
                }
            }
        }

        // Check for nested object keys
        for (const key of queryKey) {
            if (typeof key === 'object' && key !== null) {
                const keyStr = JSON.stringify(key);
                for (const [queryType, baseType] of Object.entries(queryTypeMap)) {
                    if (keyStr.includes(queryType)) {
                        return baseType;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check for circular dependencies in query relationships
     */
    private hasCircularDependency(
        entityType: keyof typeof QUERY_RELATIONSHIPS,
        visited: Set<string>
    ): boolean {
        if (visited.has(entityType)) {
            return true;
        }

        visited.add(entityType);
        const relationships = QUERY_RELATIONSHIPS[entityType];

        if (relationships) {
            // Check dependent queries for circular dependencies
            for (const dependentType of relationships.dependent) {
                if (this.hasCircularDependency(dependentType as keyof typeof QUERY_RELATIONSHIPS, new Set(visited))) {
                    return true;
                }
            }
        }

        visited.delete(entityType);
        return false;
    }

    /**
     * Prefetch related queries for better UX
     */
    prefetchRelated(
        queryKey: QueryKey,
        prefetchOptions: {
            staleTime?: number;
            gcTime?: number;
        } = {}
    ): Promise<void> {
        const baseType = this.getBaseQueryType(queryKey);

        if (!baseType || !QUERY_RELATIONSHIPS[baseType]) {
            return Promise.resolve();
        }

        const relationships = QUERY_RELATIONSHIPS[baseType];
        const promises: Promise<void>[] = [];

        // Prefetch related queries
        relationships.related.forEach(relatedType => {
            promises.push(
                this.queryClient.prefetchQuery({
                    queryKey: [relatedType],
                    queryFn: () => Promise.resolve(),
                    staleTime: prefetchOptions.staleTime || 5 * 60 * 1000, // 5 minutes
                    gcTime: prefetchOptions.gcTime || 10 * 60 * 1000, // 10 minutes
                })
            );
        });

        return Promise.all(promises).then(() => { });
    }

    /**
     * Clear cache for specific entity type
     */
    clearEntityCache(entityType: keyof typeof QUERY_RELATIONSHIPS): void {
        const relationships = QUERY_RELATIONSHIPS[entityType];

        if (relationships) {
            // Clear related queries
            relationships.related.forEach(relatedType => {
                this.queryClient.removeQueries({ queryKey: [relatedType] });
            });

            // Clear dependent queries
            relationships.dependent.forEach(dependentType => {
                this.queryClient.removeQueries({ queryKey: [dependentType] });
            });
        }

        // Clear the entity type itself
        this.queryClient.removeQueries({ queryKey: [entityType] });
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        totalQueries: number;
        activeQueries: number;
        staleQueries: number;
        cacheSize: number;
    } {
        const cache = this.queryClient.getQueryCache();
        const queries = cache.getAll();

        return {
            totalQueries: queries.length,
            activeQueries: queries.filter(q => q.state.status === 'pending').length,
            staleQueries: queries.filter(q => q.isStale()).length,
            cacheSize: JSON.stringify(queries).length
        };
    }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create optimized query client instance
 */
export function createOptimizedQueryClient(queryClient: QueryClient): OptimizedQueryClient {
    return new OptimizedQueryClient(queryClient);
}

/**
 * Smart invalidation for deal updates
 */
export function invalidateDealQueries(
    queryClient: QueryClient,
    dealId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('deals', dealId, options);
}

/**
 * Smart invalidation for company updates
 */
export function invalidateCompanyQueries(
    queryClient: QueryClient,
    companyId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('companies', companyId, options);
}

/**
 * Smart invalidation for person updates
 */
export function invalidatePersonQueries(
    queryClient: QueryClient,
    personId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('people', personId, options);
}

/**
 * Smart invalidation for quote updates
 */
export function invalidateQuoteQueries(
    queryClient: QueryClient,
    quoteId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('quotes', quoteId, options);
}

/**
 * Smart invalidation for order updates
 */
export function invalidateOrderQueries(
    queryClient: QueryClient,
    orderId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('orders', orderId, options);
}

/**
 * Smart invalidation for invoice updates
 */
export function invalidateInvoiceQueries(
    queryClient: QueryClient,
    invoiceId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('invoices', invoiceId, options);
}

/**
 * Smart invalidation for task updates
 */
export function invalidateTaskQueries(
    queryClient: QueryClient,
    taskId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('tasks', taskId, options);
}

/**
 * Smart invalidation for event updates
 */
export function invalidateEventQueries(
    queryClient: QueryClient,
    eventId?: string,
    options: CacheInvalidationOptions = {}
): Promise<void> {
    const optimizedClient = createOptimizedQueryClient(queryClient);
    return optimizedClient.invalidateEntityUpdate('events', eventId, options);
}

// ===== QUERY DEDUPLICATION =====

/**
 * Query deduplication configuration
 */
export const QUERY_DEDUPLICATION_CONFIG = {
    // Default deduplication time
    defaultDeduplicationTime: 1000, // 1 second

    // Entity-specific deduplication times
    entityDeduplicationTimes: {
        deals: 2000, // 2 seconds
        companies: 1500, // 1.5 seconds
        people: 1500, // 1.5 seconds
        quotes: 2000, // 2 seconds
        orders: 2000, // 2 seconds
        invoices: 2000, // 2 seconds
        tasks: 1000, // 1 second
        events: 1000, // 1 second
        calendar: 5000, // 5 seconds
        integrations: 10000, // 10 seconds
    }
} as const;

/**
 * Get deduplication time for query type
 */
export function getDeduplicationTime(queryType: string): number {
    return QUERY_DEDUPLICATION_CONFIG.entityDeduplicationTimes[queryType as keyof typeof QUERY_DEDUPLICATION_CONFIG.entityDeduplicationTimes]
        || QUERY_DEDUPLICATION_CONFIG.defaultDeduplicationTime;
}

export default OptimizedQueryClient;
