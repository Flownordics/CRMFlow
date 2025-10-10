/**
 * API Consistency Management
 * Provides standardized response formats, pagination, and rate limiting
 */

import { logger } from './logger';
import { handleError } from './errorHandler';

// ===== API RESPONSE TYPES =====

export interface StandardResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId: string;
        version: string;
    };
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
    retryAfter?: number;
}

export interface APIError {
    code: string;
    message: string;
    details?: any;
    field?: string;
    timestamp: string;
}

// ===== PAGINATION MANAGER =====

/**
 * Pagination manager for consistent pagination across all endpoints
 */
export class PaginationManager {
    private static readonly DEFAULT_LIMIT = 20;
    private static readonly MAX_LIMIT = 100;
    private static readonly MIN_LIMIT = 1;

    /**
     * Validate and normalize pagination parameters
     */
    static validatePagination(params: {
        page?: number;
        limit?: number;
    }): { page: number; limit: number } {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(
            Math.max(this.MIN_LIMIT, params.limit || this.DEFAULT_LIMIT),
            this.MAX_LIMIT
        );

        return { page, limit };
    }

    /**
     * Calculate pagination info
     */
    static calculatePagination(
        page: number,
        limit: number,
        total: number
    ): PaginationInfo {
        const totalPages = Math.ceil(total / limit);

        return {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };
    }

    /**
     * Create paginated response
     */
    static createPaginatedResponse<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
        baseResponse: Partial<StandardResponse<T[]>> = {}
    ): StandardResponse<T[]> {
        const pagination = this.calculatePagination(page, limit, total);

        return {
            success: true,
            data,
            pagination,
            ...baseResponse
        };
    }

    /**
     * Extract pagination from query parameters
     */
    static extractFromQuery(query: URLSearchParams): { page: number; limit: number } {
        const page = parseInt(query.get('page') || '1', 10);
        const limit = parseInt(query.get('limit') || this.DEFAULT_LIMIT.toString(), 10);

        return this.validatePagination({ page, limit });
    }
}

// ===== RATE LIMITING =====

/**
 * Rate limiting manager
 */
export class RateLimitManager {
    private static readonly DEFAULT_LIMIT = 1000; // requests per hour
    private static readonly WINDOW_SIZE = 60 * 60 * 1000; // 1 hour in milliseconds
    private static readonly BURST_LIMIT = 100; // requests per minute

    private requestCounts: Map<string, RequestCount> = new Map();
    private burstCounts: Map<string, BurstCount> = new Map();

    /**
     * Check if request is within rate limits
     */
    checkRateLimit(
        identifier: string,
        customLimit?: number
    ): { allowed: boolean; info: RateLimitInfo } {
        const now = Date.now();
        const limit = customLimit || RateLimitManager.DEFAULT_LIMIT;

        // Clean up old entries
        this.cleanupOldEntries(now);

        // Check hourly limit
        const hourlyCount = this.getRequestCount(identifier, now);
        const hourlyAllowed = hourlyCount < limit;

        // Check burst limit
        const burstCount = this.getBurstCount(identifier, now);
        const burstAllowed = burstCount < RateLimitManager.BURST_LIMIT;

        const allowed = hourlyAllowed && burstAllowed;

        if (allowed) {
            this.incrementRequestCount(identifier, now);
            this.incrementBurstCount(identifier, now);
        }

        const resetTime = now + RateLimitManager.WINDOW_SIZE;
        const remaining = Math.max(0, limit - hourlyCount);

        return {
            allowed,
            info: {
                limit,
                remaining,
                reset: resetTime,
                retryAfter: allowed ? undefined : Math.ceil((resetTime - now) / 1000)
            }
        };
    }

    /**
     * Get current rate limit info
     */
    getRateLimitInfo(identifier: string, customLimit?: number): RateLimitInfo {
        const now = Date.now();
        const limit = customLimit || RateLimitManager.DEFAULT_LIMIT;
        const count = this.getRequestCount(identifier, now);
        const reset = now + RateLimitManager.WINDOW_SIZE;

        return {
            limit,
            remaining: Math.max(0, limit - count),
            reset
        };
    }

