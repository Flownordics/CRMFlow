/**
 * Memory Management Utilities
 * Provides cleanup patterns and memory leak prevention
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { logger } from './logger';

// ===== CLEANUP TYPES =====

export interface CleanupFunction {
    (): void;
}

export interface MemoryManager {
    addCleanup: (cleanup: CleanupFunction) => void;
    cleanup: () => void;
    isCleanedUp: boolean;
}

// ===== MEMORY MANAGER =====

/**
 * Memory manager for component cleanup
 */
export class ComponentMemoryManager implements MemoryManager {
    private cleanups: CleanupFunction[] = [];
    private _isCleanedUp = false;

    addCleanup(cleanup: CleanupFunction): void {
        if (this._isCleanedUp) {
            logger.warn('MemoryManager: Attempting to add cleanup after cleanup');
            return;
        }
        this.cleanups.push(cleanup);
    }

    cleanup(): void {
        if (this._isCleanedUp) {
            return;
        }

        logger.debug('MemoryManager: Cleaning up', { cleanupCount: this.cleanups.length });

        // Execute all cleanup functions in reverse order
        for (let i = this.cleanups.length - 1; i >= 0; i--) {
            try {
                this.cleanups[i]();
            } catch (error) {
                logger.error('MemoryManager: Cleanup function failed', error);
            }
        }

        this.cleanups = [];
        this._isCleanedUp = true;
    }

    get isCleanedUp(): boolean {
        return this._isCleanedUp;
    }
}

// ===== REACT HOOKS =====

/**
 * Hook for managing component cleanup
 */
export function useMemoryManager(): MemoryManager {
    const managerRef = useRef<ComponentMemoryManager | null>(null);

    if (!managerRef.current) {
        managerRef.current = new ComponentMemoryManager();
    }

    useEffect(() => {
        return () => {
            managerRef.current?.cleanup();
        };
    }, []);

    return managerRef.current;
}

/**
 * Hook for managing event listeners with cleanup
 */
export function useEventListener<T extends keyof WindowEventMap>(
    eventName: T,
    handler: (event: WindowEventMap[T]) => void,
    element: Window | Document | HTMLElement = window,
    options?: AddEventListenerOptions
): void {
    const memoryManager = useMemoryManager();
    const handlerRef = useRef(handler);

    // Update handler ref when handler changes
    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        const eventListener = (event: Event) => {
            handlerRef.current(event as WindowEventMap[T]);
        };

        element.addEventListener(eventName, eventListener, options);

        memoryManager.addCleanup(() => {
            element.removeEventListener(eventName, eventListener, options);
        });
    }, [eventName, element, options, memoryManager]);
}

/**
 * Hook for managing intervals with cleanup
 */
export function useInterval(
    callback: () => void,
    delay: number | null
): void {
    const memoryManager = useMemoryManager();
    const savedCallback = useRef(callback);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval
    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        if (delay === null) return;

        const id = setInterval(() => {
            savedCallback.current();
        }, delay);

        memoryManager.addCleanup(() => {
            clearInterval(id);
        });
    }, [delay, memoryManager]);
}

/**
 * Hook for managing timeouts with cleanup
 */
export function useTimeout(
    callback: () => void,
    delay: number | null
): void {
    const memoryManager = useMemoryManager();
    const savedCallback = useRef(callback);

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the timeout
    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        if (delay === null) return;

        const id = setTimeout(() => {
            savedCallback.current();
        }, delay);

        memoryManager.addCleanup(() => {
            clearTimeout(id);
        });
    }, [delay, memoryManager]);
}

/**
 * Hook for managing AbortController with cleanup
 */
export function useAbortController(): AbortController {
    const memoryManager = useMemoryManager();
    const controllerRef = useRef<AbortController | null>(null);

    if (!controllerRef.current) {
        controllerRef.current = new AbortController();
    }

    useEffect(() => {
        memoryManager.addCleanup(() => {
            controllerRef.current?.abort();
        });
    }, [memoryManager]);

    return controllerRef.current;
}

/**
 * Hook for managing subscriptions with cleanup
 */
export function useSubscription<T>(
    subscribe: (callback: (value: T) => void) => () => void,
    initialValue?: T
): T | undefined {
    const memoryManager = useMemoryManager();
    const [value, setValue] = React.useState<T | undefined>(initialValue);

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        const unsubscribe = subscribe(setValue);

        memoryManager.addCleanup(unsubscribe);
    }, [subscribe, memoryManager]);

    return value;
}

// ===== STORE SUBSCRIPTION MANAGEMENT =====

/**
 * Hook for managing Zustand store subscriptions with cleanup
 */
