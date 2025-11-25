/**
 * Utility functions for fetching and managing company logos from Clearbit
 */

/**
 * List of standard email providers and domains that should not have logos fetched
 * These are typically personal email providers, not company domains
 */
export const EXCLUDED_LOGO_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'mail.com',
  'yandex.com',
  'zoho.com',
  'gmx.com',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
] as const;

/**
 * Extracts domain from a URL or email address
 * @param input - URL (e.g., "https://www.example.com" or "example.com") or email (e.g., "user@example.com")
 * @returns Domain without protocol and www, or null if invalid
 */
export function extractDomain(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  // If it's an email address, extract domain
  if (trimmed.includes('@')) {
    const emailMatch = trimmed.match(/@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)/);
    if (emailMatch && emailMatch[1]) {
      return emailMatch[1];
    }
    return null;
  }

  // If it's a URL, extract domain
  try {
    // Remove protocol if present
    let domain = trimmed.replace(/^https?:\/\//, '');
    
    // Remove www. if present
    domain = domain.replace(/^www\./, '');
    
    // Remove path, query, and fragment
    domain = domain.split('/')[0].split('?')[0].split('#')[0];
    
    // Remove port if present
    domain = domain.split(':')[0];
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (domainRegex.test(domain)) {
      return domain;
    }
  } catch (error) {
    // Invalid URL format
    return null;
  }

  return null;
}

/**
 * Checks if a domain is in the excluded list
 * @param domain - Domain to check
 * @returns true if domain should be excluded from logo fetching
 */
export function isExcludedDomain(domain: string | null | undefined): boolean {
  if (!domain) return true;
  return EXCLUDED_LOGO_DOMAINS.includes(domain.toLowerCase() as any);
}

/**
 * Generates Clearbit logo URL for a given domain
 * @param domain - Domain name (without protocol or www)
 * @returns Clearbit logo URL or null if domain is invalid/excluded
 */
export function getClearbitLogoUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;
  
  const normalizedDomain = domain.toLowerCase().trim();
  
  // Check if domain is excluded
  if (isExcludedDomain(normalizedDomain)) {
    return null;
  }
  
  // Generate Clearbit URL
  return `https://logo.clearbit.com/${normalizedDomain}`;
}

/**
 * Fetches logo URL for a company based on website URL or email
 * @param website - Company website URL
 * @param email - Company email address
 * @returns Clearbit logo URL or null if not available
 */
export function getCompanyLogoUrl(
  website: string | null | undefined,
  email: string | null | undefined
): string | null {
  // First try to get domain from website
  if (website) {
    const domain = extractDomain(website);
    if (domain && !isExcludedDomain(domain)) {
      return getClearbitLogoUrl(domain);
    }
  }
  
  // If no website or excluded, try email domain
  if (email) {
    const domain = extractDomain(email);
    if (domain && !isExcludedDomain(domain)) {
      return getClearbitLogoUrl(domain);
    }
  }
  
  return null;
}

/**
 * Validates if a Clearbit logo URL is accessible
 * This performs a HEAD request to check if the logo exists
 * @param logoUrl - Clearbit logo URL to validate
 * @returns Promise that resolves to true if logo exists, false otherwise
 */
export async function validateLogoUrl(logoUrl: string): Promise<boolean> {
  if (!logoUrl || !logoUrl.startsWith('https://logo.clearbit.com/')) {
    return false;
  }

  try {
    const response = await fetch(logoUrl, {
      method: 'HEAD',
      mode: 'no-cors', // Use no-cors to avoid CORS issues, but this limits response checking
    });
    
    // With no-cors, we can't check status, so we'll use a different approach
    // Try loading the image to see if it exists
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = logoUrl;
      
      // Timeout after 3 seconds
      setTimeout(() => resolve(false), 3000);
    });
  } catch (error) {
    return false;
  }
}

