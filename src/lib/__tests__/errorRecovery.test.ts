/**
 * Error Recovery Tests
 */

import { ErrorRecovery, ApiErrorRecovery, CalendarSyncRecovery } from '../errorRecovery';
import { mockLogger } from '../testUtils';

// Mock logger
jest.mock('../logger', () => ({
    logger: mockLogger,
}));

describe('ErrorRecovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('execute', () => {
        it('should execute operation successfully', async () => {
            const operation = jest.fn().mockResolvedValue('success');

            const result = await ErrorRecovery.execute(operation);

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.attempts).toBe(1);
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure and eventually succeed', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValue('success');

            const result = await ErrorRecovery.execute(operation, {
                maxRetries: 3,
                baseDelay: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.attempts).toBe(3);
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should fail after max retries', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));

            const result = await ErrorRecovery.execute(operation, {
                maxRetries: 2,
                baseDelay: 10
            });

            expect(result.success).toBe(false);
            expect(result.error).toBeInstanceOf(Error);
            expect(result.error?.message).toBe('Persistent error');
            expect(result.attempts).toBe(3); // 1 initial + 2 retries
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should respect retry condition', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Non-retryable error'));

            const result = await ErrorRecovery.execute(operation, {
                maxRetries: 3,
                retryCondition: (error) => error.message.includes('Network')
            });

            expect(result.success).toBe(false);
            expect(result.attempts).toBe(1);
            expect(operation).toHaveBeenCalledTimes(1);
        });

        it('should call callbacks', async () => {
            const operation = jest.fn().mockRejectedValue(new Error('Test error'));
            const onRetry = jest.fn();
            const onFailure = jest.fn();

            await ErrorRecovery.execute(operation, {
                maxRetries: 1,
                baseDelay: 10,
                onRetry,
                onFailure
            });

            expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
            expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('executeWithCustomRetry', () => {
        it('should execute with custom retry logic', async () => {
            const operation = jest.fn()
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValue('success');

            const result = await ErrorRecovery.executeWithCustomRetry(operation, {
                maxRetries: 2,
                baseDelay: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.attempts).toBe(3);
            expect(operation).toHaveBeenCalledTimes(3);
        });
    });
});

describe('ApiErrorRecovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('recoverApiFailure', () => {
        it('should recover from retryable API errors', async () => {
            const apiCall = jest.fn()
                .mockRejectedValueOnce(new Error('Network Error'))
                .mockResolvedValue('success');

            const result = await ApiErrorRecovery.recoverApiFailure(apiCall, undefined, {
                maxRetries: 1,
                baseDelay: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(apiCall).toHaveBeenCalledTimes(2);
        });

        it('should use fallback data when all retries fail', async () => {
            const apiCall = jest.fn().mockRejectedValue(new Error('Persistent Network Error'));
            const fallbackData = 'fallback';

            const result = await ApiErrorRecovery.recoverApiFailure(apiCall, fallbackData, {
                maxRetries: 1,
                baseDelay: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe(fallbackData);
            expect(apiCall).toHaveBeenCalledTimes(2);
        });

        it('should not retry non-retryable errors', async () => {
            const apiCall = jest.fn().mockRejectedValue(new Error('Validation Error'));

            const result = await ApiErrorRecovery.recoverApiFailure(apiCall, undefined, {
                maxRetries: 3,
                baseDelay: 10
            });

            expect(result.success).toBe(false);
            expect(apiCall).toHaveBeenCalledTimes(1);
        });
    });
});

describe('CalendarSyncRecovery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('recoverSyncFailure', () => {
        it('should attempt recovery for sync operations', async () => {
            const result = await CalendarSyncRecovery.recoverSyncFailure('deal_1', 'user_1', 'sync');

            expect(result).toBe(false); // Placeholder implementation returns false
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Attempting calendar sync recovery',
                expect.objectContaining({
                    dealId: 'deal_1',
                    ownerUserId: 'user_1',
                    operation: 'sync'
                })
            );
        });

        it('should attempt recovery for remove operations', async () => {
            const result = await CalendarSyncRecovery.recoverSyncFailure('deal_1', 'user_1', 'remove');

            expect(result).toBe(false); // Placeholder implementation returns false
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Attempting calendar sync recovery',
                expect.objectContaining({
                    dealId: 'deal_1',
                    ownerUserId: 'user_1',
                    operation: 'remove'
                })
            );
        });

        it('should handle recovery errors gracefully', async () => {
            // Mock console.error to avoid test output
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await CalendarSyncRecovery.recoverSyncFailure('invalid', 'invalid', 'sync');

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });
});
