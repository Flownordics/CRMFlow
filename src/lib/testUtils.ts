/**
 * Test Utilities
 * Common testing utilities and helpers
 */

import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement } from 'react';
import { logger } from './logger';

// ===== MOCK PROVIDERS =====

/**
 * Create a test query client
 */
export function createTestQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    });
}

/**
 * Custom render function with providers
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    const queryClient = createTestQueryClient();

    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <QueryClientProvider client= { queryClient } >
            { children }
            </QueryClientProvider>
    );
    }

    return {
        ...render(ui, { wrapper: Wrapper, ...options }),
        queryClient,
    };
}

// ===== MOCK DATA GENERATORS =====

/**
 * Generate mock deal data
 */
export function generateMockDeal(overrides: Partial<any> = {}) {
    return {
        id: `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: 'Test Deal',
        expected_value_minor: 100000,
        close_date: new Date().toISOString(),
        stage_id: 'stage_1',
        owner_user_id: 'user_1',
        company_id: 'company_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Generate mock company data
 */
export function generateMockCompany(overrides: Partial<any> = {}) {
    return {
        id: `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Test Company',
        website: 'https://testcompany.com',
        phone: '+1234567890',
        email: 'test@testcompany.com',
        address: '123 Test Street, Test City, TC 12345',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Generate mock person data
 */
export function generateMockPerson(overrides: Partial<any> = {}) {
    return {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@testcompany.com',
        phone: '+1234567890',
        company_id: 'company_1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...overrides,
    };
}

// ===== API MOCKING =====

/**
 * Mock API response
 */
export function mockApiResponse<T>(data: T, status: number = 200) {
    return {
        data,
        status,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
    };
}

/**
 * Mock API error
 */
export function mockApiError(message: string = 'API Error', status: number = 500) {
    const error = new Error(message);
    (error as any).response = {
        status,
        data: { message },
    };
    return error;
}

// ===== ASYNC TESTING =====

/**
 * Wait for async operations to complete
 */
export async function waitForAsync() {
    await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Wait for specific condition
 */
export async function waitForCondition(
    condition: () => boolean,
    timeout: number = 1000
): Promise<void> {
    const start = Date.now();

    while (!condition()) {
        if (Date.now() - start > timeout) {
            throw new Error('Condition timeout');
        }
        await waitForAsync();
    }
}

// ===== LOGGING MOCK =====

/**
 * Mock logger for testing
 */
export const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    api: jest.fn(),
    auth: jest.fn(),
    ui: jest.fn(),
    performance: jest.fn(),
};

/**
 * Setup logger mock
 */
export function setupLoggerMock() {
    jest.mock('./logger', () => ({
        logger: mockLogger,
    }));
}

// ===== ERROR TESTING =====

/**
 * Test error boundary
 */
export function createErrorComponent(error: Error) {
    return function ErrorComponent() {
        throw error;
    };
}

/**
 * Test async error
 */
export function createAsyncErrorComponent(error: Error) {
    return function AsyncErrorComponent() {
        React.useEffect(() => {
            throw error;
        }, []);
        return null;
    };
}

// ===== PERFORMANCE TESTING =====

/**
 * Measure function execution time
 */
export async function measureExecutionTime<T>(
    fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    return { result, duration };
}

/**
 * Test memory usage
 */
export function getMemoryUsage() {
    if ('memory' in performance) {
        return (performance as any).memory;
    }
    return null;
}

// ===== MOCK STORES =====

/**
 * Create mock auth store
 */
export function createMockAuthStore(overrides: Partial<any> = {}) {
    return {
        user: null,
        loading: false,
        error: null,
        isSigningIn: false,
        isSigningUp: false,
        hydrateFromSupabase: jest.fn(),
        signInWithPassword: jest.fn(),
        signUpWithPassword: jest.fn(),
        signOut: jest.fn(),
        sendPasswordReset: jest.fn(),
        ...overrides,
    };
}

// ===== TEST DATA CLEANUP =====

/**
 * Clean up test data
 */
export function cleanupTestData() {
    // Clear localStorage
    localStorage.clear();

    // Clear sessionStorage
    sessionStorage.clear();

    // Clear any global state
    if (typeof window !== 'undefined') {
        (window as any).__TEST_CLEANUP__?.();
    }
}

// ===== ASSERTION HELPERS =====

/**
 * Assert API error
 */
export function assertApiError(error: unknown, expectedMessage?: string) {
    expect(error).toBeInstanceOf(Error);
    if (expectedMessage) {
        expect((error as Error).message).toContain(expectedMessage);
    }
}

/**
 * Assert API response
 */
export function assertApiResponse<T>(response: any, expectedData?: T) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('statusText');
    expect(response).toHaveProperty('headers');

    if (expectedData) {
        expect(response.data).toEqual(expectedData);
    }
}

export default {
    createTestQueryClient,
    renderWithProviders,
    generateMockDeal,
    generateMockCompany,
    generateMockPerson,
    mockApiResponse,
    mockApiError,
    waitForAsync,
    waitForCondition,
    mockLogger,
    setupLoggerMock,
    createErrorComponent,
    createAsyncErrorComponent,
    measureExecutionTime,
    getMemoryUsage,
    createMockAuthStore,
    cleanupTestData,
    assertApiError,
    assertApiResponse,
};
