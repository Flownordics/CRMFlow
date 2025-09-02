import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuotePdf, generateOrderPdf, generateInvoicePdf } from '../pdf';
import { generatePDF as generatePDFFromService } from '../PDFService';
import { logActivity } from '../activity';

// Mock the PDF service
vi.mock('../PDFService', () => ({
    generatePDF: vi.fn(),
    downloadPDF: vi.fn(),
}));

// Mock the activity service
vi.mock('../activity', () => ({
    logActivity: vi.fn(),
}));

describe('PDF Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateQuotePdf', () => {
        it('should generate PDF for quote and log activity', async () => {
            const mockGeneratePDF = vi.mocked(generatePDFFromService);
            const mockLogActivity = vi.mocked(logActivity);

            mockGeneratePDF.mockResolvedValue(undefined);
            mockLogActivity.mockResolvedValue({
                id: 'test-id',
                type: 'pdf_generated',
                dealId: null,
                userId: null,
                meta: { entity: { type: 'quote', id: 'quote-123' } },
                createdAt: '2024-01-01T00:00:00Z'
            });

            const result = await generateQuotePdf('quote-123');

            expect(mockGeneratePDF).toHaveBeenCalledWith('quote', 'quote-123');
            expect(mockLogActivity).toHaveBeenCalledWith({
                type: 'pdf_generated',
                dealId: null,
                meta: { entity: { type: 'quote', id: 'quote-123' } }
            });
            expect(result).toEqual({ url: 'success' });
        });

        it('should handle errors gracefully', async () => {
            const mockGeneratePDF = vi.mocked(generatePDFFromService);
            mockGeneratePDF.mockRejectedValue(new Error('PDF generation failed'));

            await expect(generateQuotePdf('quote-123')).rejects.toThrow('PDF generation failed');
        });
    });

    describe('generateOrderPdf', () => {
        it('should generate PDF for order and log activity', async () => {
            const mockGeneratePDF = vi.mocked(generatePDFFromService);
            const mockLogActivity = vi.mocked(logActivity);

            mockGeneratePDF.mockResolvedValue(undefined);
            mockLogActivity.mockResolvedValue({
                id: 'test-id',
                type: 'pdf_generated',
                dealId: null,
                userId: null,
                meta: { entity: { type: 'order', id: 'order-123' } },
                createdAt: '2024-01-01T00:00:00Z'
            });

            const result = await generateOrderPdf('order-123');

            expect(mockGeneratePDF).toHaveBeenCalledWith('order', 'order-123');
            expect(mockLogActivity).toHaveBeenCalledWith({
                type: 'pdf_generated',
                dealId: null,
                meta: { entity: { type: 'order', id: 'order-123' } }
            });
            expect(result).toEqual({ url: 'success' });
        });
    });

    describe('generateInvoicePdf', () => {
        it('should generate PDF for invoice and log activity', async () => {
            const mockGeneratePDF = vi.mocked(generatePDFFromService);
            const mockLogActivity = vi.mocked(logActivity);

            mockGeneratePDF.mockResolvedValue(undefined);
            mockLogActivity.mockResolvedValue({
                id: 'test-id',
                type: 'pdf_generated',
                dealId: null,
                userId: null,
                meta: { entity: { type: 'invoice', id: 'invoice-123' } },
                createdAt: '2024-01-01T00:00:00Z'
            });

            const result = await generateInvoicePdf('invoice-123');

            expect(mockGeneratePDF).toHaveBeenCalledWith('invoice', 'invoice-123');
            expect(mockLogActivity).toHaveBeenCalledWith({
                type: 'pdf_generated',
                dealId: null,
                meta: { entity: { type: 'invoice', id: 'invoice-123' } }
            });
            expect(result).toEqual({ url: 'success' });
        });
    });
});
