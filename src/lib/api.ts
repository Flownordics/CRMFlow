import axios from "axios";
import { supabase } from "@/integrations/supabase/client";
import { toastBus } from "./toastBus";
import { logger } from "./logger";
import { handleError, createAPIError, isRetryableError, getRetryDelay } from "./errorHandler";

// ===== REQUEST DEDUPLICATION =====

interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
  timeout: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly defaultTimeout = 30000; // 30 seconds

  /**
   * Generate a unique key for a request
   */
  private generateRequestKey(
    method: string,
    url: string,
    data?: unknown,
    params?: Record<string, string | number>
  ): string {
    const keyData = {
      method: method.toUpperCase(),
      url,
      data: data ? JSON.stringify(data) : undefined,
      params: params ? JSON.stringify(params) : undefined
    };
    return JSON.stringify(keyData);
  }

  /**
   * Check if a request is already pending
   */
  private isRequestPending(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (!pending) return false;

    // Check if request has timed out
    if (Date.now() - pending.timestamp > pending.timeout) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Add a pending request
   */
  private addPendingRequest(
    key: string,
    promise: Promise<unknown>,
    timeout: number = this.defaultTimeout
  ): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      timeout
    });
  }

  /**
   * Remove a pending request
   */
  private removePendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Get or create a request
   */
  async getOrCreateRequest<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>,
    data?: unknown,
    params?: Record<string, string | number>,
    timeout?: number
  ): Promise<T> {
    const key = this.generateRequestKey(method, url, data, params);

    // If request is already pending, return the existing promise
    if (this.isRequestPending(key)) {
      logger.debug('Request deduplication: Reusing pending request', { key, method, url });
      return this.pendingRequests.get(key)!.promise as Promise<T>;
    }

    // Create new request
    const promise = requestFn().finally(() => {
      this.removePendingRequest(key);
    });

    this.addPendingRequest(key, promise, timeout);

    logger.debug('Request deduplication: Created new request', { key, method, url });
    return promise as Promise<T>;
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    this.pendingRequests.clear();
    logger.debug('Request deduplication: Cleared all pending requests');
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ===== CIRCUIT BREAKER PATTERN =====

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  successThreshold: number;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      recoveryTimeout: config.recoveryTimeout || 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod || 10000, // 10 seconds
      successThreshold: config.successThreshold || 3
    };
  }

  /**
   * Check if circuit breaker allows the request
   */
  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (now - this.lastFailureTime >= this.config.recoveryTimeout) {
          this.state = CircuitState.HALF_OPEN;
          this.successCount = 0;
          logger.info('Circuit breaker: Moving to HALF_OPEN state');
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        logger.info('Circuit breaker: Moving to CLOSED state - service recovered');
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker: Moving to OPEN state - service failing', {
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold
      });
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker: Moving to OPEN state from HALF_OPEN - service still failing');
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    logger.info('Circuit breaker: Reset to CLOSED state');
  }

  /**
   * Get circuit breaker status
   */
  getStatus(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

export const circuitBreaker = new CircuitBreaker();

// Debug logging
logger.debug("Environment variables:", {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

const BASE = import.meta.env.VITE_SUPABASE_URL?.trim() ? import.meta.env.VITE_SUPABASE_URL.trim() + "/rest/v1" : undefined;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hård politik: INGEN automatisk fallback til mocks i dev, medmindre USE_MOCKS=true.
if (!BASE && !USE_MOCKS) {
  // Gør fejlen tydelig i konsollen og i UI
  logger.error("Missing VITE_SUPABASE_URL and USE_MOCKS is not true.");
  throw new Error("VITE_SUPABASE_URL is required when USE_MOCKS !== true");
}

logger.api("Using BASE URL:", BASE);

export const apiClient = axios.create({
  baseURL: BASE || undefined,
  withCredentials: false, // Changed from true to false to fix CORS issue
  headers: {
    Accept: "application/json",
    "apikey": anonKey,
    "Authorization": `Bearer ${anonKey}`,
    "Prefer": "count=exact"
  },
});

// Add request interceptor to include user authentication
apiClient.interceptors.request.use(async (config) => {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      // Use user's access token instead of anon key for authenticated requests
      config.headers.Authorization = `Bearer ${session.access_token}`;
      logger.api("Using user access token for request:", config.url);
    } else {
      logger.api("No user session found, using anon key for request:", config.url);
    }
  } catch (error) {
    logger.warn("Failed to get user session:", error);
  }
  return config;
});

// Response error: enhanced error handling with retry logic
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const ctype = error?.response?.headers?.["content-type"];
    let preview = "";
    let errorBody = null;

    try {
      const d = error?.response?.data;
      errorBody = typeof d === "string" ? JSON.parse(d) : d;
      preview = typeof d === "string" ? d.slice(0, 300) : JSON.stringify(d).slice(0, 300);
    } catch { }

    // Handle specific error cases
    if (status === 404 && errorBody?.code === "PGRST205") {
      logger.error("RLS Policy Issue Detected!");
      logger.error("Error 404 with PGRST205 code indicates missing RLS policies");
      logger.error("This usually means the table exists but PostgREST cannot access it");
      logger.error("Solution: Add RLS policies or disable RLS on the table");
      logger.error("URL:", error.config?.url);
      logger.error("Full error:", { status, ctype, preview });

      // Show toast for PGRST205 errors
      toastBus.emit({
        title: "API Configuration Error",
        description: "API table not exposed. Ensure public schema is exposed, grants are set, and schema cache reloaded.",
        variant: "destructive"
      });
    }

    // Process error through centralized error handler
    const processedError = handleError(error, 'API');

    // Check if error is retryable and implement retry logic
    if (isRetryableError(processedError) && error.config) {
      const retryCount = error.config._retryCount || 0;
      const maxRetries = 3;

      if (retryCount < maxRetries) {
        error.config._retryCount = retryCount + 1;
        const delay = getRetryDelay(retryCount);

        logger.info(`Retrying API request (attempt ${retryCount + 1}/${maxRetries}) after ${delay}ms`, {
          url: error.config.url,
          method: error.config.method,
          retryCount: retryCount + 1,
          delay
        });

        await new Promise(resolve => setTimeout(resolve, delay));
        return apiClient.request(error.config);
      } else {
        logger.warn(`Max retries exceeded for API request`, {
          url: error.config.url,
          method: error.config.method,
          retryCount,
          maxRetries
        });
      }
    }

    return Promise.reject(processedError);
  }
);

