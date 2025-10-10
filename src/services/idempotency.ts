/**
 * UI-local idempotency helper using sessionStorage
 * Prevents duplicate operations within a time window
 */

import { logger } from '@/lib/logger';
const STORAGE_PREFIX = 'crmflow_automation_';
const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface IdempotencyEntry {
  id: string;
  timestamp: number;
  ttl: number;
}

/**
 * Check if an operation with the given key is still valid (not expired)
 */
export function isIdempotent(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const stored = sessionStorage.getItem(storageKey);
    
    if (!stored) return false;
    
    const entry: IdempotencyEntry = JSON.parse(stored);
    const now = Date.now();
    
    // Check if entry is still valid
    if (now - entry.timestamp < ttlMs) {
      return true; // Still valid, operation should be skipped
    }
    
    // Entry expired, clean it up
    sessionStorage.removeItem(storageKey);
    return false;
  } catch (error) {
    logger.warn('[Idempotency] Error checking idempotency:', error);
    return false; // On error, allow operation to proceed
  }
}

/**
 * Mark an operation as completed with the given key
 */
export function markIdempotent(key: string, ttlMs: number = DEFAULT_TTL_MS): void {
  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    const entry: IdempotencyEntry = {
      id: key,
      timestamp: Date.now(),
      ttl: ttlMs
    };
    
    sessionStorage.setItem(storageKey, JSON.stringify(entry));
  } catch (error) {
    logger.warn('[Idempotency] Error marking idempotent:', error);
  }
}

/**
 * Clear an idempotency entry
 */
export function clearIdempotent(key: string): void {
  try {
    const storageKey = `${STORAGE_PREFIX}${key}`;
    sessionStorage.removeItem(storageKey);
  } catch (error) {
    logger.warn('[Idempotency] Error clearing idempotency:', error);
  }
}

/**
 * Generate automation key for deal operations
 */
export function generateAutomationKey(type: 'quote' | 'order', dealId: string): string {
  return `auto:${type}:${dealId}`;
}
