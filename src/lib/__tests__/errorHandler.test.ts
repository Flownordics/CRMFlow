/**
 * Unit tests for error handling system
 */

import { describe, it, expect, vi } from 'vitest';
import {
    ErrorHandler,
    APIError,
    ValidationError,
    AuthenticationError,
    NetworkError,
    BusinessLogicError,
    handleError,
    createAPIError,
    createValidationError,
    createAuthenticationError,
    createNetworkError,
    createBusinessLogicError,
    getUserFriendlyMessage,
    isRetryableError,
    getRetryDelay,
    ERROR_MESSAGES
} from '../errorHandler';

describe('ErrorHandler', () => {
    const errorHandler = ErrorHandler.getInstance();

    describe('Error Types', () => {
        it('should create APIError with correct properties', () => {
            const error = new APIError('Test error', 404, 'NOT_FOUND');

            expect(error.message).toBe('Test error');
            expect(error.status).toBe(404);
            expect(error.code).toBe('NOT_FOUND');
            expect(error.name).toBe('APIError');
        });

        it('should create ValidationError with correct properties', () => {
            const error = new ValidationError('Invalid input', 'email', 'test@invalid');

            expect(error.message).toBe('Invalid input');
            expect(error.field).toBe('email');
            expect(error.value).toBe('test@invalid');
            expect(error.name).toBe('ValidationError');
        });

        it('should create AuthenticationError with correct properties', () => {
            const error = new AuthenticationError('Invalid credentials');

            expect(error.message).toBe('Invalid credentials');
            expect(error.name).toBe('AuthenticationError');
        });

        it('should create NetworkError with correct properties', () => {
            const error = new NetworkError('Connection failed');

            expect(error.message).toBe('Connection failed');
            expect(error.name).toBe('NetworkError');
        });

        it('should create BusinessLogicError with correct properties', () => {
            const error = new BusinessLogicError('Business rule violation', { userId: '123' });

            expect(error.message).toBe('Business rule violation');
            expect(error.context).toEqual({ userId: '123' });
            expect(error.name).toBe('BusinessLogicError');
        });
    });

    describe('Error Processing', () => {
        it('should handle Axios errors correctly', () => {
            const axiosError = {
                isAxiosError: true,
                response: {
                    status: 404,
                    data: { message: 'Not found' }
                },
                code: 'ERR_BAD_REQUEST'
            };

            const processedError = errorHandler.handleError(axiosError, 'test');

            expect(processedError).toBeInstanceOf(APIError);
            expect(processedError.message).toBe(ERROR_MESSAGES.API_NOT_FOUND);
        });

        it('should handle Supabase errors correctly', () => {
            const supabaseError = {
                code: 'PGRST301',
                message: 'Row not found',
                status: 404
            };

            const processedError = errorHandler.handleError(supabaseError, 'test');

            expect(processedError).toBeInstanceOf(APIError);
            expect(processedError.message).toBe('Row not found');
        });

        it('should handle Zod validation errors correctly', () => {
            const zodError = {
                issues: [{
                    path: ['email'],
                    message: 'Invalid email',
                    received: 'invalid-email'
                }]
            };

            const processedError = errorHandler.handleError(zodError, 'test');

            expect(processedError).toBeInstanceOf(ValidationError);
            expect(processedError.message).toBe('Invalid email');
        });

        it('should handle generic errors correctly', () => {
            const genericError = new Error('Generic error');
            const processedError = errorHandler.handleError(genericError, 'test');

            expect(processedError).toBeInstanceOf(BusinessLogicError);
            expect(processedError.message).toBe('Generic error');
        });

        it('should handle unknown error types correctly', () => {
            const unknownError = 'String error';
            const processedError = errorHandler.handleError(unknownError, 'test');

            expect(processedError).toBeInstanceOf(BusinessLogicError);
            expect(processedError.message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
        });
    });

    describe('Error Messages', () => {
        it('should return correct API error messages', () => {
            expect(ERROR_MESSAGES.API_CONNECTION_FAILED).toBe('Kunne ikke oprette forbindelse til serveren');
            expect(ERROR_MESSAGES.API_TIMEOUT).toBe('Serveren svarer ikke i tide');
            expect(ERROR_MESSAGES.API_UNAUTHORIZED).toBe('Du har ikke tilladelse til denne handling');
            expect(ERROR_MESSAGES.API_FORBIDDEN).toBe('Adgang nægtet');
            expect(ERROR_MESSAGES.API_NOT_FOUND).toBe('Ressource ikke fundet');
            expect(ERROR_MESSAGES.API_SERVER_ERROR).toBe('Server fejl opstod');
        });

        it('should return correct validation error messages', () => {
            expect(ERROR_MESSAGES.VALIDATION_REQUIRED).toBe('Dette felt er påkrævet');
            expect(ERROR_MESSAGES.VALIDATION_INVALID_EMAIL).toBe('Ugyldig email adresse');
            expect(ERROR_MESSAGES.VALIDATION_INVALID_PHONE).toBe('Ugyldigt telefonnummer');
            expect(ERROR_MESSAGES.VALIDATION_INVALID_URL).toBe('Ugyldig URL');
        });

        it('should return correct authentication error messages', () => {
            expect(ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS).toBe('Ugyldige loginoplysninger');
            expect(ERROR_MESSAGES.AUTH_SESSION_EXPIRED).toBe('Din session er udløbet');
            expect(ERROR_MESSAGES.AUTH_ACCESS_DENIED).toBe('Adgang nægtet');
        });
    });

    describe('Utility Functions', () => {
        it('should create API error correctly', () => {
            const error = createAPIError('Test error', 500, 'INTERNAL_ERROR');

            expect(error).toBeInstanceOf(APIError);
            expect(error.message).toBe('Test error');
            expect(error.status).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
        });

        it('should create validation error correctly', () => {
            const error = createValidationError('Invalid field', 'email', 'test@invalid');

            expect(error).toBeInstanceOf(ValidationError);
            expect(error.message).toBe('Invalid field');
            expect(error.field).toBe('email');
            expect(error.value).toBe('test@invalid');
        });

        it('should create authentication error correctly', () => {
            const error = createAuthenticationError('Invalid credentials');

            expect(error).toBeInstanceOf(AuthenticationError);
            expect(error.message).toBe('Invalid credentials');
        });

        it('should create network error correctly', () => {
            const error = createNetworkError('Connection failed');

            expect(error).toBeInstanceOf(NetworkError);
            expect(error.message).toBe('Connection failed');
        });

        it('should create business logic error correctly', () => {
            const error = createBusinessLogicError('Business rule violation', { userId: '123' });

            expect(error).toBeInstanceOf(BusinessLogicError);
            expect(error.message).toBe('Business rule violation');
            expect(error.context).toEqual({ userId: '123' });
        });
    });

    describe('User-Friendly Messages', () => {
        it('should return user-friendly message for API error', () => {
            const error = new APIError('Test error', 404);
            const message = getUserFriendlyMessage(error);

            expect(message).toBe('Test error');
        });

        it('should return user-friendly message for validation error', () => {
            const error = new ValidationError('Invalid input', 'email');
            const message = getUserFriendlyMessage(error);

            expect(message).toBe('Invalid input');
        });

        it('should return user-friendly message for authentication error', () => {
            const error = new AuthenticationError('Invalid credentials');
            const message = getUserFriendlyMessage(error);

            expect(message).toBe('Invalid credentials');
        });

        it('should return user-friendly message for network error', () => {
            const error = new NetworkError('Connection failed');
            const message = getUserFriendlyMessage(error);

            expect(message).toBe('Connection failed');
        });

        it('should return user-friendly message for business logic error', () => {
            const error = new BusinessLogicError('Business rule violation');
            const message = getUserFriendlyMessage(error);

            expect(message).toBe('Business rule violation');
        });

        it('should return unknown error message for unknown error types', () => {
            const message = getUserFriendlyMessage('String error');

            expect(message).toBe(ERROR_MESSAGES.UNKNOWN_ERROR);
        });
    });

    describe('Retry Logic', () => {
        it('should identify retryable API errors', () => {
            const timeoutError = new APIError('Timeout', 408);
            const rateLimitError = new APIError('Rate limited', 429);
            const serverError = new APIError('Server error', 500);
            const notFoundError = new APIError('Not found', 404);

            expect(isRetryableError(timeoutError)).toBe(true);
            expect(isRetryableError(rateLimitError)).toBe(true);
            expect(isRetryableError(serverError)).toBe(true);
            expect(isRetryableError(notFoundError)).toBe(false);
        });

        it('should identify retryable network errors', () => {
            const networkError = new NetworkError('Connection failed');

            expect(isRetryableError(networkError)).toBe(true);
        });

        it('should not identify non-retryable errors as retryable', () => {
            const validationError = new ValidationError('Invalid input');
            const authError = new AuthenticationError('Invalid credentials');
            const businessError = new BusinessLogicError('Business rule violation');

            expect(isRetryableError(validationError)).toBe(false);
            expect(isRetryableError(authError)).toBe(false);
            expect(isRetryableError(businessError)).toBe(false);
        });

        it('should calculate retry delays correctly', () => {
            expect(getRetryDelay(0)).toBe(1000);
            expect(getRetryDelay(1)).toBe(2000);
            expect(getRetryDelay(2)).toBe(4000);
            expect(getRetryDelay(3)).toBe(8000);
            expect(getRetryDelay(10)).toBe(30000); // Max 30 seconds
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle error with context', () => {
            const error = new Error('Test error');
            const processedError = handleError(error, 'testContext');

            expect(processedError).toBeInstanceOf(BusinessLogicError);
            expect(processedError.message).toBe('Test error');
        });

        it('should handle error without context', () => {
            const error = new Error('Test error');
            const processedError = handleError(error);

            expect(processedError).toBeInstanceOf(BusinessLogicError);
            expect(processedError.message).toBe('Test error');
        });
    });
});
