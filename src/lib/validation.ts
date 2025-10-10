/**
 * Centralized Input Validation System
 * Provides consistent validation across the application
 */

import { z } from 'zod';
import { handleError, createValidationError } from './errorHandler';

// ===== VALIDATION SCHEMAS =====

// Common validation patterns
export const commonValidations = {
    email: z.string().email('Ugyldig email adresse'),
    phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{8,}$/, 'Ugyldigt telefonnummer'),
    url: z.string().url('Ugyldig URL'),
    uuid: z.string().uuid('Ugyldigt UUID format'),
    positiveNumber: z.number().positive('Skal være et positivt tal'),
    nonNegativeNumber: z.number().min(0, 'Skal være 0 eller større'),
    percentage: z.number().min(0).max(100, 'Skal være mellem 0 og 100'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Skal være 3-bogstavs valuta kode'),
    dateString: z.string().datetime('Ugyldigt dato format'),
    minLength: (min: number) => z.string().min(min, `Skal være mindst ${min} tegn`),
    maxLength: (max: number) => z.string().max(max, `Må ikke være mere end ${max} tegn`),
    required: z.string().min(1, 'Dette felt er påkrævet'),
    optional: z.string().optional(),
    nullable: z.string().nullable(),
};

// Company validation schemas
export const companyValidation = {
    create: z.object({
        name: commonValidations.required,
        email: commonValidations.email.optional().or(z.literal('')),
        invoiceEmail: commonValidations.email.optional().or(z.literal('')),
        phone: commonValidations.phone.optional().or(z.literal('')),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        industry: z.string().optional(),
        website: commonValidations.url.optional().or(z.literal('')),
        vat: z.string().optional(),
    }),
    update: z.object({
        name: commonValidations.required.optional(),
        email: commonValidations.email.optional().or(z.literal('')),
        invoiceEmail: commonValidations.email.optional().or(z.literal('')),
        phone: commonValidations.phone.optional().or(z.literal('')),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        industry: z.string().optional(),
        website: commonValidations.url.optional().or(z.literal('')),
        vat: z.string().optional(),
    }),
};

// Person validation schemas
export const personValidation = {
    create: z.object({
        firstName: commonValidations.required,
        lastName: commonValidations.required,
        email: commonValidations.email.optional().or(z.literal('')),
        phone: commonValidations.phone.optional().or(z.literal('')),
        title: z.string().optional(),
        companyId: commonValidations.uuid.optional(),
    }),
    update: z.object({
        firstName: commonValidations.required.optional(),
        lastName: commonValidations.required.optional(),
        email: commonValidations.email.optional().or(z.literal('')),
        phone: commonValidations.phone.optional().or(z.literal('')),
        title: z.string().optional(),
        companyId: commonValidations.uuid.optional(),
    }),
};

// Deal validation schemas
export const dealValidation = {
    create: z.object({
        title: commonValidations.required,
        companyId: commonValidations.uuid,
        contactId: commonValidations.uuid.optional(),
        stageId: commonValidations.uuid,
        position: z.number().int().min(0).default(0),
        currency: commonValidations.currency.default('DKK'),
        expectedValueMinor: z.number().int().min(0).default(0),
        closeDate: commonValidations.dateString.optional(),
        probability: z.number().min(0).max(1).optional(),
        ownerUserId: commonValidations.uuid.optional(),
    }),
    update: z.object({
        title: commonValidations.required.optional(),
        companyId: commonValidations.uuid.optional(),
        contactId: commonValidations.uuid.optional(),
        stageId: commonValidations.uuid.optional(),
        position: z.number().int().min(0).optional(),
        currency: commonValidations.currency.optional(),
        expectedValueMinor: z.number().int().min(0).optional(),
        closeDate: commonValidations.dateString.optional(),
        probability: z.number().min(0).max(1).optional(),
        ownerUserId: commonValidations.uuid.optional(),
    }),
};

// Quote validation schemas
export const quoteValidation = {
    create: z.object({
        title: commonValidations.required,
        companyId: commonValidations.uuid,
        dealId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.default('DKK'),
        validUntil: commonValidations.dateString.optional(),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).min(1, 'Skal have mindst ét linje element'),
    }),
    update: z.object({
        title: commonValidations.required.optional(),
        companyId: commonValidations.uuid.optional(),
        dealId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.optional(),
        validUntil: commonValidations.dateString.optional(),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).optional(),
    }),
};