    private getRequestCount(identifier: string, now: number): number {
        const entry = this.requestCounts.get(identifier);
        if (!entry) return 0;

        // Check if entry is within window
        if (now - entry.windowStart > RateLimitManager.WINDOW_SIZE) {
            this.requestCounts.delete(identifier);
            return 0;
        }

        return entry.count;
    }

    private getBurstCount(identifier: string, now: number): number {
        const entry = this.burstCounts.get(identifier);
        if (!entry) return 0;

        // Check if entry is within burst window (1 minute)
        if (now - entry.windowStart > 60 * 1000) {
            this.burstCounts.delete(identifier);
            return 0;
        }

        return entry.count;
    }

    private incrementRequestCount(identifier: string, now: number): void {
        const entry = this.requestCounts.get(identifier);
        if (entry) {
            entry.count++;
        } else {
            this.requestCounts.set(identifier, {
                count: 1,
                windowStart: now
            });
        }
    }

    private incrementBurstCount(identifier: string, now: number): void {
        const entry = this.burstCounts.get(identifier);
        if (entry) {
            entry.count++;
        } else {
            this.burstCounts.set(identifier, {
                count: 1,
                windowStart: now
            });
        }
    }

    private cleanupOldEntries(now: number): void {
        // Clean up hourly counts
        for (const [key, entry] of this.requestCounts.entries()) {
            if (now - entry.windowStart > RateLimitManager.WINDOW_SIZE) {
                this.requestCounts.delete(key);
            }
        }

        // Clean up burst counts
        for (const [key, entry] of this.burstCounts.entries()) {
            if (now - entry.windowStart > 60 * 1000) {
                this.burstCounts.delete(key);
            }
        }
    }
}

interface RequestCount {
    count: number;
    windowStart: number;
}

interface BurstCount {
    count: number;
    windowStart: number;
}

// ===== RESPONSE STANDARDIZATION =====

/**
 * Response standardizer
 */
export class ResponseStandardizer {
    private static readonly API_VERSION = '1.0.0';

    /**
     * Create success response
     */
    static createSuccessResponse<T>(
        data: T,
        pagination?: PaginationInfo,
        requestId?: string
    ): StandardResponse<T> {
        return {
            success: true,
            data,
            pagination,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: requestId || this.generateRequestId(),
                version: this.API_VERSION
            }
        };
    }

    /**
     * Create error response
     */
    static createErrorResponse(
        error: APIError,
        requestId?: string
    ): StandardResponse {
        return {
            success: false,
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            },
            meta: {
                timestamp: error.timestamp,
                requestId: requestId || this.generateRequestId(),
                version: this.API_VERSION
            }
        };
    }

    /**
     * Create validation error response
     */
    static createValidationErrorResponse(
        field: string,
        message: string,
        details?: any,
        requestId?: string
    ): StandardResponse {
        return this.createErrorResponse({
            code: 'VALIDATION_ERROR',
            message,
            details,
            field,
            timestamp: new Date().toISOString()
        }, requestId);
    }

    /**
     * Create not found error response
     */
    static createNotFoundErrorResponse(
        resource: string,
        id: string,
        requestId?: string
    ): StandardResponse {
        return this.createErrorResponse({
            code: 'NOT_FOUND',
            message: `${resource} with id ${id} not found`,
            details: { resource, id },
            timestamp: new Date().toISOString()
        }, requestId);
    }

    /**
     * Create rate limit error response
     */
    static createRateLimitErrorResponse(
        retryAfter: number,
        requestId?: string
    ): StandardResponse {
        return this.createErrorResponse({
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded',
            details: { retryAfter },
            timestamp: new Date().toISOString()
        }, requestId);
    }

    /**
     * Generate request ID
     */
    private static generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// ===== API MIDDLEWARE TYPES =====

interface ExpressRequest {
    headers: Record<string, string | string[] | undefined>;
    [key: string]: any;
}