// NOTE: Importér mocks KUN når USE_MOCKS === true for tree-shaking:
let mockApi: {
  get: (url: string, config?: any) => Promise<any>;
  post: (url: string, body?: any, config?: any) => Promise<any>;
  put: (url: string, body?: any, config?: any) => Promise<any>;
  delete: (url: string, config?: any) => Promise<any>;
} | null = null;

if (USE_MOCKS) {
  const mod = await import("./mockApi");
  mockApi = mod.mockApi;
}

// API configuration type
interface ApiConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  timeout?: number;
  _retryCount?: number;
}

// API response type
interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string | string[] | undefined>;
}

export const api = {
  get: <T = unknown>(url: string, cfg?: ApiConfig): Promise<ApiResponse<T>> => {
    if (USE_MOCKS && mockApi) {
      return mockApi.get(url, cfg);
    }

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const error = createAPIError('Service temporarily unavailable', 'CIRCUIT_BREAKER_OPEN');
      logger.warn('Circuit breaker: Request blocked', { url, state: circuitBreaker.getState() });
      return Promise.reject(error);
    }

    return requestDeduplicator.getOrCreateRequest(
      'GET',
      url,
      async () => {
        try {
          const result = await apiClient.get(url, cfg);
          circuitBreaker.recordSuccess();
          return {
            data: result.data,
            status: result.status,
            statusText: result.statusText,
            headers: result.headers as Record<string, string | string[] | undefined>
          };
        } catch (error) {
          circuitBreaker.recordFailure();
          throw error;
        }
      },
      undefined,
      cfg?.params,
      cfg?.timeout || 30000
    );
  },

  post: <T = unknown>(url: string, body?: unknown, cfg?: ApiConfig): Promise<ApiResponse<T>> => {
    if (USE_MOCKS && mockApi) {
      return mockApi.post(url, body, cfg);
    }

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const error = createAPIError('Service temporarily unavailable', 'CIRCUIT_BREAKER_OPEN');
      logger.warn('Circuit breaker: Request blocked', { url, state: circuitBreaker.getState() });
      return Promise.reject(error);
    }

    return requestDeduplicator.getOrCreateRequest(
      'POST',
      url,
      async () => {
        try {
          const result = await apiClient.post(url, body, cfg);
          circuitBreaker.recordSuccess();
          return {
            data: result.data,
            status: result.status,
            statusText: result.statusText,
            headers: result.headers as Record<string, string | string[] | undefined>
          };
        } catch (error) {
          circuitBreaker.recordFailure();
          throw error;
        }
      },
      body,
      cfg?.params,
      cfg?.timeout || 30000
    );
  },

  patch: <T = unknown>(url: string, body?: unknown, cfg?: ApiConfig): Promise<ApiResponse<T>> => {
    if (USE_MOCKS && mockApi) {
      return mockApi.put(url, body, cfg);
    }

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const error = createAPIError('Service temporarily unavailable', 'CIRCUIT_BREAKER_OPEN');
      logger.warn('Circuit breaker: Request blocked', { url, state: circuitBreaker.getState() });
      return Promise.reject(error);
    }

    return requestDeduplicator.getOrCreateRequest(
      'PATCH',
      url,
      async () => {
        try {
          const result = await apiClient.patch(url, body, cfg);
          circuitBreaker.recordSuccess();
          return {
            data: result.data,
            status: result.status,
            statusText: result.statusText,
            headers: result.headers as Record<string, string | string[] | undefined>
          };
        } catch (error) {
          circuitBreaker.recordFailure();
          throw error;
        }
      },
      body,
      cfg?.params,
      cfg?.timeout || 30000
    );
  },

  delete: <T = unknown>(url: string, cfg?: ApiConfig): Promise<ApiResponse<T>> => {
    if (USE_MOCKS && mockApi) {
      return mockApi.delete(url, cfg);
    }

    // Check circuit breaker
    if (!circuitBreaker.canExecute()) {
      const error = createAPIError('Service temporarily unavailable', 'CIRCUIT_BREAKER_OPEN');
      logger.warn('Circuit breaker: Request blocked', { url, state: circuitBreaker.getState() });
      return Promise.reject(error);
    }

    return requestDeduplicator.getOrCreateRequest(
      'DELETE',
      url,
      async () => {
        try {
          const result = await apiClient.delete(url, cfg);
          circuitBreaker.recordSuccess();
          return {
            data: result.data,
            status: result.status,
            statusText: result.statusText,
            headers: result.headers as Record<string, string | string[] | undefined>
          };
        } catch (error) {
          circuitBreaker.recordFailure();
          throw error;
        }
      },
      undefined,
      cfg?.params,
      cfg?.timeout || 30000
    );
  },
};

