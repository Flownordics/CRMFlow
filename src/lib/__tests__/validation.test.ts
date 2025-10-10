/**
 * Unit tests for validation system
 */

import { describe, it, expect } from 'vitest';
import {
    validateInput,
    validateCompanyCreate,
    validateCompanyUpdate,
    validatePersonCreate,
    validatePersonUpdate,
    validateDealCreate,
    validateDealUpdate,
    validateQuoteCreate,
    validateQuoteUpdate,
    validateOrderCreate,
    validateOrderUpdate,
    validateInvoiceCreate,
    validateInvoiceUpdate,
    getFieldError,
    hasFieldError,
    sanitizeInput,
    isValidEmail,
    isValidPhone,
    isValidUrl,
    isValidUuid,
    createZodResolver,
    commonValidations
} from '../validation';
import { ValidationError } from '../errorHandler';

describe('Validation System', () => {
    describe('Common Validations', () => {
        it('should validate email correctly', () => {
            expect(commonValidations.email.parse('test@example.com')).toBe('test@example.com');
            expect(() => commonValidations.email.parse('invalid-email')).toThrow();
            expect(() => commonValidations.email.parse('')).toThrow();
        });

        it('should validate phone correctly', () => {
            expect(commonValidations.phone.parse('+45 12345678')).toBe('+45 12345678');
            expect(commonValidations.phone.parse('12345678')).toBe('12345678');
            expect(() => commonValidations.phone.parse('123')).toThrow();
            expect(() => commonValidations.phone.parse('abc')).toThrow();
        });

        it('should validate URL correctly', () => {
            expect(commonValidations.url.parse('https://example.com')).toBe('https://example.com');
            expect(commonValidations.url.parse('http://example.com')).toBe('http://example.com');
            expect(() => commonValidations.url.parse('invalid-url')).toThrow();
            expect(() => commonValidations.url.parse('')).toThrow();
        });

        it('should validate UUID correctly', () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(commonValidations.uuid.parse(validUuid)).toBe(validUuid);
            expect(() => commonValidations.uuid.parse('invalid-uuid')).toThrow();
            expect(() => commonValidations.uuid.parse('')).toThrow();
        });

        it('should validate positive numbers correctly', () => {
            expect(commonValidations.positiveNumber.parse(5)).toBe(5);
            expect(commonValidations.positiveNumber.parse(0.1)).toBe(0.1);
            expect(() => commonValidations.positiveNumber.parse(0)).toThrow();
            expect(() => commonValidations.positiveNumber.parse(-1)).toThrow();
        });

        it('should validate non-negative numbers correctly', () => {
            expect(commonValidations.nonNegativeNumber.parse(0)).toBe(0);
            expect(commonValidations.nonNegativeNumber.parse(5)).toBe(5);
            expect(() => commonValidations.nonNegativeNumber.parse(-1)).toThrow();
        });

        it('should validate percentage correctly', () => {
            expect(commonValidations.percentage.parse(0)).toBe(0);
            expect(commonValidations.percentage.parse(50)).toBe(50);
            expect(commonValidations.percentage.parse(100)).toBe(100);
            expect(() => commonValidations.percentage.parse(-1)).toThrow();
            expect(() => commonValidations.percentage.parse(101)).toThrow();
        });

        it('should validate string length correctly', () => {
            expect(commonValidations.minLength(5).parse('hello')).toBe('hello');
            expect(() => commonValidations.minLength(5).parse('hi')).toThrow();

            expect(commonValidations.maxLength(5).parse('hello')).toBe('hello');
            expect(() => commonValidations.maxLength(5).parse('hello world')).toThrow();
        });
    });

    describe('Company Validation', () => {
        it('should validate company creation data correctly', () => {
            const validData = {
                name: 'Test Company',
                email: 'test@example.com',
                phone: '+45 12345678',
                address: 'Test Address',
                city: 'Copenhagen',
                country: 'Denmark',
                industry: 'Technology',
                website: 'https://example.com',
                vat: '12345678'
            };

            const result = validateCompanyCreate(validData);
            expect(result).toEqual(validData);
        });

        it('should validate company creation with minimal data', () => {
            const minimalData = {
                name: 'Test Company'
            };

            const result = validateCompanyCreate(minimalData);
            expect(result.name).toBe('Test Company');
        });

        it('should reject invalid company creation data', () => {
            const invalidData = {
                name: '', // Empty name should fail
                email: 'invalid-email',
                phone: '123', // Too short
                website: 'invalid-url'
            };

            expect(() => validateCompanyCreate(invalidData)).toThrow(ValidationError);
        });

        it('should validate company update data correctly', () => {
            const validUpdate = {
                name: 'Updated Company',
                email: 'updated@example.com'
            };

            const result = validateCompanyUpdate(validUpdate);
            expect(result).toEqual(validUpdate);
        });

        it('should allow partial company updates', () => {
            const partialUpdate = {
                name: 'Updated Company'
            };

            const result = validateCompanyUpdate(partialUpdate);
            expect(result.name).toBe('Updated Company');
        });
    });

    describe('Person Validation', () => {
        it('should validate person creation data correctly', () => {
            const validData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                phone: '+45 12345678',
                title: 'Manager',
                companyId: '123e4567-e89b-12d3-a456-426614174000'
            };

            const result = validatePersonCreate(validData);
            expect(result).toEqual(validData);
        });

        it('should validate person creation with minimal data', () => {
            const minimalData = {
                firstName: 'John',
                lastName: 'Doe'
            };

            const result = validatePersonCreate(minimalData);
            expect(result.firstName).toBe('John');
            expect(result.lastName).toBe('Doe');
        });

        it('should reject invalid person creation data', () => {
            const invalidData = {
                firstName: '', // Empty first name should fail
                lastName: '', // Empty last name should fail
                email: 'invalid-email'
            };

            expect(() => validatePersonCreate(invalidData)).toThrow(ValidationError);
        });
    });

    describe('Deal Validation', () => {
        it('should validate deal creation data correctly', () => {
            const validData = {
                title: 'Test Deal',
                companyId: '123e4567-e89b-12d3-a456-426614174000',
                stageId: '123e4567-e89b-12d3-a456-426614174000',
                position: 0,
                currency: 'DKK',
                expectedValueMinor: 100000,
                closeDate: '2024-12-31T23:59:59Z',
                probability: 0.5,
                ownerUserId: '123e4567-e89b-12d3-a456-426614174000'
            };

            const result = validateDealCreate(validData);
            expect(result).toEqual(validData);
        });

        it('should validate deal creation with minimal data', () => {
            const minimalData = {
                title: 'Test Deal',
                companyId: '123e4567-e89b-12d3-a456-426614174000',
                stageId: '123e4567-e89b-12d3-a456-426614174000'
            };

            const result = validateDealCreate(minimalData);
            expect(result.title).toBe('Test Deal');
            expect(result.currency).toBe('DKK'); // Default value
            expect(result.expectedValueMinor).toBe(0); // Default value
        });

        it('should reject invalid deal creation data', () => {
            const invalidData = {
                title: '', // Empty title should fail
                companyId: 'invalid-uuid',
                stageId: 'invalid-uuid',
                expectedValueMinor: -100, // Negative value should fail
                probability: 1.5 // Probability > 1 should fail
            };

            expect(() => validateDealCreate(invalidData)).toThrow(ValidationError);
        });
    });

    describe('Quote Validation', () => {
        it('should validate quote creation data correctly', () => {
            const validData = {
                title: 'Test Quote',
                companyId: '123e4567-e89b-12d3-a456-426614174000',
                currency: 'DKK',
                validUntil: '2024-12-31T23:59:59Z',
                notes: 'Test notes',
                lineItems: [{
                    description: 'Test item',
                    quantity: 1,
                    unitPrice: 100,
                    taxRate: 25,
                    discount: 0
                }]
            };

            const result = validateQuoteCreate(validData);
            expect(result).toEqual(validData);
        });

        it('should reject quote without line items', () => {
            const invalidData = {
                title: 'Test Quote',
                companyId: '123e4567-e89b-12d3-a456-426614174000',
                lineItems: [] // Empty line items should fail
            };

            expect(() => validateQuoteCreate(invalidData)).toThrow(ValidationError);
        });

        it('should reject quote with invalid line items', () => {
            const invalidData = {
                title: 'Test Quote',
                companyId: '123e4567-e89b-12d3-a456-426614174000',
                lineItems: [{
                    description: '', // Empty description should fail
                    quantity: 0, // Zero quantity should fail
                    unitPrice: -100, // Negative price should fail
                    taxRate: 150, // Tax rate > 100 should fail
                    discount: 150 // Discount > 100 should fail
                }]
            };

            expect(() => validateQuoteCreate(invalidData)).toThrow(ValidationError);
        });
    });

    describe('Utility Functions', () => {
        it('should get field error correctly', () => {
            const errors = {
                email: ['Invalid email'],
                name: ['Name is required', 'Name too short']
            };

            expect(getFieldError(errors, 'email')).toBe('Invalid email');
            expect(getFieldError(errors, 'name')).toBe('Name is required');
            expect(getFieldError(errors, 'phone')).toBeUndefined();
        });

        it('should check field error correctly', () => {
            const errors = {
                email: ['Invalid email'],
                name: []
            };

            expect(hasFieldError(errors, 'email')).toBe(true);
            expect(hasFieldError(errors, 'name')).toBe(false);
            expect(hasFieldError(errors, 'phone')).toBe(false);
        });

        it('should sanitize input correctly', () => {
            expect(sanitizeInput('  hello world  ')).toBe('hello world');
            expect(sanitizeInput('')).toBe('');
            expect(sanitizeInput(123)).toBe(123);
            expect(sanitizeInput(null)).toBe(null);
            expect(sanitizeInput(undefined)).toBe(undefined);
        });

        it('should sanitize object input correctly', () => {
            const input = {
                name: '  Test Company  ',
                email: '  test@example.com  ',
                phone: '  +45 12345678  '
            };

            const result = sanitizeInput(input);
            expect(result).toEqual({
                name: 'Test Company',
                email: 'test@example.com',
                phone: '+45 12345678'
            });
        });

        it('should sanitize array input correctly', () => {
            const input = ['  item1  ', '  item2  ', '  item3  '];
            const result = sanitizeInput(input);
            expect(result).toEqual(['item1', 'item2', 'item3']);
        });
    });

    describe('Validation Helpers', () => {
        it('should validate email format correctly', () => {
            expect(isValidEmail('test@example.com')).toBe(true);
            expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('')).toBe(false);
            expect(isValidEmail('@example.com')).toBe(false);
        });

        it('should validate phone format correctly', () => {
            expect(isValidPhone('+45 12345678')).toBe(true);
            expect(isValidPhone('12345678')).toBe(true);
            expect(isValidPhone('+1 (555) 123-4567')).toBe(true);
            expect(isValidPhone('123')).toBe(false);
            expect(isValidPhone('abc')).toBe(false);
            expect(isValidPhone('')).toBe(false);
        });

        it('should validate URL format correctly', () => {
            expect(isValidUrl('https://example.com')).toBe(true);
            expect(isValidUrl('http://example.com')).toBe(true);
            expect(isValidUrl('https://subdomain.example.com/path')).toBe(true);
            expect(isValidUrl('invalid-url')).toBe(false);
            expect(isValidUrl('')).toBe(false);
        });

        it('should validate UUID format correctly', () => {
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';
            expect(isValidUuid(validUuid)).toBe(true);
            expect(isValidUuid('invalid-uuid')).toBe(false);
            expect(isValidUuid('')).toBe(false);
        });
    });

    describe('Zod Resolver', () => {
        it('should create resolver for valid data', () => {
            const schema = commonValidations.email;
            const resolver = createZodResolver(schema);

            const result = resolver('test@example.com');
            expect(result.values).toBe('test@example.com');
            expect(result.errors).toEqual({});
        });

        it('should create resolver for invalid data', () => {
            const schema = commonValidations.email;
            const resolver = createZodResolver(schema);

            const result = resolver('invalid-email');
            expect(result.values).toEqual({});
            expect(result.errors).toHaveProperty('email');
        });

        it('should handle multiple field errors', () => {
            const schema = commonValidations.minLength(5);
            const resolver = createZodResolver(schema);

            const result = resolver('hi');
            expect(result.values).toEqual({});
            expect(result.errors).toHaveProperty('email');
        });
    });

    describe('Error Handling', () => {
        it('should throw ValidationError for invalid input', () => {
            expect(() => validateInput(commonValidations.email, 'invalid-email', 'test')).toThrow(ValidationError);
        });

        it('should include field information in ValidationError', () => {
            try {
                validateInput(commonValidations.email, 'invalid-email', 'test');
            } catch (error) {
                expect(error).toBeInstanceOf(ValidationError);
                expect(error.message).toContain('Ugyldig email adresse');
            }
        });
    });
});
