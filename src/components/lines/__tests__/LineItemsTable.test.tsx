import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LineItemsTable } from "../LineItemsTable";

// Mock the money utilities
vi.mock("@/lib/money", () => ({
  computeLineTotals: vi.fn((params) => ({
    totalMinor: 12500, // Mock return value
  })),
  fromMinor: vi.fn((minor) => minor / 100),
  toMinor: vi.fn((amount) => Math.round(amount * 100)),
  formatMoneyMinor: vi.fn(
    (minor, currency) => `${(minor / 100).toFixed(2)} ${currency}`,
  ),
}));

describe("LineItemsTable", () => {
  const mockLines = [
    {
      id: "line-1",
      description: "Test Product",
      sku: "SKU001",
      qty: 2,
      unitMinor: 10000, // 100.00
      discountPct: 10,
      taxRatePct: 25,
    },
    {
      id: "line-2",
      description: "Another Product",
      sku: "SKU002",
      qty: 1,
      unitMinor: 5000, // 50.00
      discountPct: 0,
      taxRatePct: 25,
    },
  ];

  const defaultProps = {
    currency: "DKK",
    lines: mockLines,
    onPatch: vi.fn(),
    onDelete: vi.fn(),
  };

  it("renders table headers with custom labels", () => {
    const customLabels = {
      description: "Custom Description",
      sku: "Custom SKU",
      qty: "Custom Qty",
      unit: "Custom Unit",
      discount_pct: "Custom Discount %",
      tax_pct: "Custom Tax %",
      line_total: "Custom Line Total",
    };

    render(<LineItemsTable {...defaultProps} labels={customLabels} />);

    expect(screen.getByText("Custom Description")).toBeInTheDocument();
    expect(screen.getByText("Custom SKU")).toBeInTheDocument();
    expect(screen.getByText("Custom Qty")).toBeInTheDocument();
    expect(screen.getByText("Custom Unit")).toBeInTheDocument();
    expect(screen.getByText("Custom Discount %")).toBeInTheDocument();
    expect(screen.getByText("Custom Tax %")).toBeInTheDocument();
    expect(screen.getByText("Custom Line Total")).toBeInTheDocument();
  });

  it("renders all line items", () => {
    render(<LineItemsTable {...defaultProps} />);

    // Check that all expected values are present
    expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SKU001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Another Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SKU002")).toBeInTheDocument();

    // Check numeric values (there might be multiple inputs with same values)
    const qtyInputs = screen.getAllByDisplayValue("2");
    const unitInputs = screen.getAllByDisplayValue("100");
    const discountInputs = screen.getAllByDisplayValue("10");
    const taxInputs = screen.getAllByDisplayValue("25");

    expect(qtyInputs.length).toBeGreaterThan(0);
    expect(unitInputs.length).toBeGreaterThan(0);
    expect(discountInputs.length).toBeGreaterThan(0);
    expect(taxInputs.length).toBeGreaterThan(0);
  });

  it("calls onPatch when input values change", () => {
    const onPatch = vi.fn();
    render(<LineItemsTable {...defaultProps} onPatch={onPatch} />);

    const descriptionInput = screen.getByDisplayValue("Test Product");
    fireEvent.blur(descriptionInput, { target: { value: "Updated Product" } });

    expect(onPatch).toHaveBeenCalledWith("line-1", {
      description: "Updated Product",
    });
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<LineItemsTable {...defaultProps} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByLabelText("Delete line");
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith("line-1");
  });

  it("handles empty lines array", () => {
    render(<LineItemsTable {...defaultProps} lines={[]} />);

    // Should not crash and should render empty table body
    expect(screen.queryByDisplayValue("Test Product")).not.toBeInTheDocument();
  });

  it("handles null/undefined SKU values", () => {
    const linesWithNullSku = [
      {
        id: "line-1",
        description: "Test Product",
        sku: null,
        qty: 1,
        unitMinor: 10000,
        discountPct: 0,
        taxRatePct: 25,
      },
    ];

    render(<LineItemsTable {...defaultProps} lines={linesWithNullSku} />);

    const skuInput = screen.getByDisplayValue("");
    expect(skuInput).toBeInTheDocument();
  });
});