// Order validation schemas
export const orderValidation = {
    create: z.object({
        title: commonValidations.required,
        companyId: commonValidations.uuid,
        dealId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.default('DKK'),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).min(1, 'Skal have mindst ét linje element'),
    }),
    update: z.object({
        title: commonValidations.required.optional(),
        companyId: commonValidations.uuid.optional(),
        dealId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.optional(),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).optional(),
    }),
};

// Invoice validation schemas
export const invoiceValidation = {
    create: z.object({
        title: commonValidations.required,
        companyId: commonValidations.uuid,
        orderId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.default('DKK'),
        dueDate: commonValidations.dateString.optional(),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).min(1, 'Skal have mindst ét linje element'),
    }),
    update: z.object({
        title: commonValidations.required.optional(),
        companyId: commonValidations.uuid.optional(),
        orderId: commonValidations.uuid.optional(),
        currency: commonValidations.currency.optional(),
        dueDate: commonValidations.dateString.optional(),
        notes: z.string().optional(),
        lineItems: z.array(z.object({
            description: commonValidations.required,
            quantity: z.number().positive(),
            unitPrice: z.number().min(0),
            taxRate: commonValidations.percentage.default(25),
            discount: z.number().min(0).max(100).default(0),
        })).optional(),
    }),
};

// ===== VALIDATION FUNCTIONS =====

/**
 * Generic validation function
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    context?: string
): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const firstIssue = error.issues[0];
            const field = firstIssue.path.join('.');
            const message = firstIssue.message;

            throw createValidationError(
                message,
                field,
                'received' in firstIssue ? firstIssue.received : undefined
            );
        }

        throw handleError(error, context || 'validateInput');
    }
}

/**
 * Validate company data
 */
export function validateCompanyCreate(data: unknown) {
    return validateInput(companyValidation.create, data, 'validateCompanyCreate');
}

export function validateCompanyUpdate(data: unknown) {
    return validateInput(companyValidation.update, data, 'validateCompanyUpdate');
}

/**
 * Validate person data
 */
export function validatePersonCreate(data: unknown) {
    return validateInput(personValidation.create, data, 'validatePersonCreate');
}

export function validatePersonUpdate(data: unknown) {
    return validateInput(personValidation.update, data, 'validatePersonUpdate');
}

/**
 * Validate deal data
 */
export function validateDealCreate(data: unknown) {
    return validateInput(dealValidation.create, data, 'validateDealCreate');
}

export function validateDealUpdate(data: unknown) {
    return validateInput(dealValidation.update, data, 'validateDealUpdate');
}

/**
 * Validate quote data
 */
export function validateQuoteCreate(data: unknown) {
    return validateInput(quoteValidation.create, data, 'validateQuoteCreate');
}

export function validateQuoteUpdate(data: unknown) {
    return validateInput(quoteValidation.update, data, 'validateQuoteUpdate');
}

/**
 * Validate order data
 */
export function validateOrderCreate(data: unknown) {
    return validateInput(orderValidation.create, data, 'validateOrderCreate');
}

export function validateOrderUpdate(data: unknown) {
    return validateInput(orderValidation.update, data, 'validateOrderUpdate');
}

/**
 * Validate invoice data
 */
export function validateInvoiceCreate(data: unknown) {
    return validateInput(invoiceValidation.create, data, 'validateInvoiceCreate');
}

export function validateInvoiceUpdate(data: unknown) {
    return validateInput(invoiceValidation.update, data, 'validateInvoiceUpdate');
}

// ===== FORM VALIDATION HELPERS =====

/**
 * Get field error message
 */
export function getFieldError(
    errors: Record<string, string[]>,
    field: string
): string | undefined {
    return errors[field]?.[0];
}

/**
 * Check if field has error
 */
export function hasFieldError(
    errors: Record<string, string[]>,
    field: string
): boolean {
    return Boolean(errors[field]?.length);
}

/**
 * Sanitize input data
 */
export function sanitizeInput(data: unknown): unknown {
    if (typeof data === 'string') {
        return data.trim();
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeInput);
    }

    if (data && typeof data === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeInput(value);
        }
        return sanitized;
    }

    return data;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate UUID format
 */
export function isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// ===== REACT HOOK FORM INTEGRATION =====

/**
 * Create Zod resolver for react-hook-form
 */
export function createZodResolver<T>(schema: z.ZodSchema<T>) {
    return (data: unknown) => {
        try {
            const validated = schema.parse(data);
            return { values: validated, errors: {} };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors: Record<string, string[]> = {};

                error.issues.forEach((issue) => {
                    const field = issue.path.join('.');
                    if (!errors[field]) {
                        errors[field] = [];
                    }
                    errors[field].push(issue.message);
                });

                return { values: {}, errors };
            }

            throw error;
        }
    };
}

export default {
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
};
