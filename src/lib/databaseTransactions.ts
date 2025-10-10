/**
 * Database Transaction Management
 * Provides transaction support, rollback mechanisms, and concurrent update handling
 */

import { logger } from './logger';
import { handleError, createBusinessLogicError } from './errorHandler';

// ===== TRANSACTION TYPES =====

export interface TransactionOptions {
    timeout?: number;
    retries?: number;
    isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
    onRollback?: (error: Error) => void;
    onCommit?: () => void;
}

export interface TransactionOperation<T = unknown> {
    id: string;
    operation: () => Promise<T>;
    rollback?: () => Promise<void>;
    dependencies?: string[];
    retryable?: boolean;
}

export interface TransactionResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error;
    operations: Array<{
        id: string;
        success: boolean;
        error?: Error;
    }>;
    rollbackOperations: string[];
}

// ===== TRANSACTION MANAGER =====

/**
 * Database transaction manager with rollback support
 */
export class TransactionManager {
    private activeTransactions: Map<string, TransactionContext> = new Map();
    private operationQueue: Map<string, TransactionOperation[]> = new Map();
    private retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2
    };

    /**
     * Execute a transaction with rollback support
     */
    async executeTransaction<T>(
        transactionId: string,
        operations: TransactionOperation[],
        options: TransactionOptions = {}
    ): Promise<TransactionResult<T>> {
        const context = this.createTransactionContext(transactionId, operations, options);
        this.activeTransactions.set(transactionId, context);

        try {
            logger.debug('Starting transaction', { transactionId, operationCount: operations.length });

            this.validateOperations(operations);
            const results = await this.executeOperations(transactionId, operations, context);

            return await this.handleTransactionSuccess(transactionId, context, results, options.onCommit);

        } catch (error) {
            return await this.handleTransactionFailure(transactionId, context, error, options.onRollback);
        } finally {
            this.activeTransactions.delete(transactionId);
        }
    }

    /**
     * Create transaction context
     */
    private createTransactionContext(
        transactionId: string,
        operations: TransactionOperation[],
        options: TransactionOptions
    ): TransactionContext {
        const {
            timeout = 30000,
            isolationLevel = 'READ_COMMITTED'
        } = options;

        return {
            id: transactionId,
            startTime: Date.now(),
            timeout,
            isolationLevel,
            operations: [],
            completedOperations: [],
            rollbackOperations: [],
            status: 'PENDING'
        };
    }

    /**
     * Handle successful transaction
     */
    private async handleTransactionSuccess<T>(
        transactionId: string,
        context: TransactionContext,
        results: Array<{ operationId: string; success: boolean; data?: unknown; error?: Error }>,
        onCommit?: () => void
    ): Promise<TransactionResult<T>> {
        const failedOperations = results.filter(r => !r.success);
        if (failedOperations.length > 0) {
            throw new Error(`Transaction failed: ${failedOperations.length} operations failed`);
        }

        context.status = 'COMMITTED';
        onCommit?.();

        logger.info('Transaction committed successfully', {
            transactionId,
            duration: Date.now() - context.startTime,
            operationCount: results.length
        });

        return {
            success: true,
            data: results[results.length - 1]?.data as T,
            operations: results.map(r => ({
                id: r.operationId,
                success: r.success,
                error: r.error
            })),
            rollbackOperations: []
        };
    }

    /**
     * Handle failed transaction
     */
    private async handleTransactionFailure<T>(
        transactionId: string,
        context: TransactionContext,
        error: unknown,
        onRollback?: (error: Error) => void
    ): Promise<TransactionResult<T>> {
        logger.error('Transaction failed, rolling back', { transactionId, error });

        await this.rollbackTransaction(transactionId, context);
        context.status = 'ROLLED_BACK';
        onRollback?.(error as Error);

        return {
            success: false,
            error: error as Error,
            operations: context.completedOperations.map(op => ({
                id: op.id,
                success: false,
                error: op.error
            })),
            rollbackOperations: context.rollbackOperations
        };
    }

    /**
     * Execute operations in sequence
     */
    private async executeOperations(
        transactionId: string,
        operations: TransactionOperation[],
        context: TransactionContext
    ): Promise<Array<{ operationId: string; success: boolean; data?: unknown; error?: Error }>> {
        const results: Array<{ operationId: string; success: boolean; data?: unknown; error?: Error }> = [];

        for (const operation of operations) {
            try {
                // Check timeout
                if (Date.now() - context.startTime > context.timeout) {
                    throw new Error('Transaction timeout');
                }

                // Check dependencies
                if (operation.dependencies) {
                    const dependencyResults = results.filter(r =>
                        operation.dependencies!.includes(r.operationId)
                    );
                    const failedDependencies = dependencyResults.filter(r => !r.success);

                    if (failedDependencies.length > 0) {
                        throw new Error(`Dependency failed: ${failedDependencies.map(d => d.operationId).join(', ')}`);
                    }
                }

                // Execute operation
                const data = await operation.operation();

                // Store rollback operation
                if (operation.rollback) {
                    context.rollbackOperations.push(operation.id);
                }

                // Mark as completed
                context.completedOperations.push({
                    id: operation.id,
                    success: true,
                    data,
                    error: undefined
                });

                results.push({
                    operationId: operation.id,
                    success: true,
                    data
                });

                logger.debug('Operation completed', { transactionId, operationId: operation.id });

            } catch (error) {
                const errorMessage = `Operation ${operation.id} failed: ${(error as Error).message}`;
                logger.error('Operation failed', { transactionId, operationId: operation.id, error });

                context.completedOperations.push({
                    id: operation.id,
                    success: false,
                    data: undefined,
                    error: error as Error
                });

                results.push({
                    operationId: operation.id,
                    success: false,
                    error: error as Error
                });

                // If operation is not retryable, fail the transaction
                if (!operation.retryable) {
                    throw new Error(errorMessage);
                }
            }
        }

        return results;
    }

    /**
     * Rollback completed operations
     */
    private async rollbackTransaction(
        transactionId: string,
        context: TransactionContext
    ): Promise<void> {
        logger.debug('Rolling back transaction', {
            transactionId,
            rollbackCount: context.rollbackOperations.length
        });

        // Rollback in reverse order
        for (let i = context.rollbackOperations.length - 1; i >= 0; i--) {
            const operationId = context.rollbackOperations[i];
            const operation = context.operations.find(op => op.id === operationId);

            if (operation?.rollback) {
                try {
                    await operation.rollback();
                    logger.debug('Rollback operation completed', { transactionId, operationId });
                } catch (error) {
                    logger.error('Rollback operation failed', { transactionId, operationId, error });
                }
            }
        }
    }

    /**
     * Validate operations before execution
     */
    private validateOperations(operations: TransactionOperation[]): void {
        if (operations.length === 0) {
            throw new Error('Transaction must have at least one operation');
        }

        // Check for duplicate operation IDs
        const ids = operations.map(op => op.id);
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            throw new Error(`Duplicate operation IDs: ${duplicateIds.join(', ')}`);
        }

        // Check dependencies
        for (const operation of operations) {
            if (operation.dependencies) {
                for (const depId of operation.dependencies) {
                    if (!ids.includes(depId)) {
                        throw new Error(`Dependency ${depId} not found for operation ${operation.id}`);
                    }
                }
            }
        }
    }

    /**
     * Get active transaction status
     */
    getTransactionStatus(transactionId: string): TransactionContext | null {
        return this.activeTransactions.get(transactionId) || null;
    }

    /**
     * Cancel a transaction
     */
    async cancelTransaction(transactionId: string): Promise<boolean> {
        const context = this.activeTransactions.get(transactionId);
        if (!context) {
            return false;
        }

        if (context.status === 'PENDING') {
            context.status = 'CANCELLED';
            await this.rollbackTransaction(transactionId, context);
            this.activeTransactions.delete(transactionId);
            return true;
        }

        return false;
    }

    /**
     * Get all active transactions
     */
    getActiveTransactions(): TransactionContext[] {
        return Array.from(this.activeTransactions.values());
    }
}

