/**
 * Generate a new UUID v4 for idempotency keys
 */
export function newIdemKey(): string {
    return crypto.randomUUID();
}
