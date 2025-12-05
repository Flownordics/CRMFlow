/**
 * Centralized React Query cache configuration
 * Provides consistent staleTime and gcTime (garbage collection time) settings
 * based on data type and update frequency
 */

// Cache time constants (in milliseconds)
export const CACHE_TIMES = {
  // Static/reference data - rarely changes
  STATIC: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
  },
  
  // Semi-static data - changes occasionally
  SEMI_STATIC: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Frequently accessed data - changes moderately
  FREQUENT: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  },
  
  // Real-time data - changes often
  REALTIME: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Very dynamic data - changes constantly
  DYNAMIC: {
    staleTime: 0, // Always stale, refetch immediately
    gcTime: 2 * 60 * 1000, // 2 minutes
  },
} as const;

/**
 * Get cache configuration for a specific data type
 */
export function getCacheConfig(type: keyof typeof CACHE_TIMES) {
  return CACHE_TIMES[type];
}

/**
 * Default query options for React Query
 * Can be spread into useQuery hooks
 */
export const defaultQueryOptions = {
  refetchOnWindowFocus: false, // Don't refetch when window regains focus
  refetchOnMount: true, // Refetch when component mounts
  refetchOnReconnect: true, // Refetch when network reconnects
  retry: 2, // Retry failed requests 2 times
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
};

/**
 * Cache configuration by entity type
 */
export const ENTITY_CACHE_CONFIG = {
  // Companies - semi-static, changes occasionally
  companies: CACHE_TIMES.SEMI_STATIC,
  company: CACHE_TIMES.SEMI_STATIC,
  
  // People - semi-static
  people: CACHE_TIMES.SEMI_STATIC,
  person: CACHE_TIMES.SEMI_STATIC,
  
  // Deals - frequently accessed, changes moderately
  deals: CACHE_TIMES.FREQUENT,
  deal: CACHE_TIMES.FREQUENT,
  
  // Quotes - frequently accessed
  quotes: CACHE_TIMES.FREQUENT,
  quote: CACHE_TIMES.FREQUENT,
  
  // Orders - frequently accessed
  orders: CACHE_TIMES.FREQUENT,
  order: CACHE_TIMES.FREQUENT,
  
  // Invoices - frequently accessed
  invoices: CACHE_TIMES.FREQUENT,
  invoice: CACHE_TIMES.FREQUENT,
  
  // Pipelines/Stages - static reference data
  pipelines: CACHE_TIMES.STATIC,
  stages: CACHE_TIMES.STATIC,
  
  // Events/Calendar - real-time data
  events: CACHE_TIMES.REALTIME,
  
  // Activity logs - real-time
  activities: CACHE_TIMES.REALTIME,
  
  // Analytics - semi-static, recalculated periodically
  analytics: CACHE_TIMES.SEMI_STATIC,
  revenue: CACHE_TIMES.SEMI_STATIC,
  
  // Settings - static
  settings: CACHE_TIMES.STATIC,
  users: CACHE_TIMES.STATIC,
} as const;

/**
 * Get cache config for an entity type
 */
export function getEntityCacheConfig(entityType: keyof typeof ENTITY_CACHE_CONFIG) {
  return ENTITY_CACHE_CONFIG[entityType] || CACHE_TIMES.FREQUENT;
}
