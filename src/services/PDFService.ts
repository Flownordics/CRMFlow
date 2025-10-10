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
    // Call the Netlify Function for PDF generation (HTML-to-PDF with Puppeteer)
    const response = await fetch('/.netlify/functions/pdf-html', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, data: { id } })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle base64 encoded response from Netlify Functions
    let blob;
    if (response.headers.get('content-type') === 'application/pdf') {
      // Direct PDF response
      blob = await response.blob();
    } else {
      // Base64 encoded response
      const base64Data = await response.text();
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'application/pdf' });
    }
    const url = URL.createObjectURL(blob);

    // Extract filename from Content-Disposition header or generate default
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `${type}-${id}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

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
