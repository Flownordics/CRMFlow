/**
 * Utility functions for generating user-friendly numbers for quotes, orders, and invoices
 * Instead of showing UUIDs like "c67ba755-96db-4277-a8e5-aabdc4df4b55"
 * We show friendly numbers like "Q-2024-001", "O-2024-001", "I-2024-001"
 */

/**
 * Generate a friendly number based on ID and type
 * Uses a simple hash of the UUID to create a consistent number
 */
export function generateFriendlyNumber(id: string, type: 'quote' | 'order' | 'invoice'): string {
    if (!id) return `${type.toUpperCase()}-000`;

    // Create a simple hash from the UUID to get a consistent number
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        const char = id.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to positive number and get last 3 digits
    const number = Math.abs(hash) % 1000;
    const paddedNumber = number.toString().padStart(3, '0');

    // Get current year
    const year = new Date().getFullYear();

    // Return formatted number
    const prefix = type.toUpperCase().charAt(0);
    return `${prefix}-${year}-${paddedNumber}`;
}

/**
 * Generate a friendly company reference
 * Instead of "Company c67ba755" we show "Company #001"
 */
export function generateFriendlyCompanyRef(companyId: string | null | undefined): string {
    if (!companyId) return "—";

    // Create a simple hash from the company ID
    let hash = 0;
    for (let i = 0; i < companyId.length; i++) {
        const char = companyId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Convert to positive number and get last 3 digits
    const number = Math.abs(hash) % 1000;
    const paddedNumber = number.toString().padStart(3, '0');

    return `Company #${paddedNumber}`;
}

/**
 * Generate a friendly deal reference
 */
export function generateFriendlyDealRef(dealId: string | null | undefined): string {
    if (!dealId) return "—";

    let hash = 0;
    for (let i = 0; i < dealId.length; i++) {
        const char = dealId.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    const number = Math.abs(hash) % 1000;
    const paddedNumber = number.toString().padStart(3, '0');

    return `Deal #${paddedNumber}`;
}
