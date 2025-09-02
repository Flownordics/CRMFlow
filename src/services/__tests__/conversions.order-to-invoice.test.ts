import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ensureInvoiceForOrder } from '../conversions';
import { apiClient } from '@/lib/api';
import { fetchOrder } from '../orders';
import { createInvoice } from '../invoices';
import { logActivity } from '../activity';

// Mock dependencies
vi.mock('@/lib/api');
vi.mock('../orders');
vi.mock('../invoices');
vi.mock('../activity');

const mockApiClient = vi.mocked(apiClient);
const mockFetchOrder = vi.mocked(fetchOrder);
const mockCreateInvoice = vi.mocked(createInvoice);
const mockLogActivity = vi.mocked(logActivity);

describe('ensureInvoiceForOrder', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return existing invoice if one already exists for the order', async () => {
        const orderId = 'order-123';
        const existingInvoice = { id: 'invoice-456' };

        mockApiClient.get.mockResolvedValue({
            data: [existingInvoice],
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
        });

        const result = await ensureInvoiceForOrder(orderId);

        expect(result).toEqual({ id: 'invoice-456' });
        expect(mockApiClient.get).toHaveBeenCalledWith(
            `/invoices?order_id=eq.${orderId}&select=id&limit=1`
        );
        expect(mockFetchOrder).not.toHaveBeenCalled();
        expect(mockCreateInvoice).not.toHaveBeenCalled();
    });

    it('should create new invoice if none exists for the order', async () => {
        const orderId = 'order-123';
        const order = {
            id: orderId,
            number: 'O-2024-001',
            currency: 'DKK',
            company_id: 'company-123',
            contact_id: 'contact-123',
            deal_id: 'deal-123',
            notes: 'Test order',
            subtotalMinor: 100000,
            taxMinor: 25000,
            totalMinor: 125000,
            lines: [
                {
                    id: 'line-1',
                    description: 'Test product',
                    qty: 1,
                    unitMinor: 100000,
                    taxRatePct: 25,
                    discountPct: 0,
                    sku: 'SKU-001',
                },
            ],
        };
        const createdInvoice = { id: 'invoice-789' };

        mockApiClient.get.mockResolvedValue({
            data: [],
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
        });

        mockFetchOrder.mockResolvedValue(order as any);
        mockCreateInvoice.mockResolvedValue(createdInvoice as any);
        mockLogActivity.mockResolvedValue(undefined);

        const result = await ensureInvoiceForOrder(orderId);

        expect(result).toEqual({ id: 'invoice-789' });
        expect(mockFetchOrder).toHaveBeenCalledWith(orderId);
        expect(mockCreateInvoice).toHaveBeenCalledWith({
            currency: 'DKK',
            issue_date: expect.any(String),
            due_date: expect.any(String),
            notes: 'Invoice created from order O-2024-001',
            company_id: 'company-123',
            contact_id: 'contact-123',
            deal_id: 'deal-123',
            order_id: orderId,
            subtotal_minor: 100000,
            tax_minor: 25000,
            total_minor: 125000,
            lines: [
                {
                    description: 'Test product',
                    qty: 1,
                    unitMinor: 100000,
                    taxRatePct: 25,
                    discountPct: 0,
                    sku: 'SKU-001',
                },
            ],
        });
        expect(mockLogActivity).toHaveBeenCalledWith({
            type: 'invoice_created_from_order',
            dealId: 'deal-123',
            meta: { orderId, invoiceId: 'invoice-789' },
        });
    });

    it('should handle errors gracefully', async () => {
        const orderId = 'order-123';

        mockApiClient.get.mockRejectedValue(new Error('API Error'));

        await expect(ensureInvoiceForOrder(orderId)).rejects.toThrow(
            'Failed to create invoice from order: API Error'
        );
    });

    it('should handle activity logging failures gracefully', async () => {
        const orderId = 'order-123';
        const order = {
            id: orderId,
            number: 'O-2024-001',
            currency: 'DKK',
            company_id: 'company-123',
            contact_id: null,
            deal_id: null,
            notes: 'Test order',
            subtotalMinor: 100000,
            taxMinor: 25000,
            totalMinor: 125000,
            lines: [],
        };
        const createdInvoice = { id: 'invoice-789' };

        mockApiClient.get.mockResolvedValue({
            data: [],
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {} as any,
        });

        mockFetchOrder.mockResolvedValue(order as any);
        mockCreateInvoice.mockResolvedValue(createdInvoice as any);
        mockLogActivity.mockRejectedValue(new Error('Activity logging failed'));

        const result = await ensureInvoiceForOrder(orderId);

        expect(result).toEqual({ id: 'invoice-789' });
        expect(mockLogActivity).toHaveBeenCalled();
    });
});