// Helper function for POST requests that return the created resource
export const apiPostWithReturn = <T = unknown>(url: string, body?: unknown, cfg?: ApiConfig): Promise<ApiResponse<T>> => {
  if (USE_MOCKS && mockApi) {
    return mockApi.post(url, body, cfg);
  }

  const config: ApiConfig = {
    ...cfg,
    headers: {
      ...cfg?.headers,
      "Prefer": "return=representation"
    }
  };

  return apiClient.post(url, body, config);
};

// Type-safe API data normalization
export function normalizeApiData<T = unknown>(res: ApiResponse<T> | T): T | null {
  // axios: { data, status, headers, ... } – ellers kan mocks være direkte payload
  const payload = 'data' in res ? res.data : res;

  // Handle empty responses (common for successful POST/PATCH/DELETE operations)
  if (payload === "" || payload === null || payload === undefined) {
    logger.api("Received empty response:", {
      status: 'status' in res ? res.status : undefined,
      statusText: 'statusText' in res ? res.statusText : undefined,
      headers: 'headers' in res ? res.headers : undefined
    });
    return null;
  }

  if (typeof payload === "string") {
    // Log the full response for debugging
    logger.api("Received string response:", {
      status: 'status' in res ? res.status : undefined,
      statusText: 'statusText' in res ? res.statusText : undefined,
      headers: 'headers' in res ? res.headers : undefined,
      data: payload,
      dataLength: payload.length
    });

    // Prøv JSON.parse hvis server "stringer" JSON. Ellers kast med preview.
    try {
      return JSON.parse(payload) as T;
    } catch (parseError) {
      const preview = payload.slice(0, 300);
      logger.error("Failed to parse JSON response:", parseError);
      logger.error("Full response data:", payload);
      throw createAPIError(
        `Non-JSON response (string). Content preview: ${preview}`,
        400,
        'INVALID_JSON'
      );
    }
  }

  return payload as T;
}

// Test API configuration
export async function testApiConfig() {
  logger.api("Testing configuration...");
  logger.api("Base URL:", BASE);
  logger.api("Headers:", {
    Accept: "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`
  });

  try {
    // Test basic connectivity
    const response = await apiClient.get("/");
    logger.api("Root endpoint test successful:", response.status);
    return true;
  } catch (e: any) {
    logger.error("Root endpoint test failed:", e);
    return false;
  }
}

// (valgfrit) Health ping — men uden at toggle til mocks!
export async function pingApi() {
  try {
    // Try to access the root endpoint first to test basic connectivity
    const response = await apiClient.get("/");
    logger.api("Health check successful:", response.status);
    return true;
  } catch (e: any) {
    logger.error("Health check failed:", e);
    if (e.response) {
      logger.error("Response status:", e.response.status);
      logger.error("Response headers:", e.response.headers);
      logger.error("Response data:", e.response.data);
    }

    // If the root endpoint fails, try a simple companies query
    try {
      logger.api("Trying fallback health check...");
      const fallbackResponse = await apiClient.get("/companies?select=id&limit=1");
      logger.api("Fallback health check successful:", fallbackResponse.status);
      return true;
    } catch (fallbackError: any) {
      logger.error("Fallback health check also failed:", fallbackError);
      return false;
    }
  }
}

// Debug markør i vinduet til hurtig visuel kontrol
(window as any).__API_MODE__ = USE_MOCKS ? "MOCK" : "LIVE";
logger.api(`MODE = ${(window as any).__API_MODE__} | BASE = ${BASE ?? "(none)"}`);
