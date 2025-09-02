import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OpenPdfButton } from '../OpenPdfButton';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
    value: mockWindowOpen,
    writable: true,
});

// Mock window.location
let mockLocationHref = '';
Object.defineProperty(window, 'location', {
    value: {
        get href() { return mockLocationHref; },
        set href(value) { mockLocationHref = value; }
    },
    writable: true,
});

describe('OpenPdfButton', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWindowOpen.mockReturnValue({});
        mockLocationHref = '';
    });

    it('renders with default props', () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');

        render(<OpenPdfButton onGetUrl={mockGetUrl} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('title', 'Generate PDF');
    });

    it('renders with custom label', () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');

        render(<OpenPdfButton onGetUrl={mockGetUrl} label="Download PDF" />);

        const button = screen.getByRole('button', { name: 'Download PDF' });
        expect(button).toBeInTheDocument();
        expect(button).toHaveAttribute('title', 'Download PDF');
    });

    it('shows loading state when clicked', async () => {
        const mockGetUrl = vi.fn().mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve('https://example.com/test.pdf'), 100))
        );

        render(<OpenPdfButton onGetUrl={mockGetUrl} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        fireEvent.click(button);

        // Should show loading state
        expect(screen.getByText('Generating…')).toBeInTheDocument();
        expect(button).toBeDisabled();

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.getByText('Generate PDF')).toBeInTheDocument();
        });
    });

    it('opens PDF in new tab when successful', async () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');
        const mockOnLogged = vi.fn();

        render(<OpenPdfButton onGetUrl={mockGetUrl} onLogged={mockOnLogged} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockWindowOpen).toHaveBeenCalledWith(
                'https://example.com/test.pdf',
                '_blank',
                'noopener,noreferrer'
            );
            expect(mockOnLogged).toHaveBeenCalledWith('https://example.com/test.pdf');
        });
    });

    it('falls back to same tab navigation when popup is blocked', async () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');
        mockWindowOpen.mockReturnValue(null); // Simulate popup blocker

        render(<OpenPdfButton onGetUrl={mockGetUrl} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockLocationHref).toBe('https://example.com/test.pdf');
        });
    });

    it('handles errors gracefully', async () => {
        const mockGetUrl = vi.fn().mockRejectedValue(new Error('PDF generation failed'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<OpenPdfButton onGetUrl={mockGetUrl} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        fireEvent.click(button);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('[PDF] Failed to open PDF', expect.any(Error));
            expect(screen.getByText('Generate PDF')).toBeInTheDocument(); // Button text should be back to normal
        });

        consoleSpy.mockRestore();
    });

    it('has proper accessibility attributes', () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');

        render(<OpenPdfButton onGetUrl={mockGetUrl} />);

        const button = screen.getByRole('button', { name: 'Generate PDF' });
        const icon = button.querySelector('svg');

        expect(button).toHaveAttribute('aria-label', 'Generate PDF');
        expect(button).toHaveAttribute('title', 'Generate PDF');
        expect(icon).toHaveAttribute('aria-hidden', 'true');
        expect(icon).toHaveAttribute('focusable', 'false');
    });

    it('supports different sizes', () => {
        const mockGetUrl = vi.fn().mockResolvedValue('https://example.com/test.pdf');

        const { rerender } = render(<OpenPdfButton onGetUrl={mockGetUrl} size="sm" />);
        expect(screen.getByRole('button')).toHaveClass('h-9'); // sm size class in shadcn

        rerender(<OpenPdfButton onGetUrl={mockGetUrl} size="lg" />);
        expect(screen.getByRole('button')).toHaveClass('h-11'); // lg size class
    });
});
