/**
 * Code Splitting Utilities
 * Advanced code splitting strategies and utilities
 */

import { ComponentType, LazyExoticComponent } from 'react';
import { logger } from './logger';

// ===== CODE SPLITTING TYPES =====

export interface CodeSplittingOptions {
    fallback?: ComponentType<any>;
    errorBoundary?: ComponentType<any>;
    preload?: boolean;
    preloadDelay?: number;
    retryCount?: number;
    retryDelay?: number;
}

export interface ChunkInfo {
    name: string;
    size: number;
    loaded: boolean;
    loadTime?: number;
    error?: Error;
}

// ===== CODE SPLITTING MANAGER =====

export class CodeSplittingManager {
    private loadedChunks = new Map<string, ChunkInfo>();
    private preloadQueue = new Set<string>();

    /**
     * Create lazy component with enhanced error handling
     */
    createLazyComponent<T extends ComponentType<any>>(
        importFn: () => Promise<{ default: T }>,
        options: CodeSplittingOptions = {}
    ): LazyExoticComponent<T> {
        const chunkName = this.extractChunkName(importFn);

        return new Proxy(
            this.createLazyComponentInternal(importFn, chunkName),
            {
                get(target, prop) {
                    if (prop === 'preload' && options.preload) {
                        return () => this.preloadComponent(importFn, options.preloadDelay);
                    }
                    return target[prop as keyof typeof target];
                }
            }
        ) as LazyExoticComponent<T> & { preload?: () => Promise<void> };
    }

    /**
     * Internal lazy component creation
     */
    private createLazyComponentInternal<T extends ComponentType<any>>(
        importFn: () => Promise<{ default: T }>,
        chunkName: string
    ): LazyExoticComponent<T> {
        return new Proxy(
            {
                $$typeof: Symbol.for('react.lazy'),
                _payload: null,
                _init: null
            } as any,
            {
                get(target, prop) {
                    if (prop === '$$typeof') return Symbol.for('react.lazy');
                    if (prop === '_payload') return importFn;
                    if (prop === '_init') return (payload: any) => payload;
                    return target[prop as keyof typeof target];
                }
            }
        );
    }

    /**
     * Preload component
     */
    async preloadComponent(
        importFn: () => Promise<any>,
        delay: number = 0
    ): Promise<void> {
        const chunkName = this.extractChunkName(importFn);

        if (this.loadedChunks.has(chunkName)) {
            return;
        }

        if (this.preloadQueue.has(chunkName)) {
            return;
        }

        this.preloadQueue.add(chunkName);

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        try {
            const startTime = performance.now();
            await importFn();
            const loadTime = performance.now() - startTime;

            this.loadedChunks.set(chunkName, {
                name: chunkName,
                size: 0,
                loaded: true,
                loadTime
            });

            logger.debug('Component preloaded', { chunkName, loadTime });
        } catch (error) {
            logger.error('Component preload failed', { error, chunkName });
            this.loadedChunks.set(chunkName, {
                name: chunkName,
                size: 0,
                loaded: false,
                error: error as Error
            });
        } finally {
            this.preloadQueue.delete(chunkName);
        }
    }

    /**
     * Extract chunk name from import function
     */
    private extractChunkName(importFn: () => Promise<any>): string {
        const fnString = importFn.toString();
        const match = fnString.match(/import\(['"`]([^'"`]+)['"`]\)/);
        return match ? match[1] : 'unknown';
    }

    /**
     * Get chunk information
     */
    getChunkInfo(chunkName: string): ChunkInfo | undefined {
        return this.loadedChunks.get(chunkName);
    }

    /**
     * Get all loaded chunks
     */
    getAllChunks(): ChunkInfo[] {
        return Array.from(this.loadedChunks.values());
    }
}

// ===== GLOBAL INSTANCE =====

export const codeSplittingManager = new CodeSplittingManager();

// ===== CONVENIENCE FUNCTIONS =====

export function createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options?: CodeSplittingOptions
) {
    return codeSplittingManager.createLazyComponent(importFn, options);
}

export function preloadComponent(importFn: () => Promise<any>, delay?: number) {
    return codeSplittingManager.preloadComponent(importFn, delay);
}

export default {
    CodeSplittingManager,
    createLazyComponent,
    preloadComponent,
    codeSplittingManager
};