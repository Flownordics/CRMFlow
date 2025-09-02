import { generatePDF as generatePDFFromService, getPdfUrl } from "@/services/PDFService";
import { logActivity } from "@/services/activity";
import { toastBus } from "@/lib/toastBus";

// PDF types
export type PDFType = 'quote' | 'order' | 'invoice';

// Generate PDF for quote
export async function generateQuotePdf(quoteId: string): Promise<{ url: string }> {
    try {
        await generatePDFFromService('quote', quoteId);

        // Track activity
        try {
            await logActivity({
                type: "pdf_generated",
                dealId: null,
                meta: { entity: { type: 'quote', id: quoteId } }
            });
        } catch (activityError) {
            console.warn('Failed to log PDF generation activity:', activityError);
        }

        return { url: 'success' }; // The service handles opening the PDF
    } catch (error) {
        console.error('Failed to generate quote PDF:', error);
        throw error;
    }
}

// Generate PDF for order
export async function generateOrderPdf(orderId: string): Promise<{ url: string }> {
    try {
        await generatePDFFromService('order', orderId);

        // Track activity
        try {
            await logActivity({
                type: "pdf_generated",
                dealId: null,
                meta: { entity: { type: 'order', id: orderId } }
            });
        } catch (activityError) {
            console.warn('Failed to log PDF generation activity:', activityError);
        }

        return { url: 'success' }; // The service handles opening the PDF
    } catch (error) {
        console.error('Failed to generate order PDF:', error);
        throw error;
    }
}

// Generate PDF for invoice
export async function generateInvoicePdf(invoiceId: string): Promise<{ url: string }> {
    try {
        await generatePDFFromService('invoice', invoiceId);

        // Track activity
        try {
            await logActivity({
                type: "pdf_generated",
                dealId: null,
                meta: { entity: { type: 'invoice', id: invoiceId } }
            });
        } catch (activityError) {
            console.warn('Failed to log PDF generation activity:', activityError);
        }

        return { url: 'success' }; // The service handles opening the PDF
    } catch (error) {
        console.error('Failed to generate invoice PDF:', error);
        throw error;
    }
}

// Helper function to open PDF (used internally by the service)
export function openPdf(url: string, filename?: string): void {
    try {
        // Try to open in new tab
        const newWindow = window.open(url, '_blank');

        if (!newWindow) {
            // Fallback: download the PDF
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'document.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Failed to open PDF:', error);
        throw error;
    }
}

// Get PDF URL for quote
export async function getQuotePdfUrl(quoteId: string): Promise<string> {
    try {
        const pdfResponse = await getPdfUrl('quote', quoteId);
        return pdfResponse.url;
    } catch (error) {
        console.error('Failed to get quote PDF URL:', error);
        throw error;
    }
}

// Get PDF URL for order
export async function getOrderPdfUrl(orderId: string): Promise<string> {
    try {
        const pdfResponse = await getPdfUrl('order', orderId);
        return pdfResponse.url;
    } catch (error) {
        console.error('Failed to get order PDF URL:', error);
        throw error;
    }
}

// Get PDF URL for invoice
export async function getInvoicePdfUrl(invoiceId: string): Promise<string> {
    try {
        const pdfResponse = await getPdfUrl('invoice', invoiceId);
        return pdfResponse.url;
    } catch (error) {
        console.error('Failed to get invoice PDF URL:', error);
        throw error;
    }
}

// Re-export the original functions for backward compatibility
export { generatePDF, downloadPDF } from "@/services/PDFService";
