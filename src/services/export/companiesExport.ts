import { Company } from "@/lib/schemas/company";
import { format } from "date-fns";

export interface ExportOptions {
  includeEmail?: boolean;
  includePhone?: boolean;
  includeAddress?: boolean;
  includeMetadata?: boolean;
  includeDates?: boolean;
}

export function exportCompaniesToCSV(
  companies: Company[],
  options: ExportOptions = {}
): void {
  const {
    includeEmail = true,
    includePhone = true,
    includeAddress = true,
    includeMetadata = true,
    includeDates = true,
  } = options;

  // Build CSV headers based on options
  const headers: string[] = ["Name"];
  
  if (includeEmail) {
    headers.push("Email", "Invoice Email");
  }
  
  if (includePhone) {
    headers.push("Phone");
  }
  
  if (includeAddress) {
    headers.push("Address", "City", "Country");
  }
  
  if (includeMetadata) {
    headers.push(
      "Domain",
      "Website",
      "VAT",
      "Industry",
      "Lifecycle Stage",
      "Employee Count",
      "Annual Revenue Range",
      "Description"
    );
  }
  
  headers.push("Do Not Call", "Activity Status", "Last Activity");
  
  if (includeDates) {
    headers.push("Created At", "Updated At");
  }

  headers.push("LinkedIn", "Twitter", "Facebook");

  // Build CSV rows
  const rows = companies.map((company) => {
    const row: string[] = [escapeCsvValue(company.name)];
    
    if (includeEmail) {
      row.push(
        escapeCsvValue(company.email || ""),
        escapeCsvValue(company.invoiceEmail || "")
      );
    }
    
    if (includePhone) {
      row.push(escapeCsvValue(company.phone || ""));
    }
    
    if (includeAddress) {
      row.push(
        escapeCsvValue(company.address || ""),
        escapeCsvValue(company.city || ""),
        escapeCsvValue(company.country || "")
      );
    }
    
    if (includeMetadata) {
      row.push(
        escapeCsvValue(company.domain || ""),
        escapeCsvValue(company.website || ""),
        escapeCsvValue(company.vat || ""),
        escapeCsvValue(company.industry || ""),
        escapeCsvValue(company.lifecycleStage || ""),
        company.employeeCount?.toString() || "",
        escapeCsvValue(company.annualRevenueRange || ""),
        escapeCsvValue(company.description || "")
      );
    }
    
    row.push(
      company.doNotCall ? "Yes" : "No",
      company.activityStatus || "",
      company.lastActivityAt
        ? format(new Date(company.lastActivityAt), "yyyy-MM-dd")
        : ""
    );
    
    if (includeDates) {
      row.push(
        company.createdAt
          ? format(new Date(company.createdAt), "yyyy-MM-dd")
          : "",
        company.updatedAt
          ? format(new Date(company.updatedAt), "yyyy-MM-dd")
          : ""
      );
    }

    row.push(
      escapeCsvValue(company.linkedinUrl || ""),
      escapeCsvValue(company.twitterUrl || ""),
      escapeCsvValue(company.facebookUrl || "")
    );

    return row;
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n");

  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
  link.setAttribute("href", url);
  link.setAttribute("download", `companies_export_${timestamp}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string): string {
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Template CSV for import
export function downloadImportTemplate(): void {
  const headers = [
    "Name*",
    "Email",
    "Invoice Email",
    "Phone",
    "Address",
    "City",
    "Country",
    "Domain",
    "Website",
    "VAT",
    "Industry",
    "Lifecycle Stage",
    "Employee Count",
    "Annual Revenue Range",
    "Description",
    "LinkedIn",
    "Twitter",
    "Facebook",
  ];

  const exampleRow = [
    "Example Company",
    "contact@example.com",
    "invoices@example.com",
    "+45 12 34 56 78",
    "Main Street 123",
    "Copenhagen",
    "Denmark",
    "example.com",
    "https://example.com",
    "DK12345678",
    "Technology",
    "customer",
    "50",
    "1M-10M",
    "Example company description",
    "https://linkedin.com/company/example",
    "https://twitter.com/example",
    "https://facebook.com/example",
  ];

  const csvContent = [headers, exampleRow]
    .map((row) => row.join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", "companies_import_template.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