export function useStoreSubscription<T>(
    store: { subscribe: (callback: (state: T) => void) => () => void },
    selector?: (state: T) => unknown
): T | unknown {
    const memoryManager = useMemoryManager();
    const [value, setValue] = React.useState<T | unknown>(undefined);

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        const unsubscribe = store.subscribe((state) => {
            const selectedValue = selector ? selector(state) : state;
            setValue(selectedValue);
        });

        memoryManager.addCleanup(unsubscribe);
    }, [store, selector, memoryManager]);

    return value;
}

// ===== REACT QUERY CACHE MANAGEMENT =====

/**
 * Hook for managing React Query cache cleanup
 */
export function useQueryCacheCleanup(
    queryClient: { removeQueries: (options: { queryKey: string[] }) => void },
    queryKeys: string[][]
): void {
    const memoryManager = useMemoryManager();

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        memoryManager.addCleanup(() => {
            queryKeys.forEach(queryKey => {
                queryClient.removeQueries({ queryKey });
            });
        });
    }, [queryClient, queryKeys, memoryManager]);
}

// ===== PERFORMANCE MONITORING =====

/**
 * Hook for monitoring memory usage
 */
export function useMemoryMonitor(componentName: string): void {
    const memoryManager = useMemoryManager();

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        const startTime = performance.now();
        const startMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;

        memoryManager.addCleanup(() => {
            const endTime = performance.now();
            const endMemory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0;

            logger.debug('MemoryMonitor: Component cleanup', {
                component: componentName,
                duration: endTime - startTime,
                memoryDelta: endMemory - startMemory,
                memoryUsed: endMemory
            });
        });
    }, [componentName, memoryManager]);
}

// ===== LEAK DETECTION =====

/**
 * Hook for detecting potential memory leaks
 */
export function useLeakDetection(componentName: string): void {
    const memoryManager = useMemoryManager();
    const mountTime = useRef(Date.now());

    useEffect(() => {
        if (memoryManager.isCleanedUp) return;

        const checkForLeaks = () => {
            const now = Date.now();
            const mountDuration = now - mountTime.current;

            // Warn if component has been mounted for more than 5 minutes
            if (mountDuration > 5 * 60 * 1000) {
                logger.warn('LeakDetection: Component mounted for extended period', {
                    component: componentName,
                    duration: mountDuration
                });
            }
        };

        const interval = setInterval(checkForLeaks, 60000); // Check every minute

        memoryManager.addCleanup(() => {
            clearInterval(interval);
        });
    }, [componentName, memoryManager]);
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create a cleanup function that can be called multiple times safely
 */
export function createSafeCleanup(cleanup: CleanupFunction): CleanupFunction {
    let isCleanedUp = false;

    return () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        cleanup();
    };
}

/**
 * Debounce cleanup function to prevent rapid cleanup calls
 */
export function debounceCleanup(
    cleanup: CleanupFunction,
    delay: number = 100
): CleanupFunction {
    let timeoutId: NodeJS.Timeout | null = null;

    return () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            cleanup();
        }, delay);
    };
}

/**
 * Throttle cleanup function to limit cleanup frequency
 */
export function throttleCleanup(
    cleanup: CleanupFunction,
    delay: number = 100
): CleanupFunction {
    let lastCall = 0;

    return () => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            cleanup();
        }
    };
}

// ===== GLOBAL CLEANUP =====

/**
 * Global cleanup manager for application-level cleanup
 */
class GlobalCleanupManager {
    private cleanups: CleanupFunction[] = [];
    private _isCleanedUp = false;

    addCleanup(cleanup: CleanupFunction): void {
        if (this._isCleanedUp) {
            logger.warn('GlobalCleanupManager: Attempting to add cleanup after cleanup');
            return;
        }
        this.cleanups.push(cleanup);
    }

    cleanup(): void {
        if (this._isCleanedUp) return;

        logger.debug('GlobalCleanupManager: Cleaning up', { cleanupCount: this.cleanups.length });

        for (let i = this.cleanups.length - 1; i >= 0; i--) {
            try {
                this.cleanups[i]();
            } catch (error) {
                logger.error('GlobalCleanupManager: Cleanup function failed', error);
            }
        }

        this.cleanups = [];
        this._isCleanedUp = true;
    }

    get isCleanedUp(): boolean {
        return this._isCleanedUp;
    }

    // Reset method for testing or re-initialization
    reset(): void {
        this.cleanups = [];
        this._isCleanedUp = false;
    }
}

export const globalCleanupManager = new GlobalCleanupManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        globalCleanupManager.cleanup();
    });
}

export default {
    useMemoryManager,
    useEventListener,
    useInterval,
    useTimeout,
    useAbortController,
    useSubscription,
    useStoreSubscription,
    useQueryCacheCleanup,
    useMemoryMonitor,
    useLeakDetection,
    createSafeCleanup,
    debounceCleanup,
    throttleCleanup,
    globalCleanupManager
};
