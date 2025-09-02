import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description correctly", () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
      />,
    );

    expect(screen.getByText("No items found")).toBeInTheDocument();
    expect(
      screen.getByText("Try adding some items to get started"),
    ).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    const action = <button>Add Item</button>;
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
        action={action}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Add Item" }),
    ).toBeInTheDocument();
  });

  it("does not render action when not provided", () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
      />,
    );

    // Should not have any buttons
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
      />,
    );

    const container = screen.getByText("No items found").parentElement;
    expect(container).toHaveClass(
      "rounded-2xl",
      "border",
      "p-8",
      "text-center",
      "shadow-card",
    );
  });

  it("renders with complex action", () => {
    const action = (
      <div>
        <button>Primary Action</button>
        <button>Secondary Action</button>
      </div>
    );
    render(
      <EmptyState
        title="No items found"
        description="Try adding some items to get started"
        action={action}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Primary Action" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Secondary Action" }),
    ).toBeInTheDocument();
  });
});
