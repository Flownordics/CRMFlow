import { logger } from "@/lib/logger";

/**
 * CVR API Response type based on the provided example
 */
export interface CvrResponse {
  vat: number;
  name: string;
  status: string;
  type: string;
  typeCode: string; // Excluded from saving, but present in response
  address: string;
  zip: number;
  city: string;
  country: string;
  phone: string;
  email: string;
  web: string;
  commercialProtected: boolean;
  industryCode: string;
  industryName: string;
  monthlyEmployment?: {
    yearMonth: string;
    fullTimeEquivalent: number;
    employees: number;
    lastUpdated: string;
  };
}

/**
 * Error response from CVR API
 */
export interface CvrErrorResponse {
  message: string;
}

/**
 * Lookup company information by CVR number or company name
 * @param search - CVR number (as string) or company name
 * @returns CVR response data or throws error
 */
export async function lookupCvr(search: string): Promise<CvrResponse> {
  if (!search || search.trim().length === 0) {
    throw new Error("Søgetekst må ikke være tom");
  }

  try {
    const url = new URL("https://n8n.faktuflow.com/webhook/cvr");
    url.searchParams.append("search", search.trim());

    logger.debug("CVR lookup request", { url: url.toString(), search });

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData: CvrErrorResponse = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // If JSON parsing fails, use default error message
      }

      logger.error("CVR lookup failed", {
        status: response.status,
        statusText: response.statusText,
        search,
        errorMessage,
      });

      throw new Error(errorMessage);
    }

    const data: CvrResponse = await response.json();

    logger.debug("CVR lookup success", {
      vat: data.vat,
      name: data.name,
      status: data.status,
    });

    return data;
  } catch (error) {
    if (error instanceof Error) {
      logger.error("CVR lookup error", {
        error: error.message,
        search,
        stack: error.stack,
      });
      throw error;
    }
    
    logger.error("CVR lookup unknown error", { error, search });
    throw new Error("Ukendt fejl ved CVR lookup");
  }
}

/**
 * Normalize website URL - adds https:// if protocol is missing
 * @param web - Website URL from CVR (may be missing protocol)
 * @returns Normalized URL with protocol
 */
export function normalizeWebsite(web: string | undefined | null): string | null {
  if (!web || web.trim().length === 0) {
    return null;
  }

  const trimmed = web.trim();
  
  // If it already has a protocol, return as is
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Otherwise add https://
  return `https://${trimmed}`;
}

/**
 * Map CVR response to company create/update data
 * @param cvrData - CVR API response
 * @returns Company data object ready for create/update
 */
export function mapCvrToCompanyData(cvrData: CvrResponse): Partial<{
  name: string;
  vat: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  cvrStatus: string | null;
  legalType: string | null;
  commercialProtected: boolean | null;
  industryCode: string | null;
  monthlyEmployment: Record<string, any> | null;
  employeeCount: number | null;
}> {
  return {
    name: cvrData.name,
    vat: cvrData.vat.toString(),
    email: cvrData.email && cvrData.email.trim().length > 0 ? cvrData.email.trim() : null,
    phone: cvrData.phone && cvrData.phone.trim().length > 0 ? cvrData.phone.trim() : null,
    address: cvrData.address && cvrData.address.trim().length > 0 ? cvrData.address.trim() : null,
    city: cvrData.city && cvrData.city.trim().length > 0 ? cvrData.city.trim() : null,
    zip: cvrData.zip ? cvrData.zip.toString() : null,
    country: cvrData.country && cvrData.country.trim().length > 0 ? cvrData.country.trim() : null,
    industry: cvrData.industryName && cvrData.industryName.trim().length > 0 ? cvrData.industryName.trim() : null,
    website: normalizeWebsite(cvrData.web),
    cvrStatus: cvrData.status && cvrData.status.trim().length > 0 ? cvrData.status.trim() : null,
    legalType: cvrData.type && cvrData.type.trim().length > 0 ? cvrData.type.trim() : null,
    commercialProtected: cvrData.commercialProtected ?? null,
    industryCode: cvrData.industryCode && cvrData.industryCode.trim().length > 0 ? cvrData.industryCode.trim() : null,
    monthlyEmployment: cvrData.monthlyEmployment ? cvrData.monthlyEmployment : null,
    employeeCount: cvrData.monthlyEmployment?.employees ?? null,
  };
}

/**
 * Helper function to check if a value is non-empty
 * @param value - Value to check
 * @returns true if value is not null, undefined, or empty string
 */
function isNonEmpty(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim().length === 0) return false;
  return true;
}

/**
 * Merge CVR data with existing company data, only overwriting fields where CVR has non-empty values
 * This ensures that manually added data (like website) is not overwritten with empty values from CVR
 * @param existingCompany - Current company data from database
 * @param cvrData - CVR API response data
 * @returns Merged company data object with only non-empty CVR values overwriting existing data
 */
export function mergeCvrWithExistingCompany(
  existingCompany: {
    name?: string | null;
    vat?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
    industry?: string | null;
    website?: string | null;
    cvrStatus?: string | null;
    legalType?: string | null;
    commercialProtected?: boolean | null;
    industryCode?: string | null;
    monthlyEmployment?: Record<string, any> | null;
    employeeCount?: number | null;
  },
  cvrData: CvrResponse
): Partial<{
  name: string;
  vat: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  country: string | null;
  industry: string | null;
  website: string | null;
  cvrStatus: string | null;
  legalType: string | null;
  commercialProtected: boolean | null;
  industryCode: string | null;
  monthlyEmployment: Record<string, any> | null;
  employeeCount: number | null;
}> {
  const mappedCvr = mapCvrToCompanyData(cvrData);
  const merged: any = {};

  // Always update name and vat from CVR (these are core identifiers)
  if (isNonEmpty(mappedCvr.name)) merged.name = mappedCvr.name;
  if (isNonEmpty(mappedCvr.vat)) merged.vat = mappedCvr.vat;

  // For all other fields, only overwrite if CVR has a non-empty value
  // This preserves manually added data when CVR doesn't have that information
  const fieldsToMerge: Array<keyof typeof mappedCvr> = [
    'email',
    'phone',
    'address',
    'city',
    'zip',
    'country',
    'industry',
    'website',
    'cvrStatus',
    'legalType',
    'commercialProtected',
    'industryCode',
    'monthlyEmployment',
    'employeeCount',
  ];

  for (const field of fieldsToMerge) {
    const cvrValue = mappedCvr[field];
    const existingValue = existingCompany[field];

    // Only include field in update if CVR has a non-empty value
    // This means:
    // - If CVR has a value, use it (overwrites existing)
    // - If CVR is null/empty, don't include it (preserves existing)
    if (isNonEmpty(cvrValue)) {
      merged[field] = cvrValue;
    }
    // If CVR value is empty, we don't add it to merged object, so existing value is preserved
  }

  return merged;
}

