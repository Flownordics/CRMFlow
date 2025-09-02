import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DataTable } from "../DataTable";

describe("DataTable", () => {
  const mockColumns = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (row: any) => row.name,
      meta: { sortable: true }
    },
    {
      header: "Email",
      accessorKey: "email", 
      cell: (row: any) => row.email
    }
  ];

  const mockData = [
    { name: "John Doe", email: "john@example.com" },
    { name: "Jane Smith", email: "jane@example.com" }
  ];

  it("renders data correctly", () => {
    render(
      <DataTable columns={mockColumns} data={mockData} />
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("renders toolbar when provided", () => {
    const toolbar = <div data-testid="toolbar">Toolbar Content</div>;
    render(
      <DataTable columns={mockColumns} data={mockData} toolbar={toolbar} />
    );

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByText("Toolbar Content")).toBeInTheDocument();
  });

  it("does not render toolbar when not provided", () => {
    render(
      <DataTable columns={mockColumns} data={mockData} />
    );

    // The toolbar div should not exist when toolbar prop is not provided
    const container = screen.getByText("John Doe").closest(".rounded-2xl");
    const toolbarDiv = container?.querySelector("div:first-child");
    expect(toolbarDiv?.className).not.toContain("border-b");
  });

  it("applies correct CSS classes to container", () => {
    render(
      <DataTable columns={mockColumns} data={mockData} />
    );

    const container = screen.getByText("John Doe").closest(".rounded-2xl");
    expect(container).toHaveClass(
      "rounded-2xl",
      "border",
      "bg-background",
      "shadow-card",
    );
  });

  it("applies correct CSS classes to content area", () => {
    render(
      <DataTable columns={mockColumns} data={mockData} />
    );

    const contentArea = screen.getByText("John Doe").closest(".overflow-auto");
    expect(contentArea).toHaveClass("overflow-auto");
  });

  it("renders complex toolbar with multiple elements", () => {
    const toolbar = (
      <div data-testid="toolbar">
        <input placeholder="Search" />
        <button>Filter</button>
        <button>Export</button>
      </div>
    );
    render(
      <DataTable columns={mockColumns} data={mockData} toolbar={toolbar} />
    );

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});
