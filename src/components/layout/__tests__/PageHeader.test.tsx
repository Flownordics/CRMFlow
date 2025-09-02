import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "../PageHeader";

describe("PageHeader", () => {
  it("renders title correctly", () => {
    render(<PageHeader title="Test Page Title" />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Test Page Title")).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    const actions = <button>Test Action</button>;
    render(<PageHeader title="Test Page" actions={actions} />);

    expect(
      screen.getByRole("button", { name: "Test Action" }),
    ).toBeInTheDocument();
  });

  it("does not render actions when not provided", () => {
    render(<PageHeader title="Test Page" />);

    const actionsContainer = screen
      .getByRole("heading", { level: 1 })
      .parentElement?.querySelector("div:last-child");
    expect(actionsContainer?.children.length).toBe(0);
  });

  it("applies correct CSS classes", () => {
    render(<PageHeader title="Test Page" />);

    const header = screen.getByRole("heading", { level: 1 }).parentElement;
    expect(header).toHaveClass(
      "flex",
      "items-center",
      "justify-between",
      "mb-2",
    );

    const title = screen.getByRole("heading", { level: 1 });
    expect(title).toHaveClass("text-h1");
  });

  it("renders multiple actions correctly", () => {
    const actions = (
      <>
        <button>Action 1</button>
        <button>Action 2</button>
      </>
    );
    render(<PageHeader title="Test Page" actions={actions} />);

    expect(
      screen.getByRole("button", { name: "Action 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Action 2" }),
    ).toBeInTheDocument();
  });
});
