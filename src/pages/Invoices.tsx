import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Receipt,
  Send,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Invoice, deriveInvoiceStatus } from "@/services/invoices";
import { useInvoices, useDeleteInvoice } from "@/services/invoices";
import { generatePDF } from "@/lib/pdf";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/EmptyState";
import { InvoicesKpiHeader, InvoiceStatusFilters, InvoiceEmptyState, getInvoiceTheme, tokenBg, tokenText, AddPaymentDialog, EditInvoiceDialog, SendInvoiceDialog } from "@/components/invoices";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { AnalyticsCard, AnalyticsCardGrid } from "@/components/common/charts/AnalyticsCard";
import { InvoiceStatusChart } from "@/components/invoices/InvoiceStatusChart";
import { InvoiceAgingChart } from "@/components/invoices/InvoiceAgingChart";
import { InvoiceValueTrendChart } from "@/components/invoices/InvoiceValueTrendChart";
import { PieChart as PieChartIcon, BarChart3, TrendingUp as TrendingUpIcon } from "lucide-react";

interface InvoicesProps {
  embedded?: boolean;
}

const Invoices: React.FC<InvoicesProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { toast } = useToast();
  const { t } = useI18n();
  const { getCompanyName } = useCompanyLookup();
  const deleteInvoice = useDeleteInvoice();

  // Fetch invoices from API
  const { data: invoicesData, isLoading, error } = useInvoices({
    q: searchTerm,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const invoices = invoicesData?.data || [];
  const totalInvoices = invoicesData?.total || 0;

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.number
      ? invoice.number.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    // Use derived status for filtering to properly handle "overdue"
    const derivedStatus = deriveInvoiceStatus(invoice);
    const matchesStatus =
      statusFilter === "all" || derivedStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate counts for status filters using derived status
  const statusCounts = invoices.reduce((acc, invoice) => {
    const derivedStatus = deriveInvoiceStatus(invoice);
    acc[derivedStatus] = (acc[derivedStatus] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 bg-muted/30 animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center text-destructive">
          Error: {error.message}
        </div>
      </div>
    );
  }

  const handleGeneratePDF = async (invoice: Invoice) => {
    try {
      const url = await generatePDF("invoice", invoice.id);
      if (typeof url === 'string') {
        window.open(url, "_blank");
      }

      toast({
        title: "PDF Generated",
        description: `Invoice ${invoice.number} has been opened in a new tab.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice ${invoice.number || invoice.id}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast({
        title: "Invoice Deleted",
        description: "The invoice has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowSendDialog(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEditDialog(true);
  };

  const handleAddPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentDialog(true);
  };

  const handleStatusChange = (
    invoiceId: string,
    newStatus: Invoice["status"],
  ) => {
    toast({
      title: "Status Updated",
      description: `Invoice status changed to ${newStatus}.`,
    });
  };

  const isOverdue = (invoice: Invoice) => {
    // Only overdue if past due date AND has outstanding balance
    if (!invoice.due_date || invoice.balance_minor === 0) return false;
    return new Date(invoice.due_date) < new Date() && invoice.balance_minor > 0;
  };

  const getDaysOverdue = (dueDate: string) => {
    const diffTime = new Date().getTime() - new Date(dueDate).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isDueSoon = (invoice: Invoice) => {
    // Only due soon if has outstanding balance
    if (!invoice.due_date || invoice.balance_minor === 0) return false;
    const due = new Date(invoice.due_date);
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due <= sevenDaysFromNow && due > now;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header with subtitle and gradient separator - only show when not embedded */}
      {!embedded && (
        <>
          <PageHeader
            title="Invoices"
            subtitle="Track billing, payments and overdue balances."
            actions={
              <Button>
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            }
          />
          <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />
        </>
      )}

      {/* KPI Cards */}
      <InvoicesKpiHeader invoices={invoices} currency="DKK" />

      {/* Analytics Charts */}
      <AnalyticsCardGrid columns={3}>
        <AnalyticsCard
          title="Invoice Status Distribution"
          description="Breakdown by status"
          icon={PieChartIcon}
          chartName="Invoice Status Distribution"
        >
          <InvoiceStatusChart invoices={invoices} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Aging Analysis"
          description="Overdue invoices by age"
          icon={BarChart3}
          chartName="Invoice Aging"
        >
          <InvoiceAgingChart invoices={invoices} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Invoice Value Trend"
          description="Monthly billing over time"
          icon={TrendingUpIcon}
          chartName="Invoice Value Trend"
        >
          <InvoiceValueTrendChart invoices={invoices} />
        </AnalyticsCard>
      </AnalyticsCardGrid>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex max-w-md gap-2">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground"
              />
              <Input
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter aria-hidden="true" className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <InvoiceStatusFilters
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={statusCounts}
        />
      </div>

      {/* Invoices View */}
      {filteredInvoices.length === 0 ? (
        <InvoiceEmptyState
          onCreate={() => navigate("/invoices/new")}
          onConvertFromOrder={() => navigate("/orders")}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.map((invoice) => {
              // Use derived status based on payment state, not just database status
              const derivedStatus = deriveInvoiceStatus(invoice);
              const theme = getInvoiceTheme(derivedStatus);
              const Icon = theme.icon;
              const overdue = isOverdue(invoice);
              const dueSoon = isDueSoon(invoice);

              return (
                <TableRow key={invoice.id} className="hover:bg-muted/30 transition">
                  <TableCell>
                    <div className="inline-flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", tokenText(theme.color))} aria-hidden="true" focusable="false" />
                      <span className="font-medium">{invoice.number ?? "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="truncate">
                    {getCompanyName(invoice.company_id)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatMoneyMinor(invoice.total_minor || 0, invoice.currency || "DKK")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge intent={derivedStatus === "draft" ? "draft" :
                      derivedStatus === "sent" ? "active" :
                        derivedStatus === "paid" ? "closed" :
                          derivedStatus === "overdue" ? "overdue" :
                            derivedStatus === "partial" ? "active" : "draft"}>
                      {derivedStatus}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {overdue ? (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", tokenBg("danger"), tokenText("danger"))}>
                        {t("overdue")}
                      </span>
                    ) : dueSoon ? (
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", tokenBg("warning"), tokenText("warning"))}>
                        {t("due_soon")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{formatDate(invoice.due_date)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("open_pdf")}
                            onClick={() => handleGeneratePDF(invoice)}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Open PDF</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendInvoice(invoice)}
                            aria-label={t("send")}
                            disabled={invoice.status === "paid"}
                          >
                            <Send className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send invoice</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddPayment(invoice)}
                            aria-label={t("add_payment")}
                            disabled={invoice.status !== "sent" && invoice.status !== "overdue"}
                          >
                            <Coins className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add payment</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            aria-label={`View ${invoice.number}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View invoice</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditInvoice(invoice)}
                            aria-label={`Edit ${invoice.number}`}
                          >
                            <Edit className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit invoice</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteInvoice(invoice)}
                            aria-label={`Delete ${invoice.number}`}
                            disabled={deleteInvoice.isPending}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" focusable="false" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete invoice</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Edit Invoice Dialog */}
      {selectedInvoice && (
        <EditInvoiceDialog
          invoice={selectedInvoice}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onInvoiceUpdated={() => {
            // Refresh invoices list
            window.location.reload();
          }}
        />
      )}

      {/* Add Payment Dialog */}
      {selectedInvoice && (
        <AddPaymentDialog
          invoice={selectedInvoice}
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          onPaymentAdded={() => {
            // Refresh invoices list
            window.location.reload();
          }}
        />
      )}
      {selectedInvoice && (
        <SendInvoiceDialog
          invoice={selectedInvoice}
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          onInvoiceSent={() => {
            // Refresh invoices list
            window.location.reload();
          }}
        />
      )}
    </div>
  );
};

export default Invoices;
