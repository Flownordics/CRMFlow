/**
 * Comprehensive Testing Framework
 * Provides integration tests, E2E test coverage, and performance tests
 */

import { logger } from './logger';
import { handleError } from './errorHandler';

// ===== TESTING TYPES =====

export interface TestConfig {
    timeout?: number;
    retries?: number;
    parallel?: boolean;
    environment?: 'test' | 'staging' | 'production';
    dataCleanup?: boolean;
}

export interface TestResult {
    name: string;
    success: boolean;
    duration: number;
    error?: Error;
    metadata?: Record<string, any>;
    timestamp: number;
}

export interface TestSuite {
    name: string;
    tests: TestCase[];
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    config?: TestConfig;
}

export interface TestCase {
    name: string;
    test: () => Promise<void>;
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    timeout?: number;
    retries?: number;
    skip?: boolean;
    only?: boolean;
}

export interface PerformanceTestConfig {
    iterations: number;
    concurrency: number;
    timeout: number;
    warmup: number;
}

export interface PerformanceTestResult {
    name: string;
    iterations: number;
    concurrency: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    p99Duration: number;
    successRate: number;
    errors: Error[];
    timestamp: number;
}

// ===== TEST RUNNER =====

/**
 * Test runner for executing test suites
 */
export class TestRunner {
    private results: TestResult[] = [];
    private config: TestConfig;

    constructor(config: TestConfig = {}) {
        this.config = {
            timeout: 30000,
            retries: 0,
            parallel: false,
            environment: 'test',
            dataCleanup: true,
            ...config
        };
    }

    /**
     * Run a test suite
     */
    async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
        logger.info('Running test suite', { name: suite.name, testCount: suite.tests.length });

        const suiteResults: TestResult[] = [];

        try {
            // Setup suite
            if (suite.setup) {
                await suite.setup();
            }

            // Run tests
            if (this.config.parallel) {
                suiteResults.push(...await this.runTestsInParallel(suite.tests));
            } else {
                suiteResults.push(...await this.runTestsInSequence(suite.tests));
            }

            // Teardown suite
            if (suite.teardown) {
                await suite.teardown();
            }

        } catch (error) {
            logger.error('Test suite failed', { name: suite.name, error });
            throw error;
        }

        this.results.push(...suiteResults);
        return suiteResults;
    }

    /**
     * Run tests in sequence
     */
    private async runTestsInSequence(tests: TestCase[]): Promise<TestResult[]> {
        const results: TestResult[] = [];

        for (const test of tests) {
            if (test.skip) {
                logger.info('Skipping test', { name: test.name });
                continue;
            }

            const result = await this.runTest(test);
            results.push(result);

            if (!result.success && test.retries === 0) {
                logger.error('Test failed, stopping suite', { name: test.name });
                break;
            }
        }

        return results;
    }

    /**
     * Run tests in parallel
     */
    private async runTestsInParallel(tests: TestCase[]): Promise<TestResult[]> {
        const testPromises = tests
            .filter(test => !test.skip)
            .map(test => this.runTest(test));

        return Promise.all(testPromises);
    }

    /**
     * Run a single test
     */
    private async runTest(test: TestCase): Promise<TestResult> {
        const startTime = Date.now();
        const timeout = test.timeout || this.config.timeout || 30000;
        const retries = test.retries || this.config.retries || 0;

        let lastError: Error | undefined;
        let success = false;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Setup
                if (test.setup) {
                    await test.setup();
                }

                // Run test with timeout
                await Promise.race([
                    test.test(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Test timeout')), timeout)
                    )
                ]);

                success = true;
                break;

            } catch (error) {
                lastError = error as Error;
                logger.warn('Test attempt failed', {
                    name: test.name,
                    attempt: attempt + 1,
                    maxAttempts: retries + 1,
                    error: lastError.message
                });

                // Teardown on failure
                if (test.teardown) {
                    try {
                        await test.teardown();
                    } catch (teardownError) {
                        logger.error('Test teardown failed', { name: test.name, error: teardownError });
                    }
                }
            }
        }

        const duration = Date.now() - startTime;

        const result: TestResult = {
            name: test.name,
            success,
            duration,
            error: lastError,
            timestamp: Date.now()
        };

        if (success) {
            logger.info('Test passed', { name: test.name, duration });
        } else {
            logger.error('Test failed', { name: test.name, duration, error: lastError });
        }

        return result;
    }

    /**
     * Get test results
     */
    getResults(): TestResult[] {
        return [...this.results];
    }

    /**
     * Get test summary
     */
    getSummary(): {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
        successRate: number;
    } {
        const total = this.results.length;
        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        const skipped = 0; // Skipped tests are not in results
        const duration = this.results.reduce((sum, r) => sum + r.duration, 0);
        const successRate = total > 0 ? (passed / total) * 100 : 0;

        return {
            total,
            passed,
            failed,
            skipped,
            duration,
            successRate
        };
    }

    /**
     * Clear results
     */
    clearResults(): void {
        this.results = [];
    }
}

