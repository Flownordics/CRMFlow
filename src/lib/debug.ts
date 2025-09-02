// Debug and environment configuration
export const DEBUG_UI = import.meta.env.VITE_DEBUG_UI === "true";
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";
export const API_BASE = import.meta.env.VITE_SUPABASE_URL?.trim() + "/rest/v1";

// Log current configuration in development
if (import.meta.env.DEV) {
  console.log("🔧 CRMFlow Configuration:", {
    API_BASE,
    USE_MOCKS,
    DEBUG_UI,
  });
}
