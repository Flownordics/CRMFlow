import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateDealModal } from "./CreateDealModal";

// Mock the services
vi.mock("@/services/deals", () => ({
  useCreateDeal: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/services/companies", () => ({
  useCreateCompany: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  searchCompanies: vi.fn(),
}));

vi.mock("@/services/people", () => ({
  useCreatePerson: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  searchPeople: vi.fn(),
}));

// Mock the toast bus
vi.mock("@/lib/toastBus", () => ({
  toastBus: {
    emit: vi.fn(),
  },
}));

// Mock the i18n
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the SearchSelect components
vi.mock("@/components/selects/CompanySelect", () => ({
  CompanySelect: ({ label }: { label: string }) => <div data-testid="company-select">{label}</div>,
}));

vi.mock("@/components/selects/PersonSelect", () => ({
  PersonSelect: ({ label }: { label: string }) => <div data-testid="person-select">{label}</div>,
}));

// Mock the modals
vi.mock("@/components/companies/CompanyModal", () => ({
  CompanyModal: () => <div data-testid="company-modal">Company Modal</div>,
}));

vi.mock("@/components/people/PersonModal", () => ({
  PersonModal: () => <div data-testid="person-modal">Person Modal</div>,
}));

describe("CreateDealModal", () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = () => {
    return render(
      <CreateDealModal
        open={true}
        onOpenChange={mockOnOpenChange}
        defaultStageId="stage1"
      />
    );
  };

  it("should render the modal with all form fields", () => {
    renderModal();

    expect(screen.getByText("New Deal")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Deal title")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();
    expect(screen.getByText("expected_value")).toBeInTheDocument();
    expect(screen.getByText("close_date")).toBeInTheDocument();
    expect(screen.getByText("Currency")).toBeInTheDocument();
    expect(screen.getByText("Tax %")).toBeInTheDocument();
  });

  it("should show company and contact selects", () => {
    renderModal();

    expect(screen.getByTestId("company-select")).toBeInTheDocument();
    expect(screen.getByTestId("person-select")).toBeInTheDocument();
  });

  it("should show inline creation modals", () => {
    renderModal();

    expect(screen.getByTestId("company-modal")).toBeInTheDocument();
    expect(screen.getByTestId("person-modal")).toBeInTheDocument();
  });

  it("should be disabled when required fields are missing", () => {
    renderModal();

    const createButton = screen.getByText("Create");
    expect(createButton).toBeDisabled();
  });

  it("should be enabled when required fields are filled", async () => {
    renderModal();

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText("Deal title");
    fireEvent.change(titleInput, { target: { value: "Test Deal" } });

    await waitFor(() => {
      const createButton = screen.getByText("Create");
      expect(createButton).not.toBeDisabled();
    });
  });

  it("should show stage information when defaultStageId is provided", () => {
    renderModal();

    expect(screen.getByText(/Will be created in stage: stage1/)).toBeInTheDocument();
  });
});
