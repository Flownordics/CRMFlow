/**
 * Error Recovery Utilities
 * Centralized error recovery mechanisms to eliminate duplication
 */

import { logger } from './logger';
import { retryWithBackoff, withTimeout } from './sharedUtils';

// ===== ERROR RECOVERY TYPES =====

export interface RecoveryOptions {
    maxRetries?: number;
    baseDelay?: number;
    timeout?: number;
    retryCondition?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
    onFailure?: (error: Error) => void;
}

export interface RecoveryResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    attempts: number;
}

// ===== ERROR RECOVERY CLASS =====

export class ErrorRecovery {
    private static defaultOptions: Required<RecoveryOptions> = {
        maxRetries: 3,
        baseDelay: 1000,
        timeout: 30000,
        retryCondition: () => true,
        onRetry: () => { },
        onFailure: () => { }
    };

    /**
     * Execute operation with error recovery
     */
    static async execute<T>(
        operation: () => Promise<T>,
        options: RecoveryOptions = {}
    ): Promise<RecoveryResult<T>> {
        const config = { ...this.defaultOptions, ...options };
        let attempts = 0;
        let lastError: Error;

        try {
            const result = await withTimeout(
                retryWithBackoff(
                    async () => {
                        attempts++;
                        return await operation();
                    },
                    config.maxRetries,
                    config.baseDelay
                ),
                config.timeout,
                'Operation timed out'
            );

            return {
                success: true,
                data: result,
                attempts
            };
        } catch (error) {
            lastError = error as Error;
            config.onFailure?.(lastError);

            return {
                success: false,
                error: lastError,
                attempts
            };
        }
    }

    /**
     * Execute operation with custom retry logic
     */
    static async executeWithCustomRetry<T>(
        operation: () => Promise<T>,
        options: RecoveryOptions = {}
    ): Promise<RecoveryResult<T>> {
        const config = { ...this.defaultOptions, ...options };
        let attempts = 0;
        let lastError: Error;

        for (let i = 0; i <= config.maxRetries; i++) {
            try {
                attempts++;
                const result = await withTimeout(operation(), config.timeout, 'Operation timed out');

                return {
                    success: true,
                    data: result,
                    attempts
                };
            } catch (error) {
                lastError = error as Error;

                if (i === config.maxRetries || !config.retryCondition(lastError)) {
                    break;
                }

                config.onRetry?.(attempts, lastError);

                const delay = config.baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        config.onFailure?.(lastError!);

        return {
            success: false,
            error: lastError!,
            attempts
        };
    }
}

// ===== CALENDAR SYNC ERROR RECOVERY =====

export class CalendarSyncRecovery {
    /**
     * Recover from calendar sync failures
     */
    static async recoverSyncFailure(
        dealId: string,
        ownerUserId: string,
        operation: 'sync' | 'remove'
    ): Promise<boolean> {
        try {
            logger.info('Attempting calendar sync recovery', { dealId, ownerUserId, operation });

            // Implement fallback mechanisms
            if (operation === 'sync') {
                // Try alternative sync method
                return await this.attemptAlternativeSync(dealId, ownerUserId);
            } else {
                // Try alternative removal method
                return await this.attemptAlternativeRemoval(dealId, ownerUserId);
            }
        } catch (error) {
            logger.error('Calendar sync recovery failed', { error, dealId, ownerUserId, operation });
            return false;
        }
    }

    /**
     * Attempt alternative sync method
     */
    private static async attemptAlternativeSync(dealId: string, ownerUserId: string): Promise<boolean> {
        // Implement alternative sync logic
        // This could include:
        // - Using different calendar API
        // - Queuing for later retry
        // - Using cached data
        logger.debug('Attempting alternative sync method', { dealId, ownerUserId });
        return false; // Placeholder
    }

    /**
     * Attempt alternative removal method
     */
    private static async attemptAlternativeRemoval(dealId: string, ownerUserId: string): Promise<boolean> {
        // Implement alternative removal logic
        logger.debug('Attempting alternative removal method', { dealId, ownerUserId });
        return false; // Placeholder
    }
}

// ===== API ERROR RECOVERY =====

export class ApiErrorRecovery {
    /**
     * Recover from API failures
     */
    static async recoverApiFailure<T>(
        apiCall: () => Promise<T>,
        fallbackData?: T,
        options: RecoveryOptions = {}
    ): Promise<RecoveryResult<T>> {
        const result = await ErrorRecovery.execute(apiCall, {
            ...options,
            retryCondition: (error) => this.isRetryableApiError(error),
            onRetry: (attempt, error) => {
                logger.warn('Retrying API call', { attempt, error: error.message });
            },
            onFailure: (error) => {
                logger.error('API call failed after retries', { error: error.message });
            }
        });

        // If all retries failed and we have fallback data, use it
        if (!result.success && fallbackData !== undefined) {
            logger.info('Using fallback data for failed API call');
            return {
                success: true,
                data: fallbackData,
                attempts: result.attempts
            };
        }

        return result;
    }

    /**
     * Check if API error is retryable
     */
    private static isRetryableApiError(error: Error): boolean {
        const retryableErrors = [
            'Network Error',
            'timeout',
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED'
        ];

        return retryableErrors.some(retryableError =>
            error.message.toLowerCase().includes(retryableError.toLowerCase())
        );
    }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Execute with error recovery
 */
export async function executeWithRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions = {}
): Promise<RecoveryResult<T>> {
    return ErrorRecovery.execute(operation, options);
}

/**
 * Execute API call with recovery
 */
export async function executeApiWithRecovery<T>(
    apiCall: () => Promise<T>,
    fallbackData?: T,
    options: RecoveryOptions = {}
): Promise<RecoveryResult<T>> {
    return ApiErrorRecovery.recoverApiFailure(apiCall, fallbackData, options);
}

/**
 * Execute calendar sync with recovery
 */
export async function executeCalendarSyncWithRecovery(
    dealId: string,
    ownerUserId: string,
    operation: 'sync' | 'remove'
): Promise<boolean> {
    return CalendarSyncRecovery.recoverSyncFailure(dealId, ownerUserId, operation);
}

export default {
    ErrorRecovery,
    CalendarSyncRecovery,
    ApiErrorRecovery,
    executeWithRecovery,
    executeApiWithRecovery,
    executeCalendarSyncWithRecovery
};
