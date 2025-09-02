import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deriveInvoiceStatus, addPayment } from '../invoices';
import { Invoice } from '../invoices';
import { apiClient } from '@/lib/api';
import { logActivity } from '../activity';

// Mock the API client
vi.mock('@/lib/api', () => ({
    apiClient: {
        get: vi.fn(),
        patch: vi.fn(),
    },
}));

// Mock the activity service
vi.mock('../activity', () => ({
    logActivity: vi.fn(),
}));

describe('Invoice Payment Functions', () => {
    const mockInvoice: Invoice = {
        id: 'test-invoice-1',
        number: 'INV-2024-001',
        status: 'sent',
        currency: 'DKK',
        issue_date: '2024-01-01',
        due_date: '2030-12-31', // Far future date to avoid overdue
        notes: 'Test invoice',
        company_id: 'company-1',
        contact_id: 'contact-1',
        deal_id: 'deal-1',
        subtotal_minor: 10000,
        tax_minor: 2500,
        total_minor: 12500,
        paid_minor: 0,
        balance_minor: 12500,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
    };

    describe('deriveInvoiceStatus', () => {
        it('should return "paid" when balance_minor is 0', () => {
            const paidInvoice = { ...mockInvoice, paid_minor: 12500, balance_minor: 0 };
            expect(deriveInvoiceStatus(paidInvoice)).toBe('paid');
        });

        it('should return "overdue" when due_date is past and balance_minor > 0', () => {
            const overdueInvoice = {
                ...mockInvoice,
                due_date: '2024-01-01', // Past date
                paid_minor: 5000,
                balance_minor: 7500
            };
            expect(deriveInvoiceStatus(overdueInvoice)).toBe('overdue');
        });

        it('should return "partial" when paid_minor > 0 but balance_minor > 0', () => {
            const partialInvoice = {
                ...mockInvoice,
                due_date: '2030-12-31', // Far future date to avoid overdue
                paid_minor: 5000,
                balance_minor: 7500
            };
            expect(deriveInvoiceStatus(partialInvoice)).toBe('partial');
        });

        it('should return "draft" when status is draft', () => {
            const draftInvoice = {
                ...mockInvoice,
                due_date: '2030-12-31', // Far future date to avoid overdue
                status: 'draft'
            };
            expect(deriveInvoiceStatus(draftInvoice)).toBe('draft');
        });

        it('should return "sent" when no other conditions are met', () => {
            const sentInvoice = {
                ...mockInvoice,
                due_date: '2030-12-31' // Far future date to avoid overdue
            };
            expect(deriveInvoiceStatus(sentInvoice)).toBe('sent');
        });

        it('should handle null due_date gracefully', () => {
            const invoiceWithoutDueDate = { ...mockInvoice, due_date: null };
            expect(deriveInvoiceStatus(invoiceWithoutDueDate)).toBe('sent');
        });
    });

    describe('addPayment', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it('should increment paid_minor and log activity', async () => {
            const paymentAmount = 5000; // 50.00 DKK
            const updatedInvoice = {
                ...mockInvoice,
                paid_minor: 5000,
                balance_minor: 7500
            };

            // Mock API responses
            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockInvoice });
            vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedInvoice });
            vi.mocked(logActivity).mockResolvedValueOnce({});

            const payload = {
                amountMinor: paymentAmount,
                date: '2024-01-15',
                method: 'bank' as const,
                note: 'Test payment'
            };

            const result = await addPayment('test-invoice-1', payload);

            // Verify API calls
            expect(vi.mocked(apiClient.get)).toHaveBeenCalledWith('/invoices/test-invoice-1');
            expect(vi.mocked(apiClient.patch)).toHaveBeenCalledWith('/invoices/test-invoice-1', {
                paid_minor: mockInvoice.paid_minor + paymentAmount
            });

            // Verify activity logging
            expect(vi.mocked(logActivity)).toHaveBeenCalledWith({
                type: 'payment_recorded',
                dealId: mockInvoice.deal_id,
                meta: {
                    invoiceId: 'test-invoice-1',
                    amountMinor: paymentAmount,
                    date: '2024-01-15',
                    method: 'bank',
                    note: 'Test payment'
                }
            });

            expect(result).toEqual(updatedInvoice);
        });

        it('should handle invoices without deal_id', async () => {
            const invoiceWithoutDeal = { ...mockInvoice, deal_id: null };
            const updatedInvoice = {
                ...invoiceWithoutDeal,
                paid_minor: 5000,
                balance_minor: 7500
            };

            vi.mocked(apiClient.get).mockResolvedValueOnce({ data: invoiceWithoutDeal });
            vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: updatedInvoice });

            const payload = {
                amountMinor: 5000,
                date: '2024-01-15',
                method: 'bank' as const
            };

            const result = await addPayment('test-invoice-1', payload);

            // Should not log activity when no deal_id
            expect(vi.mocked(logActivity)).not.toHaveBeenCalled();
            expect(result).toEqual(updatedInvoice);
        });

        it('should throw error on API failure', async () => {
            vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('API Error'));

            const payload = {
                amountMinor: 5000,
                date: '2024-01-15',
                method: 'bank' as const
            };

            await expect(addPayment('test-invoice-1', payload)).rejects.toThrow('Failed to add payment');
        });
    });
});
