/**
 * Centralized Error Handling System
 * Provides consistent error handling across the application
 */

import { logger } from './logger';

// ===== ERROR TYPES =====

export class APIError extends Error {
    constructor(
        message: string,
        public status?: number,
        public code?: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'APIError';
    }
}

export class ValidationError extends Error {
    constructor(
        message: string,
        public field?: string,
        public value?: unknown,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class AuthenticationError extends Error {
    constructor(
        message: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class NetworkError extends Error {
    constructor(
        message: string,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class BusinessLogicError extends Error {
    constructor(
        message: string,
        public context?: Record<string, unknown>,
        public originalError?: unknown
    ) {
        super(message);
        this.name = 'BusinessLogicError';
    }
}

// ===== ERROR TYPE GUARDS =====

export function isAPIError(error: unknown): error is APIError {
    return error instanceof APIError;
}

export function isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
    return error instanceof AuthenticationError;
}

export function isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
}

export function isBusinessLogicError(error: unknown): error is BusinessLogicError {
    return error instanceof BusinessLogicError;
}

// ===== ERROR MESSAGES =====

export const ERROR_MESSAGES = {
    // API Errors
    API_CONNECTION_FAILED: 'Kunne ikke oprette forbindelse til serveren',
    API_TIMEOUT: 'Serveren svarer ikke i tide',
    API_UNAUTHORIZED: 'Du har ikke tilladelse til denne handling',
    API_FORBIDDEN: 'Adgang nægtet',
    API_NOT_FOUND: 'Ressource ikke fundet',
    API_SERVER_ERROR: 'Server fejl opstod',
    API_RATE_LIMITED: 'For mange anmodninger, prøv igen senere',

    // Validation Errors
    VALIDATION_REQUIRED: 'Dette felt er påkrævet',
    VALIDATION_INVALID_EMAIL: 'Ugyldig email adresse',
    VALIDATION_INVALID_PHONE: 'Ugyldigt telefonnummer',
    VALIDATION_INVALID_URL: 'Ugyldig URL',
    VALIDATION_MIN_LENGTH: 'Skal være mindst {min} tegn',
    VALIDATION_MAX_LENGTH: 'Må ikke være mere end {max} tegn',
    VALIDATION_INVALID_FORMAT: 'Ugyldigt format',

    // Authentication Errors
    AUTH_INVALID_CREDENTIALS: 'Ugyldige loginoplysninger',
    AUTH_SESSION_EXPIRED: 'Din session er udløbet',
    AUTH_ACCESS_DENIED: 'Adgang nægtet',
    AUTH_ACCOUNT_LOCKED: 'Din konto er låst',

    // Network Errors
    NETWORK_OFFLINE: 'Ingen internetforbindelse',
    NETWORK_TIMEOUT: 'Forbindelse timeout',
    NETWORK_CONNECTION_FAILED: 'Kunne ikke oprette forbindelse',

    // Business Logic Errors
    BUSINESS_DEAL_NOT_FOUND: 'Deal ikke fundet',
    BUSINESS_COMPANY_NOT_FOUND: 'Virksomhed ikke fundet',
    BUSINESS_PERSON_NOT_FOUND: 'Person ikke fundet',
    BUSINESS_QUOTE_NOT_FOUND: 'Tilbud ikke fundet',
    BUSINESS_ORDER_NOT_FOUND: 'Ordre ikke fundet',
    BUSINESS_INVOICE_NOT_FOUND: 'Faktura ikke fundet',
    BUSINESS_DUPLICATE_ENTRY: 'Dette indlæg findes allerede',
    BUSINESS_INVALID_STATE: 'Ugyldig tilstand for denne handling',

    // Generic Errors
    UNKNOWN_ERROR: 'En ukendt fejl opstod',
    OPERATION_FAILED: 'Handling mislykkedes',
    DATA_CORRUPTION: 'Data er beskadiget',
} as const;

// ===== ERROR HANDLER CLASS =====

export class ErrorHandler {
    private static instance: ErrorHandler;

    private constructor() { }

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Handle and process errors consistently
     */
    handleError(error: unknown, context?: string): Error {
        const processedError = this.processError(error, context);
        this.logError(processedError, context);
        return processedError;
    }

    /**
     * Process raw error into typed error
     */
    private processError(error: unknown, context?: string): Error {
        // If it's already a typed error, return as is
        if (error instanceof Error && error.name !== 'Error') {
            return error;
        }

        // Handle different error types
        if (this.isAxiosError(error)) {
            return this.handleAxiosError(error, context);
        }

        if (this.isSupabaseError(error)) {
            return this.handleSupabaseError(error, context);
        }

        if (this.isZodError(error)) {
            return this.handleZodError(error, context);
        }

        if (error instanceof Error) {
            return new BusinessLogicError(error.message, { context }, error);
        }

        // Unknown error type
        return new BusinessLogicError(
            ERROR_MESSAGES.UNKNOWN_ERROR,
            { context, originalError: error },
            error
        );
    }

    /**
     * Handle Axios errors
     */
    private handleAxiosError(error: any, context?: string): APIError {
        const status = error.response?.status;
        const code = error.code;
        const message = this.getAPIErrorMessage(status, code);

        return new APIError(
            message,
            status,
            code,
            error
        );
    }

    /**
     * Handle Supabase errors
     */
    private handleSupabaseError(error: any, context?: string): APIError {
        const status = error.status;
        const code = error.code;
        const message = error.message || this.getAPIErrorMessage(status, code);

        return new APIError(
            message,
            status,
            code,
            error
        );
    }

    /**
     * Handle Zod validation errors
     */
    private handleZodError(error: any, context?: string): ValidationError {
        const firstIssue = error.issues?.[0];
        const field = firstIssue?.path?.join('.');
        const message = firstIssue?.message || ERROR_MESSAGES.VALIDATION_INVALID_FORMAT;

        return new ValidationError(
            message,
            field,
            firstIssue?.received,
            error
        );
    }

    /**
     * Get appropriate API error message
     */
    private getAPIErrorMessage(status?: number, code?: string): string {
        if (!status) return ERROR_MESSAGES.API_CONNECTION_FAILED;

        switch (status) {
            case 400:
                return ERROR_MESSAGES.VALIDATION_INVALID_FORMAT;
            case 401:
                return ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS;
            case 403:
                return ERROR_MESSAGES.API_FORBIDDEN;
            case 404:
                return ERROR_MESSAGES.API_NOT_FOUND;
            case 408:
                return ERROR_MESSAGES.API_TIMEOUT;
            case 429:
                return ERROR_MESSAGES.API_RATE_LIMITED;
            case 500:
            case 502:
            case 503:
            case 504:
                return ERROR_MESSAGES.API_SERVER_ERROR;
            default:
                return ERROR_MESSAGES.API_CONNECTION_FAILED;
        }
    }

    /**
     * Log error with appropriate level
     */
    private logError(error: Error, context?: string): void {
        const logContext = context ? `[${context}]` : '';

        // Check for "not found" errors - these are expected in some cases (orphaned references)
        // and should be logged at a lower level to reduce console noise
        const isNotFoundError = error.message.toLowerCase().includes('not found') ||
            error.message.toLowerCase().includes('does not exist');

        // Handle "not found" errors first - regardless of error type
        if (isNotFoundError) {
            // Log "not found" errors as debug messages since they're often expected (orphaned references)
            // This reduces console noise for expected scenarios like deleted deals/projects
            logger.debug(`${logContext} Not Found:`, error);
            return;
        }

        // Handle other errors by type
        if (error instanceof APIError) {
            if (error.status && error.status >= 500) {
                logger.error(`${logContext} API Error:`, error);
            } else {
                logger.warn(`${logContext} API Error:`, error);
            }
        } else if (error instanceof ValidationError) {
            logger.warn(`${logContext} Validation Error:`, error);
        } else if (error instanceof AuthenticationError) {
            logger.warn(`${logContext} Auth Error:`, error);
        } else if (error instanceof NetworkError) {
            logger.error(`${logContext} Network Error:`, error);
        } else {
            logger.error(`${logContext} Error:`, error);
        }
    }

    /**
     * Type guards
     */
    private isAxiosError(error: unknown): error is any {
        return error && typeof error === 'object' && 'isAxiosError' in error;
    }

    private isSupabaseError(error: unknown): error is any {
        return error && typeof error === 'object' && 'code' in error && 'message' in error;
    }

    private isZodError(error: unknown): error is any {
        return error && typeof error === 'object' && 'issues' in error;
    }
}

// ===== CONVENIENCE FUNCTIONS =====

export const errorHandler = ErrorHandler.getInstance();

/**
 * Handle error with context
 */
export function handleError(error: unknown, context?: string): Error {
    return errorHandler.handleError(error, context);
}

/**
 * Create API error
 */
export function createAPIError(message: string, status?: number, code?: string): APIError {
    return new APIError(message, status, code);
}

/**
 * Create validation error
 */
export function createValidationError(message: string, field?: string, value?: unknown): ValidationError {
    return new ValidationError(message, field, value);
}

/**
 * Create authentication error
 */
export function createAuthenticationError(message: string): AuthenticationError {
    return new AuthenticationError(message);
}

/**
 * Create network error
 */
export function createNetworkError(message: string): NetworkError {
    return new NetworkError(message);
}

/**
 * Create business logic error
 */
export function createBusinessLogicError(message: string, context?: Record<string, unknown>): BusinessLogicError {
    return new BusinessLogicError(message, context);
}

// ===== ERROR BOUNDARY UTILITIES =====

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyMessage(error: unknown): string {
    if (isAPIError(error)) {
        return error.message;
    }

    if (isValidationError(error)) {
        return error.message;
    }

    if (isAuthenticationError(error)) {
        return error.message;
    }

    if (isNetworkError(error)) {
        return error.message;
    }

    if (isBusinessLogicError(error)) {
        return error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (isAPIError(error)) {
        return error.status === 408 || error.status === 429 || error.status >= 500;
    }

    if (isNetworkError(error)) {
        return true;
    }

    return false;
}

/**
 * Get retry delay in milliseconds
 */
export function getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
}

export default errorHandler;