// ===== INTEGRATION TEST HELPERS =====

/**
 * Integration test helpers
 */
export class IntegrationTestHelpers {
    /**
     * Setup test database
     */
    static async setupTestDatabase(): Promise<void> {
        logger.info('Setting up test database');
        // Implementation would depend on your database setup
    }

    /**
     * Cleanup test database
     */
    static async cleanupTestDatabase(): Promise<void> {
        logger.info('Cleaning up test database');
        // Implementation would depend on your database setup
    }

    /**
     * Create test user
     */
    static async createTestUser(overrides: Record<string, any> = {}): Promise<any> {
        const testUser = {
            id: `test_user_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            name: 'Test User',
            ...overrides
        };

        logger.debug('Created test user', { id: testUser.id });
        return testUser;
    }

    /**
     * Create test company
     */
    static async createTestCompany(overrides: Record<string, any> = {}): Promise<any> {
        const testCompany = {
            id: `test_company_${Date.now()}`,
            name: `Test Company ${Date.now()}`,
            email: `company_${Date.now()}@example.com`,
            ...overrides
        };

        logger.debug('Created test company', { id: testCompany.id });
        return testCompany;
    }

    /**
     * Create test deal
     */
    static async createTestDeal(overrides: Record<string, any> = {}): Promise<any> {
        const testDeal = {
            id: `test_deal_${Date.now()}`,
            title: `Test Deal ${Date.now()}`,
            value: 10000,
            stage_id: 'test_stage',
            company_id: 'test_company',
            ...overrides
        };

        logger.debug('Created test deal', { id: testDeal.id });
        return testDeal;
    }

    /**
     * Wait for API response
     */
    static async waitForAPI(
        apiCall: () => Promise<any>,
        timeout: number = 5000,
        interval: number = 100
    ): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                const result = await apiCall();
                return result;
            } catch (error) {
                if (Date.now() - startTime >= timeout) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, interval));
            }
        }

        throw new Error('API call timeout');
    }

    /**
     * Mock external API
     */
    static mockExternalAPI(
        endpoint: string,
        response: any,
        statusCode: number = 200
    ): void {
        // Implementation would depend on your mocking library
        logger.debug('Mocked external API', { endpoint, statusCode });
    }

    /**
     * Restore external API mocks
     */
    static restoreExternalAPIMocks(): void {
        // Implementation would depend on your mocking library
        logger.debug('Restored external API mocks');
    }
}

// ===== E2E TEST HELPERS =====

/**
 * E2E test helpers
 */
export class E2ETestHelpers {
    /**
     * Navigate to page
     */
    static async navigateToPage(page: any, url: string): Promise<void> {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        logger.debug('Navigated to page', { url });
    }

    /**
     * Click element
     */
    static async clickElement(page: any, selector: string): Promise<void> {
        await page.click(selector);
        logger.debug('Clicked element', { selector });
    }

    /**
     * Fill form field
     */
    static async fillField(page: any, selector: string, value: string): Promise<void> {
        await page.fill(selector, value);
        logger.debug('Filled field', { selector, value });
    }

    /**
     * Wait for element
     */
    static async waitForElement(page: any, selector: string, timeout: number = 5000): Promise<void> {
        await page.waitForSelector(selector, { timeout });
        logger.debug('Element found', { selector });
    }

    /**
     * Take screenshot
     */
    static async takeScreenshot(page: any, name: string): Promise<void> {
        await page.screenshot({ path: `screenshots/${name}.png` });
        logger.debug('Screenshot taken', { name });
    }

    /**
     * Check element text
     */
    static async checkElementText(page: any, selector: string, expectedText: string): Promise<boolean> {
        const element = await page.$(selector);
        if (!element) return false;

        const text = await element.textContent();
        const matches = text?.includes(expectedText) || false;

        logger.debug('Checked element text', { selector, expectedText, actualText: text, matches });
        return matches;
    }

    /**
     * Wait for API response
     */
    static async waitForAPIResponse(
        page: any,
        urlPattern: string,
        timeout: number = 10000
    ): Promise<any> {
        const response = await page.waitForResponse(
            response => response.url().includes(urlPattern),
            { timeout }
        );

        logger.debug('API response received', { urlPattern, status: response.status() });
        return response;
    }
}

// ===== PERFORMANCE TEST HELPERS =====

/**
 * Performance test helpers
 */
export class PerformanceTestHelpers {
    /**
     * Run performance test
     */
    static async runPerformanceTest(
        name: string,
        testFunction: () => Promise<any>,
        config: PerformanceTestConfig
    ): Promise<PerformanceTestResult> {
        const { iterations, concurrency, timeout, warmup } = config;
        const results: number[] = [];
        const errors: Error[] = [];

        logger.info('Starting performance test', { name, iterations, concurrency });

        // Warmup
        for (let i = 0; i < warmup; i++) {
            try {
                await testFunction();
            } catch (error) {
                // Ignore warmup errors
            }
        }

        // Run tests
        const startTime = Date.now();

        for (let i = 0; i < iterations; i++) {
            const batch = [];

            for (let j = 0; j < concurrency; j++) {
                batch.push(this.runSingleTest(testFunction, timeout));
            }

            const batchResults = await Promise.allSettled(batch);

            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    errors.push(result.reason);
                }
            });
        }

        const totalDuration = Date.now() - startTime;
        const successCount = results.length;
        const successRate = (successCount / (iterations * concurrency)) * 100;

        // Calculate statistics
        const sortedResults = results.sort((a, b) => a - b);
        const avgDuration = results.reduce((sum, d) => sum + d, 0) / results.length;
        const minDuration = Math.min(...results);
        const maxDuration = Math.max(...results);
        const p95Index = Math.floor(sortedResults.length * 0.95);
        const p99Index = Math.floor(sortedResults.length * 0.99);
        const p95Duration = sortedResults[p95Index] || 0;
        const p99Duration = sortedResults[p99Index] || 0;

        const result: PerformanceTestResult = {
            name,
            iterations,
            concurrency,
            avgDuration,
            minDuration,
            maxDuration,
            p95Duration,
            p99Duration,
            successRate,
            errors,
            timestamp: Date.now()
        };

        logger.info('Performance test completed', {
            name,
            successRate: `${successRate.toFixed(2)}%`,
            avgDuration: `${avgDuration.toFixed(2)}ms`,
            p95Duration: `${p95Duration.toFixed(2)}ms`
        });

        return result;
    }

    /**
     * Run single performance test
     */
    private static async runSingleTest(
        testFunction: () => Promise<any>,
        timeout: number
    ): Promise<number> {
        const startTime = performance.now();

        try {
            await Promise.race([
                testFunction(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Test timeout')), timeout)
                )
            ]);

            return performance.now() - startTime;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Load test API endpoint
     */
    static async loadTestAPI(
        endpoint: string,
        method: string = 'GET',
        body?: any,
        config: PerformanceTestConfig = {
            iterations: 100,
            concurrency: 10,
            timeout: 5000,
            warmup: 5
        }
    ): Promise<PerformanceTestResult> {
        const testFunction = async () => {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            return response.json();
        };

        return this.runPerformanceTest(`API ${method} ${endpoint}`, testFunction, config);
    }
}

// ===== TEST SUITE BUILDER =====

/**
 * Test suite builder for creating test suites
 */
export class TestSuiteBuilder {
    private suite: TestSuite;

    constructor(name: string) {
        this.suite = {
            name,
            tests: []
        };
    }

    /**
     * Add test case
     */
    addTest(test: TestCase): TestSuiteBuilder {
        this.suite.tests.push(test);
        return this;
    }

    /**
     * Add setup function
     */
    addSetup(setup: () => Promise<void>): TestSuiteBuilder {
        this.suite.setup = setup;
        return this;
    }

    /**
     * Add teardown function
     */
    addTeardown(teardown: () => Promise<void>): TestSuiteBuilder {
        this.suite.teardown = teardown;
        return this;
    }

    /**
     * Set test configuration
     */
    setConfig(config: TestConfig): TestSuiteBuilder {
        this.suite.config = config;
        return this;
    }

    /**
     * Build test suite
     */
    build(): TestSuite {
        return this.suite;
    }
}

// ===== CONVENIENCE FUNCTIONS =====

/**
 * Create test suite
 */
export function createTestSuite(name: string): TestSuiteBuilder {
    return new TestSuiteBuilder(name);
}

/**
 * Create test case
 */
export function createTestCase(
    name: string,
    test: () => Promise<void>,
    options: Partial<TestCase> = {}
): TestCase {
    return {
        name,
        test,
        ...options
    };
}

/**
 * Run test suite
 */
export async function runTestSuite(suite: TestSuite, config?: TestConfig): Promise<TestResult[]> {
    const runner = new TestRunner(config);
    return runner.runTestSuite(suite);
}

/**
 * Run performance test
 */
export async function runPerformanceTest(
    name: string,
    testFunction: () => Promise<any>,
    config: PerformanceTestConfig
): Promise<PerformanceTestResult> {
    return PerformanceTestHelpers.runPerformanceTest(name, testFunction, config);
}

export default {
    TestRunner,
    IntegrationTestHelpers,
    E2ETestHelpers,
    PerformanceTestHelpers,
    TestSuiteBuilder,
    createTestSuite,
    createTestCase,
    runTestSuite,
    runPerformanceTest
};
