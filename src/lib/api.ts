import axios from "axios";
import { supabase } from "@/integrations/supabase/client";
import { toastBus } from "./toastBus";

// Debug logging
console.log("Environment variables:", {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
});

const BASE = import.meta.env.VITE_SUPABASE_URL?.trim() ? import.meta.env.VITE_SUPABASE_URL.trim() + "/rest/v1" : undefined;
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Hård politik: INGEN automatisk fallback til mocks i dev, medmindre USE_MOCKS=true.
if (!BASE && !USE_MOCKS) {
  // Gør fejlen tydelig i konsollen og i UI
  console.error("[API] Missing VITE_SUPABASE_URL and USE_MOCKS is not true.");
  throw new Error("VITE_SUPABASE_URL is required when USE_MOCKS !== true");
}

console.log("[API] Using BASE URL:", BASE);

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
      console.log("[API] Using user access token for request:", config.url);
    } else {
      console.log("[API] No user session found, using anon key for request:", config.url);
    }
  } catch (error) {
    console.warn("[API] Failed to get user session:", error);
  }
  return config;
});

// Response error: log status + content-type + kort preview
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

    // Enhanced error logging for RLS issues
    if (status === 404 && errorBody?.code === "PGRST205") {
      console.error("[API] RLS Policy Issue Detected!");
      console.error("[API] Error 404 with PGRST205 code indicates missing RLS policies");
      console.error("[API] This usually means the table exists but PostgREST cannot access it");
      console.error("[API] Solution: Add RLS policies or disable RLS on the table");
      console.error("[API] URL:", error.config?.url);
      console.error("[API] Full error:", status, ctype, preview);

      // Show toast for PGRST205 errors
      toastBus.emit({
        title: "API Configuration Error",
        description: "API table not exposed. Ensure public schema is exposed, grants are set, and schema cache reloaded.",
        variant: "destructive"
      });
    } else {
      console.error("[API] Error", status, ctype, preview);
    }

    return Promise.reject(error);
  }
);

// NOTE: Importér mocks KUN når USE_MOCKS === true for tree-shaking:
let mockApi: any;
if (USE_MOCKS) {
  const mod = await import("./mockApi");
  mockApi = mod.mockApi;
}

export const api = {
  get: (url: string, cfg?: any) => USE_MOCKS ? mockApi.get(url, cfg) : apiClient.get(url, cfg),
  post: (url: string, body?: any, cfg?: any) => USE_MOCKS ? mockApi.post(url, body, cfg) : apiClient.post(url, body, cfg),
  patch: (url: string, body?: any, cfg?: any) => USE_MOCKS ? mockApi.put(url, body, cfg) : apiClient.patch(url, body, cfg),
  delete: (url: string, cfg?: any) => USE_MOCKS ? mockApi.delete(url, cfg) : apiClient.delete(url, cfg),
};

// Helper function for POST requests that return the created resource
export const apiPostWithReturn = (url: string, body?: any, cfg?: any) => {
  if (USE_MOCKS) {
    return mockApi.post(url, body, cfg);
  }

  const config = {
    ...cfg,
    headers: {
      ...cfg?.headers,
      "Prefer": "return=representation"
    }
  };

  return apiClient.post(url, body, config);
};

// Normalize API data helper
export function normalizeApiData(res: any) {
  // axios: { data, status, headers, ... } – ellers kan mocks være direkte payload
  const payload = res?.data ?? res;

  // Handle empty responses (common for successful POST/PATCH/DELETE operations)
  if (payload === "" || payload === null || payload === undefined) {
    console.log("[API] Received empty response:", {
      status: res?.status,
      statusText: res?.statusText,
      headers: res?.headers
    });
    return null;
  }

  if (typeof payload === "string") {
    // Log the full response for debugging
    console.log("[API] Received string response:", {
      status: res?.status,
      statusText: res?.statusText,
      headers: res?.headers,
      data: payload,
      dataLength: payload.length
    });

    // Prøv JSON.parse hvis server "stringer" JSON. Ellers kast med preview.
    try {
      return JSON.parse(payload);
    } catch (parseError) {
      const preview = payload.slice(0, 300);
      console.error("[API] Failed to parse JSON response:", parseError);
      console.error("[API] Full response data:", payload);
      throw new Error(`[API] Non-JSON response (string). Content preview: ${preview}`);
    }
  }
  return payload;
}

// Test API configuration
export async function testApiConfig() {
  console.log("[API] Testing configuration...");
  console.log("[API] Base URL:", BASE);
  console.log("[API] Headers:", {
    Accept: "application/json",
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + "...",
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20)}...`
  });

  try {
    // Test basic connectivity
    const response = await apiClient.get("/");
    console.log("[API] Root endpoint test successful:", response.status);
    return true;
  } catch (e: any) {
    console.error("[API] Root endpoint test failed:", e);
    return false;
  }
}

// (valgfrit) Health ping — men uden at toggle til mocks!
export async function pingApi() {
  try {
    // Try to access the root endpoint first to test basic connectivity
    const response = await apiClient.get("/");
    console.log("[API] Health check successful:", response.status);
    return true;
  } catch (e: any) {
    console.error("[API] Health check failed:", e);
    if (e.response) {
      console.error("[API] Response status:", e.response.status);
      console.error("[API] Response headers:", e.response.headers);
      console.error("[API] Response data:", e.response.data);
    }

    // If the root endpoint fails, try a simple companies query
    try {
      console.log("[API] Trying fallback health check...");
      const fallbackResponse = await apiClient.get("/companies?select=id&limit=1");
      console.log("[API] Fallback health check successful:", fallbackResponse.status);
      return true;
    } catch (fallbackError: any) {
      console.error("[API] Fallback health check also failed:", fallbackError);
      return false;
    }
  }
}

// Debug markør i vinduet til hurtig visuel kontrol
(window as any).__API_MODE__ = USE_MOCKS ? "MOCK" : "LIVE";
console.info(`[API] MODE = ${(window as any).__API_MODE__} | BASE = ${BASE ?? "(none)"}`);
