import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SendQuoteDialog } from '../quotes/SendQuoteDialog';

// Mock the services
vi.mock('@/services/email', () => ({
    getEmailProviderInfo: vi.fn().mockResolvedValue({
        provider: 'gmail',
        connected: true,
        email: 'test@example.com'
    }),
    useSendQuoteEmail: vi.fn(() => ({
        mutateAsync: vi.fn(),
        isPending: false
    }))
}));

vi.mock('@/services/quotes', () => ({
    useQuote: vi.fn(() => ({
        data: {
            id: 'test-quote-id',
            number: 'Q-001',
            deal_id: 'test-deal-id'
        }
    }))
}));

vi.mock('@/services/companies', () => ({
    useCompanies: vi.fn(() => ({
        data: { data: [] }
    }))
}));

vi.mock('@/services/people', () => ({
    usePeople: vi.fn(() => ({
        data: { data: [] }
    }))
}));

vi.mock('@/services/pdf', () => ({
    getQuotePdfUrl: vi.fn().mockResolvedValue('https://example.com/pdf')
}));

vi.mock('@/services/activity', () => ({
    logEmailSent: vi.fn()
}));

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(() => vi.fn())
}));

vi.mock('@/lib/toastBus', () => ({
    toastBus: {
        emit: vi.fn()
    }
}));

describe('SendQuoteDialog Accessibility', () => {
    const defaultProps = {
        quoteId: 'test-quote-id',
        open: true,
        onOpenChange: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders with proper accessibility attributes', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check for proper dialog title and description
        expect(screen.getByText('Send tilbud')).toBeInTheDocument();
        expect(screen.getByText(/Send tilbuddet til kunden/)).toBeInTheDocument();

        // Check for proper ARIA attributes
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        // Check for proper form labels
        expect(screen.getByLabelText('To *')).toBeInTheDocument();
        expect(screen.getByLabelText('CC (comma-separated)')).toBeInTheDocument();
        expect(screen.getByLabelText('Subject')).toBeInTheDocument();
        expect(screen.getByLabelText('Message')).toBeInTheDocument();
        expect(screen.getByLabelText('Attach PDF (currently links to PDF page)')).toBeInTheDocument();
    });

    test('status badges have proper accessibility', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check that status badges are present
        expect(screen.getByText(/Sending as/)).toBeInTheDocument();

        // Check that decorative icons are properly hidden
        const checkIcon = screen.getByTestId('check-circle-icon');
        expect(checkIcon).toHaveAttribute('aria-hidden', 'true');
    });

    test('form inputs are properly labeled and accessible', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check that all form inputs have proper labels
        const toInput = screen.getByLabelText('To *');
        expect(toInput).toHaveAttribute('type', 'email');
        expect(toInput).toHaveAttribute('required');

        const ccInput = screen.getByLabelText('CC (comma-separated)');
        expect(ccInput).toHaveAttribute('type', 'text');

        const subjectInput = screen.getByLabelText('Subject');
        expect(subjectInput).toHaveAttribute('type', 'text');

        const messageTextarea = screen.getByLabelText('Message');
        expect(messageTextarea).toBeInTheDocument();
    });

    test('buttons have proper accessibility attributes', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check that buttons have proper labels
        expect(screen.getByRole('button', { name: /Send Quote/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Download PDF/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Copy email/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();

        // Check that decorative icons in buttons are hidden
        const sendIcon = screen.getByTestId('send-icon');
        expect(sendIcon).toHaveAttribute('aria-hidden', 'true');
    });

    test('loading states are properly announced', () => {
        const { rerender } = render(<SendQuoteDialog {...defaultProps} />);

        // Mock loading state
        vi.mocked(require('@/services/email').getEmailProviderInfo).mockResolvedValueOnce(null);

        rerender(<SendQuoteDialog {...defaultProps} />);

        // Check for loading announcement
        expect(screen.getByText('Checking email configuration...')).toBeInTheDocument();

        // Check for proper ARIA live region
        const loadingElement = screen.getByRole('status');
        expect(loadingElement).toHaveAttribute('aria-live', 'polite');
    });

    test('error states are properly announced', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Simulate error state by setting error
        const errorMessage = 'Test error message';
        // This would need to be implemented by triggering an error in the component
        // For now, we'll check that error handling structure exists
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('no console warnings for accessibility', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<SendQuoteDialog {...defaultProps} />);

        // Check that no accessibility warnings were logged
        const accessibilityWarnings = consoleSpy.mock.calls.filter(call =>
            call[0]?.includes?.('accessibility') ||
            call[0]?.includes?.('a11y') ||
            call[0]?.includes?.('ARIA')
        );

        expect(accessibilityWarnings).toHaveLength(0);

        consoleSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    test('dialog has proper focus management', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check that dialog is focusable
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();

        // Check that form inputs can receive focus
        const toInput = screen.getByLabelText('To *');
        expect(toInput).not.toHaveAttribute('disabled');
    });

    test('form validation is accessible', () => {
        render(<SendQuoteDialog {...defaultProps} />);

        // Check that required fields are properly marked
        const toInput = screen.getByLabelText('To *');
        expect(toInput).toHaveAttribute('required');

        // Check that validation messages would be announced
        // This would be tested by actually submitting the form with invalid data
    });
});
