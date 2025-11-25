/**
 * Service for downloading and storing company logos in Supabase Storage
 * This avoids calling Clearbit on every page load and prevents ad-blocker issues
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { getCompanyLogoUrl, extractDomain } from "@/lib/companyLogo";

const LOGO_BUCKET = "company-logos";
const LOGO_FOLDER = "logos";

/**
 * Deletes all existing logos for a company from storage
 * @param companyId - Company ID
 */
async function deleteCompanyLogos(companyId: string): Promise<void> {
  try {
    // List all files in the logos folder
    const { data: files, error: listError } = await supabase.storage
      .from(LOGO_BUCKET)
      .list(LOGO_FOLDER);

    if (listError) {
      logger.warn("Failed to list logo files for cleanup", {
        error: listError,
        companyId,
      }, 'CompanyLogoStorage');
      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    // Find all files that belong to this company (filename starts with company ID)
    const companyLogoFiles = files.filter(file => 
      file.name.startsWith(`${companyId}.`)
    );

    if (companyLogoFiles.length === 0) {
      return;
    }

    // Delete all company logos
    const pathsToDelete = companyLogoFiles.map(file => `${LOGO_FOLDER}/${file.name}`);
    const { error: deleteError } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove(pathsToDelete);

    if (deleteError) {
      logger.warn("Failed to delete old company logos", {
        error: deleteError,
        companyId,
        paths: pathsToDelete,
      }, 'CompanyLogoStorage');
    } else if (companyLogoFiles.length > 0) {
      logger.info("Deleted old company logos", {
        companyId,
        count: companyLogoFiles.length,
      }, 'CompanyLogoStorage');
    }
  } catch (error) {
    logger.error("Error deleting company logos", {
      error,
      companyId,
    }, 'CompanyLogoStorage');
  }
}

/**
 * Downloads a logo from Clearbit and uploads it to Supabase Storage
 * Ensures only one logo exists per company by using company ID in filename
 * @param clearbitUrl - Clearbit logo URL
 * @param companyId - Company ID for naming (ensures uniqueness)
 * @param domain - Company domain (for logging purposes)
 * @returns Public URL to the stored logo, or null if upload fails
 */
export async function downloadAndStoreLogo(
  clearbitUrl: string,
  companyId: string,
  domain: string
): Promise<string | null> {
  try {
    // Ensure bucket exists (this should be done in migration, but we check anyway)
    await ensureBucketExists();

    // Delete any existing logos for this company to prevent duplicates
    await deleteCompanyLogos(companyId);

    // Download logo from Clearbit
    const response = await fetch(clearbitUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      logger.warn("Failed to download logo from Clearbit", {
        url: clearbitUrl,
        status: response.status,
      }, 'CompanyLogoStorage');
      return null;
    }

    // Get image as blob
    const blob = await response.blob();
    
    // Determine file extension from content type or default to png
    const contentType = response.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('svg') ? 'svg' : 
                     contentType.includes('webp') ? 'webp' : 
                     contentType.includes('jpg') || contentType.includes('jpeg') ? 'jpg' : 'png';
    
    // Create filename: companyId.extension (ensures one logo per company)
    const fileName = `${companyId}.${extension}`;
    const filePath = `${LOGO_FOLDER}/${fileName}`;

    // Upload to Supabase Storage (upsert: true to overwrite if somehow it exists)
    const { data, error } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(filePath, blob, {
        contentType: contentType,
        upsert: true, // Overwrite if exists (shouldn't happen after delete, but safety net)
        cacheControl: '3600', // Cache for 1 hour
      });

    if (error) {
      logger.error("Failed to upload logo to storage", {
        error,
        filePath,
        companyId,
      }, 'CompanyLogoStorage');
      return null;
    }

    // Get public URL
    return getPublicUrl(filePath);
  } catch (error) {
    logger.error("Error downloading and storing logo", {
      error,
      clearbitUrl,
      companyId,
    }, 'CompanyLogoStorage');
    return null;
  }
}

/**
 * Gets the public URL for a logo stored in Supabase Storage
 * @param filePath - Path to the file in storage
 * @returns Public URL
 */
function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Ensures the company-logos bucket exists
 */
async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      logger.error("Failed to list buckets", { error: listError }, 'CompanyLogoStorage');
      return;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === LOGO_BUCKET);
    
    if (!bucketExists) {
      // Try to create bucket (requires admin privileges)
      const { error: createError } = await supabase.storage.createBucket(LOGO_BUCKET, {
        public: true, // Make bucket public so logos can be accessed without auth
        fileSizeLimit: 1024 * 1024, // 1MB limit for logos
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'],
      });

      if (createError) {
        logger.warn("Failed to create logo bucket (may need to be created manually)", {
          error: createError,
        }, 'CompanyLogoStorage');
      }
    }
  } catch (error) {
    logger.error("Error ensuring bucket exists", { error }, 'CompanyLogoStorage');
  }
}

/**
 * Fetches and stores a company logo if it doesn't already exist in storage
 * @param website - Company website URL
 * @param email - Company email
 * @param companyId - Company ID
 * @returns Public URL to stored logo, or null if not available
 */
export async function fetchAndStoreCompanyLogo(
  website: string | null | undefined,
  email: string | null | undefined,
  companyId: string
): Promise<string | null> {
  // Get Clearbit URL
  const clearbitUrl = getCompanyLogoUrl(website, email);
  
  if (!clearbitUrl) {
    return null;
  }

  // Extract domain for naming
  const domain = extractDomain(website || email || '') || 'unknown';
  
  // Download and store logo
  return await downloadAndStoreLogo(clearbitUrl, companyId, domain);
}

/**
 * Deletes a logo from storage by company ID
 * This is the preferred method as it ensures all logos for a company are deleted
 * @param companyId - Company ID
 */
export async function deleteStoredLogoByCompanyId(companyId: string): Promise<void> {
  await deleteCompanyLogos(companyId);
}

/**
 * Deletes a logo from storage by URL (useful when company is deleted or logo is updated)
 * @param logoUrl - Public URL of the logo to delete
 */
export async function deleteStoredLogo(logoUrl: string): Promise<void> {
  try {
    // Extract file path from public URL
    const url = new URL(logoUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === LOGO_BUCKET);
    
    if (bucketIndex === -1) {
      // Not a storage URL, skip
      return;
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    
    const { error } = await supabase.storage
      .from(LOGO_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.warn("Failed to delete logo from storage", {
        error,
        filePath,
      }, 'CompanyLogoStorage');
    }
  } catch (error) {
    logger.error("Error deleting stored logo", {
      error,
      logoUrl,
    }, 'CompanyLogoStorage');
  }
}