interface ExpressResponse {
    status(code: number): ExpressResponse;
    set(field: string, value: string): ExpressResponse;
    json(data: any): ExpressResponse;
    [key: string]: any;
}

type NextFunction = () => void;

// ===== API MIDDLEWARE =====

/**
 * API middleware for consistency
 */
export class APIMiddleware {
    private static rateLimitManager = new RateLimitManager();

    /**
     * Rate limiting middleware
     */
    static rateLimit(identifier: string, customLimit?: number) {
        return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            const { allowed, info } = this.rateLimitManager.checkRateLimit(identifier, customLimit);

            if (!allowed) {
                const response = ResponseStandardizer.createRateLimitErrorResponse(
                    info.retryAfter || 0,
                    Array.isArray(req.headers['x-request-id'])
                        ? req.headers['x-request-id'][0]
                        : req.headers['x-request-id']
                );

                res.status(429)
                    .set('X-RateLimit-Limit', info.limit.toString())
                    .set('X-RateLimit-Remaining', info.remaining.toString())
                    .set('X-RateLimit-Reset', info.reset.toString())
                    .set('Retry-After', (info.retryAfter || 0).toString())
                    .json(response);
                return;
            }

            // Add rate limit headers
            res.set('X-RateLimit-Limit', info.limit.toString());
            res.set('X-RateLimit-Remaining', info.remaining.toString());
            res.set('X-RateLimit-Reset', info.reset.toString());

            next();
        };
    }

    /**
     * Request ID middleware
     */
    static requestId() {
        return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
            const requestId = Array.isArray(req.headers['x-request-id'])
                ? req.headers['x-request-id'][0]
                : req.headers['x-request-id'] || ResponseStandardizer['generateRequestId']();
            req.requestId = requestId;
            res.set('X-Request-ID', requestId);
            next();
        };
    }

    /**
     * Error handling middleware
     */
    static errorHandler() {
        return (error: Error, req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
            logger.error('API Error', { error, requestId: req.requestId });

            const apiError = handleError(error, 'API');
            const response = ResponseStandardizer.createErrorResponse({
                code: apiError.name,
                message: apiError.message,
                details: apiError instanceof Error ? { stack: apiError.stack } : undefined,
                timestamp: new Date().toISOString()
            }, req.requestId);

            res.status(500).json(response);
        };
    }

    /**
     * Pagination middleware
     */
    static pagination() {
        return (req: ExpressRequest, _res: ExpressResponse, next: NextFunction) => {
            const { page, limit } = PaginationManager.extractFromQuery(req.query);
            req.pagination = { page, limit };
            next();
        };
    }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
    data: T,
    pagination?: PaginationInfo,
    requestId?: string
): StandardResponse<T> {
    return ResponseStandardizer.createSuccessResponse(data, pagination, requestId);
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
    error: APIError,
    requestId?: string
): StandardResponse {
    return ResponseStandardizer.createErrorResponse(error, requestId);
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    requestId?: string
): StandardResponse<T[]> {
    const pagination = PaginationManager.calculatePagination(page, limit, total);
    return ResponseStandardizer.createSuccessResponse(data, pagination, requestId);
}

/**
 * Validate pagination parameters
 */
export function validatePagination(params: {
    page?: number;
    limit?: number;
}): { page: number; limit: number } {
    return PaginationManager.validatePagination(params);
}

/**
 * Check rate limit
 */
export function checkRateLimit(
    identifier: string,
    customLimit?: number
): { allowed: boolean; info: RateLimitInfo } {
    return rateLimitManager.checkRateLimit(identifier, customLimit);
}

// ===== GLOBAL INSTANCES =====

export const rateLimitManager = new RateLimitManager();

export default {
    PaginationManager,
    RateLimitManager,
    ResponseStandardizer,
    APIMiddleware,
    createSuccessResponse,
    createErrorResponse,
    createPaginatedResponse,
    validatePagination,
    checkRateLimit,
    rateLimitManager
};
