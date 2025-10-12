import { Invoice } from "@/services/invoices";
import { PaymentWithInvoice } from "@/services/payments";
import { AgingBucket } from "@/services/accounting";
import { formatMoneyMinor } from "@/lib/money";

/**
 * Helper to escape CSV values
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Helper to download CSV file
 */
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format date for CSV export
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
}

/**
 * Export invoices to CSV
 */
export function exportInvoicesToCSV(
  invoices: Invoice[],
  companyNameMap?: Map<string, string>
): void {
  const headers = [
    "Invoice #",
    "Company",
    "Status",
    "Issue Date",
    "Due Date",
    "Currency",
    "Total",
    "Paid",
    "Balance",
    "Days Overdue",
  ];

  const rows = invoices.map((invoice) => {
    const daysOverdue = invoice.due_date
      ? Math.max(
          0,
          Math.floor(
            (new Date().getTime() - new Date(invoice.due_date).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

    const companyName = companyNameMap?.get(invoice.company_id || "") || invoice.company_id || "—";

    return [
      invoice.number || invoice.id,
      companyName,
      invoice.status,
      formatDate(invoice.issue_date),
      formatDate(invoice.due_date),
      invoice.currency,
      formatMoneyMinor(invoice.total_minor, invoice.currency),
      formatMoneyMinor(invoice.paid_minor, invoice.currency),
      formatMoneyMinor(invoice.balance_minor, invoice.currency),
      daysOverdue > 0 ? daysOverdue : "",
    ];
  });

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csvContent, `invoices_${timestamp}.csv`);
}

/**
 * Export payments to CSV
 */
export function exportPaymentsToCSV(
  payments: PaymentWithInvoice[],
  companyNameMap?: Map<string, string>
): void {
  const headers = [
    "Payment Date",
    "Invoice #",
    "Company",
    "Amount",
    "Currency",
    "Method",
    "Note",
    "Recorded At",
  ];

  const rows = payments.map((payment) => {
    const companyName = companyNameMap?.get(payment.company_id || "") || payment.company_id || "—";

    return [
      formatDate(payment.date),
      payment.invoice_number || payment.invoice_id,
      companyName,
      formatMoneyMinor(payment.amount_minor, payment.currency),
      payment.currency,
      payment.method,
      payment.note || "",
      formatDate(payment.created_at),
    ];
  });

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csvContent, `payments_${timestamp}.csv`);
}

/**
 * Export aging report to CSV
 */
export function exportAgingReportToCSV(
  buckets: AgingBucket[],
  companyNameMap?: Map<string, string>,
  currency: string = "DKK"
): void {
  const headers = [
    "Age Bucket",
    "Company",
    "Invoice #",
    "Due Date",
    "Days Overdue",
    "Balance",
    "Currency",
  ];

  const rows: string[][] = [];

  buckets.forEach((bucket) => {
    bucket.invoices.forEach((invoice) => {
      const companyName = companyNameMap?.get(invoice.company_id || "") || invoice.company_id || "—";

      rows.push([
        bucket.bucket,
        companyName,
        invoice.number || invoice.id,
        formatDate(invoice.due_date),
        invoice.days_overdue.toString(),
        formatMoneyMinor(invoice.balance_minor, invoice.currency),
        invoice.currency,
      ]);
    });
  });

  // Add summary rows
  rows.push([]);
  rows.push(["Summary"]);
  buckets.forEach((bucket) => {
    rows.push([
      bucket.bucket,
      `${bucket.count} invoices`,
      "",
      "",
      "",
      formatMoneyMinor(bucket.total_minor, currency),
      currency,
    ]);
  });

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csvContent, `aging_report_${timestamp}.csv`);
}

/**
 * Export accounting summary to CSV
 */
export function exportAccountingSummaryToCSV(data: {
  outstanding: number;
  overdue: number;
  paid: number;
  aging: { "0-30": number; "31-60": number; "61-90": number; "90+": number };
  currency: string;
}): void {
  const rows = [
    ["Metric", "Amount", "Currency"],
    ["Outstanding", formatMoneyMinor(data.outstanding, data.currency), data.currency],
    ["Overdue", formatMoneyMinor(data.overdue, data.currency), data.currency],
    ["Paid (period)", formatMoneyMinor(data.paid, data.currency), data.currency],
    [],
    ["Aging Analysis"],
    ["0-30 days", formatMoneyMinor(data.aging["0-30"], data.currency), data.currency],
    ["31-60 days", formatMoneyMinor(data.aging["31-60"], data.currency), data.currency],
    ["61-90 days", formatMoneyMinor(data.aging["61-90"], data.currency), data.currency],
    ["90+ days", formatMoneyMinor(data.aging["90+"], data.currency), data.currency],
  ];

  const csvContent = rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");

  const timestamp = new Date().toISOString().split("T")[0];
  downloadCsv(csvContent, `accounting_summary_${timestamp}.csv`);
}

