/**
 * Prefetch Hook
 * React hook for intelligent data prefetching
 */

import { useCallback, useEffect, useRef } from 'react';
import { QueryKey } from '@tanstack/react-query';
import { useOptimizedQueryClient } from '@/lib/queryCache';
import { PrefetchOptions, PrefetchStrategy } from '@/lib/queryCache';

interface UsePrefetchOptions extends PrefetchOptions {
    strategy?: PrefetchStrategy;
    enabled?: boolean;
}

/**
 * Hook for prefetching related data
 */
export function usePrefetch(
    queryKey: QueryKey,
    options: UsePrefetchOptions = {}
) {
    const queryClient = useOptimizedQueryClient();
    const timeoutRef = useRef<NodeJS.Timeout>();
    const isPrefetchingRef = useRef(false);

    const {
        strategy = {
            enabled: true,
            prefetchOnHover: true,
            prefetchOnFocus: true,
            prefetchOnMount: false,
            prefetchDelay: 300
        },
        enabled = true,
        ...prefetchOptions
    } = options;

    // Prefetch on mount
    useEffect(() => {
        if (enabled && strategy.enabled && strategy.prefetchOnMount) {
            queryClient.prefetchOnMount(queryKey, prefetchOptions);
        }
    }, [enabled, strategy.enabled, strategy.prefetchOnMount, queryKey, queryClient, prefetchOptions]);

    // Prefetch on hover with debouncing
    const handleHover = useCallback(() => {
        if (!enabled || !strategy.enabled || !strategy.prefetchOnHover) {
            return;
        }

        if (isPrefetchingRef.current) {
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            isPrefetchingRef.current = true;
            queryClient.prefetchRelatedData(queryKey, prefetchOptions)
                .finally(() => {
                    isPrefetchingRef.current = false;
                });
        }, strategy.prefetchDelay || 300);
    }, [enabled, strategy.enabled, strategy.prefetchOnHover, strategy.prefetchDelay, queryKey, queryClient, prefetchOptions]);

    // Prefetch on focus
    const handleFocus = useCallback(() => {
        if (!enabled || !strategy.enabled || !strategy.prefetchOnFocus) {
            return;
        }

        if (isPrefetchingRef.current) {
            return;
        }

        isPrefetchingRef.current = true;
        queryClient.prefetchRelatedData(queryKey, prefetchOptions)
            .finally(() => {
                isPrefetchingRef.current = false;
            });
    }, [enabled, strategy.enabled, strategy.prefetchOnFocus, queryKey, queryClient, prefetchOptions]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        handleHover,
        handleFocus,
        prefetch: () => queryClient.prefetchRelatedData(queryKey, prefetchOptions),
        isPrefetching: isPrefetchingRef.current
    };
}

/**
 * Hook for prefetching on route change
 */
export function useRoutePrefetch(
    queryKey: QueryKey,
    options: UsePrefetchOptions = {}
) {
    const queryClient = useOptimizedQueryClient();

    const prefetch = useCallback(() => {
        if (options.enabled !== false) {
            queryClient.prefetchRelatedData(queryKey, options);
        }
    }, [queryKey, queryClient, options]);

    return { prefetch };
}

/**
 * Hook for prefetching on user interaction
 */
export function useInteractionPrefetch(
    queryKey: QueryKey,
    options: UsePrefetchOptions = {}
) {
    const queryClient = useOptimizedQueryClient();
    const interactionTimeoutRef = useRef<NodeJS.Timeout>();

    const handleInteraction = useCallback(() => {
        if (options.enabled === false) {
            return;
        }

        if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
        }

        interactionTimeoutRef.current = setTimeout(() => {
            queryClient.prefetchRelatedData(queryKey, options);
        }, options.strategy?.prefetchDelay || 300);
    }, [queryKey, queryClient, options]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
        };
    }, []);

    return { handleInteraction };
}

export default {
    usePrefetch,
    useRoutePrefetch,
    useInteractionPrefetch
};
