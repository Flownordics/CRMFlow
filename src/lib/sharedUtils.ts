/**
 * Shared Utilities
 * Common functions used across multiple services to eliminate code duplication
 */

import { logger } from './logger';

// ===== API RESPONSE NORMALIZATION =====

/**
 * Normalize API response data
 */
export function normalizeApiResponse<T = unknown>(response: unknown): T | null {
    if (!response) {
        return null;
    }

    // Handle direct data
    if (typeof response === 'object' && 'data' in response) {
        return (response as { data: T }).data;
    }

    return response as T;
}

/**
 * Handle API error responses
 */
export function handleApiError(error: unknown, context: string): never {
    logger.error(`API error in ${context}`, { error });

    if (error instanceof Error) {
        throw error;
    }

    throw new Error(`API error in ${context}: ${String(error)}`);
}

/**
 * Validate API response
 */
export function validateApiResponse<T>(response: unknown, schema?: (data: unknown) => T): T {
    if (!response) {
        throw new Error('Empty API response');
    }

    if (schema) {
        try {
            return schema(response);
        } catch (error) {
            logger.error('Schema validation failed', { error, response });
            throw new Error('Invalid API response format');
        }
    }

    return response as T;
}

// ===== MOCK DATA HANDLING =====

/**
 * Create mock API response
 */
export function createMockResponse<T>(data: T, status: number = 200): {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
} {
    return {
        data,
        status,
        statusText: 'OK',
        headers: {
            'content-type': 'application/json'
        }
    };
}

/**
 * Handle mock API calls
 */
export async function handleMockApiCall<T>(
    mockFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    useMocks: boolean
): Promise<T> {
    if (useMocks) {
        try {
            return await mockFn();
        } catch (error) {
            logger.warn('Mock API call failed, falling back to real API', { error });
            return await fallbackFn();
        }
    }

    return await fallbackFn();
}

// ===== ERROR HANDLING PATTERNS =====

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt === maxRetries) {
                throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, { error });

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    );

    return Promise.race([promise, timeoutPromise]);
}

// ===== DATA VALIDATION =====

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        logger.warn('JSON parse failed, using fallback', { error, jsonString });
        return fallback;
    }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(obj: unknown, fallback: string = '{}'): string {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        logger.warn('JSON stringify failed, using fallback', { error, obj });
        return fallback;
    }
}

// ===== ARRAY UTILITIES =====

/**
 * Remove duplicates from array
 */
export function removeDuplicates<T>(array: T[], keyFn?: (item: T) => unknown): T[] {
    if (!keyFn) {
        return [...new Set(array)];
    }

    const seen = new Set();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * Group array by key
 */
export function groupBy<T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
): Record<K, T[]> {
    return array.reduce((groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {} as Record<K, T[]>);
}

// ===== STRING UTILITIES =====

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 */
export function kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ===== DATE UTILITIES =====

/**
 * Format date for display
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
    const d = new Date(date);

    switch (format) {
        case 'short':
            return d.toLocaleDateString();
        case 'long':
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        case 'iso':
            return d.toISOString();
        default:
            return d.toLocaleDateString();
    }
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
    const d = new Date(date);
    const today = new Date();

    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
}

// ===== OBJECT UTILITIES =====

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as T;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as T;
    }

    const cloned = {} as T;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }

    return cloned;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
                targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue);
            } else {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

export default {
    normalizeApiResponse,
    handleApiError,
    validateApiResponse,
    createMockResponse,
    handleMockApiCall,
    retryWithBackoff,
    withTimeout,
    safeJsonParse,
    safeJsonStringify,
    removeDuplicates,
    groupBy,
    capitalize,
    camelToKebab,
    kebabToCamel,
    formatDate,
    isToday,
    deepClone,
    deepMerge
};
