import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a phone number with automatic spacing
 * Formats Danish numbers (+45) as: +45 XX XX XX XX
 * Formats other international numbers with country code + number groups
 * @param value - The phone number string to format
 * @returns Formatted phone number string
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters except +
  const digits = value.replace(/[^\d+]/g, '');
  
  // If empty, return empty string
  if (!digits) return '';
  
  // Handle numbers starting with +
  if (digits.startsWith('+')) {
    // Extract country code and number
    const match = digits.match(/^\+(\d{1,3})(\d*)$/);
    if (!match) return digits;
    
    const countryCode = match[1];
    const number = match[2];
    
    // Special formatting for Danish numbers (+45)
    if (countryCode === '45' && number.length > 0) {
      // Format as +45 XX XX XX XX (8 digits)
      const formatted = number.match(/.{1,2}/g)?.join(' ') || number;
      return `+45 ${formatted}`;
    }
    
    // For other country codes, format with space after country code
    if (number.length > 0) {
      // Group digits in pairs
      const formatted = number.match(/.{1,2}/g)?.join(' ') || number;
      return `+${countryCode} ${formatted}`;
    }
    
    return `+${countryCode}`;
  }
  
  // Handle numbers without + (assume Danish if starts with 45 or 8 digits)
  if (digits.startsWith('45') && digits.length > 2) {
    const number = digits.slice(2);
    const formatted = number.match(/.{1,2}/g)?.join(' ') || number;
    return `+45 ${formatted}`;
  }
  
  // If it's 8 digits, assume it's a Danish number
  if (digits.length === 8) {
    const formatted = digits.match(/.{1,2}/g)?.join(' ') || digits;
    return `+45 ${formatted}`;
  }
  
  // Otherwise, just return digits with basic spacing
  return digits;
}
