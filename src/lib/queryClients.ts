import { QueryClient } from "@tanstack/react-query";

/**
 * React Query client with mobile-optimized configuration
 * - Optimistic updates for better perceived performance
 * - Intelligent caching and stale time settings
 * - Mobile-friendly retry logic for unstable networks
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      gcTime: 1000 * 60 * 5,
      // Consider data stale after 30 seconds
      staleTime: 1000 * 30,
      // Retry failed requests intelligently
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Retry up to 2 times for network errors
        return failureCount < 2;
      },
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect to save bandwidth on mobile
      refetchOnReconnect: false,
      // Refetch on mount only if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once on mobile networks
      retry: 1,
      // Shorter retry delay for mutations
      retryDelay: 1000,
    },
  },
});
