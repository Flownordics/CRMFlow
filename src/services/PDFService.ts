import { USE_MOCKS } from "@/lib/debug";
import { toastBus } from "@/lib/toastBus";
import { logger } from '@/lib/logger';

// PDF types
export type PDFType = 'quote' | 'order' | 'invoice';

// PDF response with blob URL
export interface PDFResponse {
  url: string;
  filename: string;
  blob?: Blob;
}

// Get PDF URL for a document
export async function getPdfUrl(type: PDFType, id: string): Promise<PDFResponse> {
  if (USE_MOCKS) {
    // Mock PDF response
    const mockBlob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
    const url = URL.createObjectURL(mockBlob);

    return {
      url,
      filename: `${type}-${id}.pdf`,
      blob: mockBlob
    };
  }

  try {
    // Call the Netlify Function for PDF generation (React PDF)
    const response = await fetch('/.netlify/functions/pdf-react', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data: { id } })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Log detailed error information
      logger.error('PDF Function Error', {
        status: response.status,
        statusText: response.statusText,
        error: errorData.error,
        details: errorData.details,
        errorType: errorData.errorType,
        isChromiumError: errorData.isChromiumError,
        hint: errorData.hint,
        stack: errorData.stack,
        type,
        id
      });
      
      // Build user-friendly error message
      let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      if (errorData.details) {
        errorMessage += ` - ${errorData.details}`;
      }
      if (errorData.hint) {
        errorMessage += ` (${errorData.hint})`;
      }
      
      // Special handling for 502 Bad Gateway (likely timeout or crash)
      if (response.status === 502) {
        errorMessage = 'PDF generation timed out or crashed. Please check Netlify function logs for details.';
      }
      
      throw new Error(errorMessage);
    }

    // Parse JSON response (new format)
    const responseData = await response.json();
    logger.debug('PDF response received:', {
      success: responseData.success,
      size: responseData.size,
      filename: responseData.filename,
      hasPdfField: !!responseData.pdf,
      pdfFieldType: typeof responseData.pdf,
      pdfFieldLength: responseData.pdf?.length
    });

    if (!responseData.success || !responseData.pdf) {
      logger.error('Invalid PDF response structure:', {
        success: responseData.success,
        hasPdf: !!responseData.pdf,
        responseKeys: Object.keys(responseData)
      });
      throw new Error('Invalid PDF response from server');
    }

    // Decode base64 PDF data with better error handling
    const base64Data = responseData.pdf;
    
    // Validate base64 string before decoding
    if (typeof base64Data !== 'string') {
      logger.error('PDF data is not a string:', typeof base64Data);
      throw new Error('PDF data is not in expected format');
    }
    
    // Check if it looks like base64 (basic validation)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64Data)) {
      logger.error('PDF data does not look like valid base64:', {
        length: base64Data.length,
        firstChars: base64Data.substring(0, 50),
        lastChars: base64Data.substring(base64Data.length - 50)
      });
      throw new Error('PDF data is not valid base64 format');
    }
    
    logger.debug('Decoding base64 data, length:', base64Data.length);
    
    let binaryString;
    try {
      binaryString = atob(base64Data);
    } catch (atobError) {
      logger.error('Failed to decode base64:', {
        error: atobError,
        base64Length: base64Data.length,
        base64Sample: base64Data.substring(0, 100) + '...'
      });
      throw new Error(`Failed to decode PDF data: ${atobError instanceof Error ? atobError.message : 'Unknown error'}`);
    }
    
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    logger.debug('PDF blob created, size:', blob.size);

    // Use filename from response
    const filename = responseData.filename || `${type}-${id}.pdf`;

    return {
      url,
      filename,
      blob
    };
  } catch (error) {
    logger.error(`Failed to get PDF for ${type} ${id}:`, error);
    throw new Error(`Failed to get PDF for ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate and open PDF in new tab
export async function generatePDF(type: PDFType, id: string): Promise<void> {
  try {
    const pdfResponse = await getPdfUrl(type, id);

    // Open PDF in new tab
    const newWindow = window.open(pdfResponse.url, '_blank');

    if (!newWindow) {
      // Fallback: download the PDF
      const link = document.createElement('a');
      link.href = pdfResponse.url;
      link.download = pdfResponse.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Clean up blob URL after a delay to allow the window to open
    setTimeout(() => {
      URL.revokeObjectURL(pdfResponse.url);
    }, 1000);

    toastBus.emit({
      title: "PDF Generated",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} PDF has been generated successfully.`,
      variant: "success"
    });

  } catch (error) {
    logger.error(`Failed to generate PDF for ${type} ${id}:`, error);

    toastBus.emit({
      title: "PDF Generation Failed",
      description: error instanceof Error ? error.message : `Failed to generate ${type} PDF`,
      variant: "destructive"
    });
  }
}

// Download PDF directly
export async function downloadPDF(type: PDFType, id: string): Promise<void> {
  try {
    const pdfResponse = await getPdfUrl(type, id);

    // Create download link
    const link = document.createElement('a');
    link.href = pdfResponse.url;
    link.download = pdfResponse.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL
    setTimeout(() => {
      URL.revokeObjectURL(pdfResponse.url);
    }, 1000);

    toastBus.emit({
      title: "PDF Downloaded",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} PDF has been downloaded.`,
      variant: "success"
    });

  } catch (error) {
    logger.error(`Failed to download PDF for ${type} ${id}:`, error);

    toastBus.emit({
      title: "PDF Download Failed",
      description: error instanceof Error ? error.message : `Failed to download ${type} PDF`,
      variant: "destructive"
    });
  }
}

// Clean up blob URLs when component unmounts or window closes
export function cleanupPDFUrls(): void {
  // This function can be called to clean up any remaining blob URLs
  // In a real app, you might want to track URLs and clean them up systematically
}

// Set up cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupPDFUrls);
}