// ===== TRANSACTION CONTEXT =====

interface TransactionContext {
    id: string;
    startTime: number;
    timeout: number;
    isolationLevel: string;
    operations: TransactionOperation[];
    completedOperations: Array<{
        id: string;
        success: boolean;
        data?: unknown;
        error?: Error;
    }>;
    rollbackOperations: string[];
    status: 'PENDING' | 'COMMITTED' | 'ROLLED_BACK' | 'CANCELLED';
}

// ===== CONCURRENT UPDATE HANDLING =====

/**
 * Optimistic locking manager
 */
export class OptimisticLockManager {
    private locks: Map<string, LockInfo> = new Map();
    private lockTimeout = 30000; // 30 seconds

    /**
     * Acquire optimistic lock
     */
    async acquireLock(
        resourceId: string,
        version: number,
        timeout: number = this.lockTimeout
    ): Promise<boolean> {
        const lockKey = `${resourceId}:${version}`;
        const existingLock = this.locks.get(lockKey);

        if (existingLock && Date.now() - existingLock.timestamp < timeout) {
            return false; // Lock already exists
        }

        this.locks.set(lockKey, {
            resourceId,
            version,
            timestamp: Date.now(),
            timeout
        });

        logger.debug('Lock acquired', { resourceId, version, lockKey });
        return true;
    }

