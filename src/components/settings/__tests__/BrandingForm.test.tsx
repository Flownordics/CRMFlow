import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrandingForm } from "../BrandingForm";
import { useUpdateWorkspaceSettings } from "@/hooks/useSettings";
import { vi } from "vitest";

// Mock the hooks
vi.mock("@/hooks/useSettings", () => ({
    useUpdateWorkspaceSettings: vi.fn(),
}));

const mockUpdateSettings = vi.fn();

describe("BrandingForm", () => {
    const mockSettings = {
        id: "test-id",
        org_name: "Test Company",
        logo_url: "https://example.com/logo.png",
        pdf_footer: "Test footer",
        color_primary: null,
        quote_prefix: "QUOTE",
        order_prefix: "ORDER",
        invoice_prefix: "INV",
        pad: 4,
        year_infix: true,
        default_currency: "DKK" as const,
        default_tax_pct: 25,
        updated_at: "2024-01-01T00:00:00Z",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useUpdateWorkspaceSettings as any).mockReturnValue({
            mutateAsync: mockUpdateSettings,
            isPending: false,
        });
    });

    it("renders in view mode initially", () => {
        render(<BrandingForm settings={mockSettings} />);

        expect(screen.getByText("Branding")).toBeInTheDocument();
        expect(screen.getByText("Test Company")).toBeInTheDocument();
        expect(screen.getByText("https://example.com/logo.png")).toBeInTheDocument();
        expect(screen.getByText("Test footer")).toBeInTheDocument();
        expect(screen.getByText("Edit")).toBeInTheDocument();
    });

    it("switches to edit mode when Edit button is clicked", () => {
        render(<BrandingForm settings={mockSettings} />);

        fireEvent.click(screen.getByText("Edit"));

        expect(screen.getByDisplayValue("Test Company")).toBeInTheDocument();
        expect(screen.getByDisplayValue("https://example.com/logo.png")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Test footer")).toBeInTheDocument();
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
        expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("submits form data when Save Changes is clicked", async () => {
        mockUpdateSettings.mockResolvedValueOnce(mockSettings);

        render(<BrandingForm settings={mockSettings} />);

        fireEvent.click(screen.getByText("Edit"));
        fireEvent.click(screen.getByText("Save Changes"));

        await waitFor(() => {
            expect(mockUpdateSettings).toHaveBeenCalledWith({
                org_name: "Test Company",
                logo_url: "https://example.com/logo.png",
                pdf_footer: "Test footer",
            });
        });
    });

    it("cancels editing and reverts to view mode", () => {
        render(<BrandingForm settings={mockSettings} />);

        fireEvent.click(screen.getByText("Edit"));
        fireEvent.change(screen.getByDisplayValue("Test Company"), {
            target: { value: "Changed Company" },
        });
        fireEvent.click(screen.getByText("Cancel"));

        expect(screen.getByText("Test Company")).toBeInTheDocument();
        expect(screen.queryByText("Save Changes")).not.toBeInTheDocument();
    });

    it("handles empty settings gracefully", () => {
        render(<BrandingForm settings={null} />);

        expect(screen.getAllByText("Not set")).toHaveLength(3);
        expect(screen.getByText("Edit")).toBeInTheDocument();
    });
});
