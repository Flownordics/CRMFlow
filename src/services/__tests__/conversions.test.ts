import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureOrderForQuote } from '../conversions';
import { apiClient } from '@/lib/api';
import { fetchQuote } from '../quotes';
import { createOrder } from '../orders';
import { logActivity } from '../activity';

// Mock dependencies
vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock('../quotes', () => ({
    fetchQuote: vi.fn(),
}));

vi.mock('../orders', () => ({
    createOrder: vi.fn(),
}));

vi.mock('../activity', () => ({
    logActivity: vi.fn(),
}));

describe('ensureOrderForQuote', () => {
    const mockQuoteId = 'quote-123';
    const mockOrderId = 'order-456';

    const mockQuote = {
        id: mockQuoteId,
        number: 'Q-2024-001',
        status: 'accepted',
        currency: 'DKK',
        company_id: 'company-123',
        contact_id: 'contact-123',
        deal_id: 'deal-123',
        notes: 'Test quote',
        subtotal_minor: 10000,
        tax_minor: 2500,
        total_minor: 12500,
        lines: [
            {
                id: 'line-1',
                description: 'Test product',
                qty: 2,
                unitMinor: 5000,
                taxRatePct: 25,
                discountPct: 0,
                sku: 'SKU123',
            },
        ],
    };

    const mockOrder = {
        id: mockOrderId,
        number: 'O-2024-001',
        status: 'draft',
        currency: 'DKK',
        company_id: 'company-123',
        contact_id: 'contact-123',
        deal_id: 'deal-123',
        quote_id: mockQuoteId,
        notes: 'Order created from quote Q-2024-001',
        subtotal_minor: 10000,
        tax_minor: 2500,
        total_minor: 12500,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return existing order if one already exists for the quote', async () => {
        // Mock existing order found
        (apiClient.get as any).mockResolvedValue({
            data: [{ id: mockOrderId }],
        });

        const result = await ensureOrderForQuote(mockQuoteId);

        expect(result).toEqual({ id: mockOrderId });
        expect(apiClient.get).toHaveBeenCalledWith(
            `/orders?quote_id=eq.${mockQuoteId}&select=id&limit=1`
        );
        expect(fetchQuote).not.toHaveBeenCalled();
        expect(createOrder).not.toHaveBeenCalled();
    });

    it('should create new order if none exists for the quote', async () => {
        // Mock no existing order
        (apiClient.get as any).mockResolvedValue({
            data: [],
        });

        // Mock quote fetch
        (fetchQuote as any).mockResolvedValue(mockQuote);

        // Mock order creation
        (createOrder as any).mockResolvedValue(mockOrder);

        // Mock activity logging
        (logActivity as any).mockResolvedValue({});

        const result = await ensureOrderForQuote(mockQuoteId);

        expect(result).toEqual({ id: mockOrderId });
        expect(fetchQuote).toHaveBeenCalledWith(mockQuoteId);
        expect(createOrder).toHaveBeenCalledWith({
            status: 'draft',
            currency: 'DKK',
            order_date: expect.any(String),
            notes: 'Test quote',
            company_id: 'company-123',
            contact_id: 'contact-123',
            deal_id: 'deal-123',
            quote_id: mockQuoteId,
            subtotal_minor: 10000,
            tax_minor: 2500,
            total_minor: 12500,
            lines: [
                {
                    description: 'Test product',
                    qty: 2,
                    unitMinor: 5000,
                    taxRatePct: 25,
                    discountPct: 0,
                    sku: 'SKU123',
                },
            ],
        });
        expect(logActivity).toHaveBeenCalledWith({
            type: 'order_created_from_quote',
            dealId: 'deal-123',
            meta: { quoteId: mockQuoteId, orderId: mockOrderId },
        });
    });

    it('should handle errors gracefully', async () => {
        // Mock no existing order
        (apiClient.get as any).mockResolvedValue({
            data: [],
        });

        // Mock quote fetch to fail
        (fetchQuote as any).mockRejectedValue(new Error('Quote not found'));

        await expect(ensureOrderForQuote(mockQuoteId)).rejects.toThrow(
            'Failed to create order from quote: Quote not found'
        );

        expect(fetchQuote).toHaveBeenCalledWith(mockQuoteId);
        expect(createOrder).not.toHaveBeenCalled();
    });

    it('should handle activity logging failures gracefully', async () => {
        // Mock no existing order
        (apiClient.get as any).mockResolvedValue({
            data: [],
        });

        // Mock quote fetch
        (fetchQuote as any).mockResolvedValue(mockQuote);

        // Mock order creation
        (createOrder as any).mockResolvedValue(mockOrder);

        // Mock activity logging to fail
        (logActivity as any).mockRejectedValue(new Error('Activity logging failed'));

        const result = await ensureOrderForQuote(mockQuoteId);

        // Should still succeed even if activity logging fails
        expect(result).toEqual({ id: mockOrderId });
        expect(createOrder).toHaveBeenCalled();
        expect(logActivity).toHaveBeenCalled();
    });
});