    /**
     * Release optimistic lock
     */
    releaseLock(resourceId: string, version: number): void {
        const lockKey = `${resourceId}:${version}`;
        this.locks.delete(lockKey);
        logger.debug('Lock released', { resourceId, version, lockKey });
    }

    /**
     * Check if resource is locked
     */
    isLocked(resourceId: string, version: number): boolean {
        const lockKey = `${resourceId}:${version}`;
        const lock = this.locks.get(lockKey);

        if (!lock) return false;

        // Check if lock has expired
        if (Date.now() - lock.timestamp > lock.timeout) {
            this.locks.delete(lockKey);
            return false;
        }

        return true;
    }

    /**
     * Cleanup expired locks
     */
    cleanupExpiredLocks(): void {
        const now = Date.now();
        for (const [lockKey, lock] of this.locks.entries()) {
            if (now - lock.timestamp > lock.timeout) {
                this.locks.delete(lockKey);
                logger.debug('Expired lock cleaned up', { lockKey });
            }
        }
    }
}

interface LockInfo {
    resourceId: string;
    version: number;
    timestamp: number;
    timeout: number;
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create a transaction operation
 */
export function createTransactionOperation<T>(
    id: string,
    operation: () => Promise<T>,
    rollback?: () => Promise<void>,
    options: {
        dependencies?: string[];
        retryable?: boolean;
    } = {}
): TransactionOperation<T> {
    return {
        id,
        operation,
        rollback,
        dependencies: options.dependencies,
        retryable: options.retryable ?? true
    };
}

/**
 * Execute a simple transaction
 */
export async function executeSimpleTransaction<T>(
    operation: () => Promise<T>,
    rollback?: () => Promise<void>,
    options: TransactionOptions = {}
): Promise<TransactionResult<T>> {
    const transactionId = `simple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const manager = new TransactionManager();

    const operations = [
        createTransactionOperation('main', operation, rollback)
    ];

    return manager.executeTransaction(transactionId, operations, options);
}

/**
 * Execute a batch transaction
 */
export async function executeBatchTransaction<T>(
    operations: TransactionOperation[],
    options: TransactionOptions = {}
): Promise<TransactionResult<T>> {
    const transactionId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const manager = new TransactionManager();

    return manager.executeTransaction(transactionId, operations, options);
}

// ===== GLOBAL INSTANCES =====

export const transactionManager = new TransactionManager();
export const optimisticLockManager = new OptimisticLockManager();

// Cleanup expired locks every 5 minutes
setInterval(() => {
    optimisticLockManager.cleanupExpiredLocks();
}, 5 * 60 * 1000);

export default {
    TransactionManager,
    OptimisticLockManager,
    createTransactionOperation,
    executeSimpleTransaction,
    executeBatchTransaction,
    transactionManager,
    optimisticLockManager
};
