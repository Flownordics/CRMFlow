/**
 * Shared Utils Tests
 */

import {
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
} from '../sharedUtils';

describe('normalizeApiResponse', () => {
    it('should return data from API response object', () => {
        const response = { data: 'test data' };
        const result = normalizeApiResponse(response);
        expect(result).toBe('test data');
    });

    it('should return direct data when not wrapped', () => {
        const data = 'direct data';
        const result = normalizeApiResponse(data);
        expect(result).toBe('direct data');
    });

    it('should return null for null/undefined input', () => {
        expect(normalizeApiResponse(null)).toBeNull();
        expect(normalizeApiResponse(undefined)).toBeNull();
    });
});

describe('handleApiError', () => {
    it('should throw Error instances as-is', () => {
        const error = new Error('Test error');
        expect(() => handleApiError(error, 'test')).toThrow('Test error');
    });

    it('should wrap non-Error values', () => {
        expect(() => handleApiError('string error', 'test')).toThrow('API error in test: string error');
        expect(() => handleApiError(123, 'test')).toThrow('API error in test: 123');
    });
});

describe('validateApiResponse', () => {
    it('should return data when no schema provided', () => {
        const data = 'test data';
        const result = validateApiResponse(data);
        expect(result).toBe('test data');
    });

    it('should validate with schema', () => {
        const schema = (data: unknown) => {
            if (typeof data === 'string') return data.toUpperCase();
            throw new Error('Invalid data');
        };

        const result = validateApiResponse('test', schema);
        expect(result).toBe('TEST');
    });

    it('should throw on schema validation failure', () => {
        const schema = (data: unknown) => {
            if (typeof data === 'number') return data;
            throw new Error('Invalid data');
        };

        expect(() => validateApiResponse('test', schema)).toThrow('Invalid API response format');
    });

    it('should throw on null/undefined response', () => {
        expect(() => validateApiResponse(null)).toThrow('Empty API response');
        expect(() => validateApiResponse(undefined)).toThrow('Empty API response');
    });
});

describe('createMockResponse', () => {
    it('should create mock response with default values', () => {
        const data = 'test data';
        const response = createMockResponse(data);

        expect(response.data).toBe(data);
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.headers['content-type']).toBe('application/json');
    });

    it('should create mock response with custom status', () => {
        const data = 'test data';
        const response = createMockResponse(data, 404);

        expect(response.status).toBe(404);
    });
});

describe('handleMockApiCall', () => {
    it('should call mock function when useMocks is true', async () => {
        const mockFn = jest.fn().mockResolvedValue('mock data');
        const fallbackFn = jest.fn().mockResolvedValue('fallback data');

        const result = await handleMockApiCall(mockFn, fallbackFn, true);

        expect(result).toBe('mock data');
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(fallbackFn).not.toHaveBeenCalled();
    });

    it('should call fallback function when useMocks is false', async () => {
        const mockFn = jest.fn().mockResolvedValue('mock data');
        const fallbackFn = jest.fn().mockResolvedValue('fallback data');

        const result = await handleMockApiCall(mockFn, fallbackFn, false);

        expect(result).toBe('fallback data');
        expect(fallbackFn).toHaveBeenCalledTimes(1);
        expect(mockFn).not.toHaveBeenCalled();
    });

    it('should fallback to real API when mock fails', async () => {
        const mockFn = jest.fn().mockRejectedValue(new Error('Mock failed'));
        const fallbackFn = jest.fn().mockResolvedValue('fallback data');

        const result = await handleMockApiCall(mockFn, fallbackFn, true);

        expect(result).toBe('fallback data');
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(fallbackFn).toHaveBeenCalledTimes(1);
    });
});

describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        const result = await retryWithBackoff(fn, 3, 10);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error('Error 1'))
            .mockRejectedValueOnce(new Error('Error 2'))
            .mockResolvedValue('success');

        const result = await retryWithBackoff(fn, 3, 10);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));

        await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow('Persistent error');
        expect(fn).toHaveBeenCalledTimes(3);
    });
});

describe('withTimeout', () => {
    it('should return result when promise resolves in time', async () => {
        const promise = Promise.resolve('success');

        const result = await withTimeout(promise, 1000);

        expect(result).toBe('success');
    });

    it('should throw timeout error when promise takes too long', async () => {
        const promise = new Promise(resolve => setTimeout(() => resolve('success'), 2000));

        await expect(withTimeout(promise, 100, 'Custom timeout')).rejects.toThrow('Custom timeout');
    });
});

describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
        const result = safeJsonParse('{"key": "value"}', {});
        expect(result).toEqual({ key: 'value' });
    });

    it('should return fallback on invalid JSON', () => {
        const fallback = { default: true };
        const result = safeJsonParse('invalid json', fallback);
        expect(result).toBe(fallback);
    });
});

describe('safeJsonStringify', () => {
    it('should stringify valid object', () => {
        const result = safeJsonStringify({ key: 'value' });
        expect(result).toBe('{"key":"value"}');
    });

    it('should return fallback on circular reference', () => {
        const circular: any = {};
        circular.self = circular;

        const result = safeJsonStringify(circular, '{}');
        expect(result).toBe('{}');
    });
});

describe('removeDuplicates', () => {
    it('should remove duplicate primitives', () => {
        const result = removeDuplicates([1, 2, 2, 3, 3, 3]);
        expect(result).toEqual([1, 2, 3]);
    });

    it('should remove duplicates by key function', () => {
        const items = [
            { id: 1, name: 'A' },
            { id: 2, name: 'B' },
            { id: 1, name: 'C' },
            { id: 3, name: 'D' }
        ];

        const result = removeDuplicates(items, item => item.id);
        expect(result).toHaveLength(3);
        expect(result.map(item => item.id)).toEqual([1, 2, 3]);
    });
});

describe('groupBy', () => {
    it('should group array by key function', () => {
        const items = [
            { category: 'A', value: 1 },
            { category: 'B', value: 2 },
            { category: 'A', value: 3 },
            { category: 'C', value: 4 }
        ];

        const result = groupBy(items, item => item.category);

        expect(result.A).toHaveLength(2);
        expect(result.B).toHaveLength(1);
        expect(result.C).toHaveLength(1);
    });
});

describe('capitalize', () => {
    it('should capitalize first letter and lowercase rest', () => {
        expect(capitalize('hello')).toBe('Hello');
        expect(capitalize('HELLO')).toBe('Hello');
        expect(capitalize('hELLO')).toBe('Hello');
    });
});

describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
        expect(camelToKebab('camelCase')).toBe('camel-case');
        expect(camelToKebab('myVariableName')).toBe('my-variable-name');
        expect(camelToKebab('already-kebab')).toBe('already-kebab');
    });
});

describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
        expect(kebabToCamel('kebab-case')).toBe('kebabCase');
        expect(kebabToCamel('my-variable-name')).toBe('myVariableName');
        expect(kebabToCamel('alreadyCamel')).toBe('alreadyCamel');
    });
});

describe('formatDate', () => {
    const testDate = new Date('2023-12-25T10:30:00Z');

    it('should format date in short format', () => {
        const result = formatDate(testDate, 'short');
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should format date in long format', () => {
        const result = formatDate(testDate, 'long');
        expect(result).toContain('December');
        expect(result).toContain('2023');
    });

    it('should format date in ISO format', () => {
        const result = formatDate(testDate, 'iso');
        expect(result).toBe('2023-12-25T10:30:00.000Z');
    });
});

describe('isToday', () => {
    it('should return true for today', () => {
        const today = new Date();
        expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        expect(isToday(yesterday)).toBe(false);
    });
});

describe('deepClone', () => {
    it('should clone primitive values', () => {
        expect(deepClone(42)).toBe(42);
        expect(deepClone('hello')).toBe('hello');
        expect(deepClone(true)).toBe(true);
        expect(deepClone(null)).toBe(null);
    });

    it('should clone objects deeply', () => {
        const original = { a: 1, b: { c: 2 } };
        const cloned = deepClone(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
    });

    it('should clone arrays deeply', () => {
        const original = [1, [2, 3], { a: 4 }];
        const cloned = deepClone(original);

        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned[1]).not.toBe(original[1]);
        expect(cloned[2]).not.toBe(original[2]);
    });
});

describe('deepMerge', () => {
    it('should merge objects deeply', () => {
        const target = { a: 1, b: { c: 2, d: 3 } };
        const source = { b: { c: 4 }, e: 5 };
        const result = deepMerge(target, source);

        expect(result).toEqual({
            a: 1,
            b: { c: 4, d: 3 },
            e: 5
        });
    });

    it('should not mutate original objects', () => {
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { c: 4 } };
        const result = deepMerge(target, source);

        expect(target).toEqual({ a: 1, b: { c: 2 } });
        expect(source).toEqual({ b: { c: 4 } });
    });
});
