import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreateQuoteModal } from "@/components/quotes/CreateQuoteModal";
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Grid3X3,
  List,
  FileText,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Quote } from "@/services/quotes";
import { useQuotes, useQuoteStatusCounts } from "@/services/quotes";
import { generatePDF } from "@/lib/pdf";
import { PageHeader } from "@/components/layout/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";
import { SendQuoteDialog } from "@/components/quotes/SendQuoteDialog";
import {
  QuotesKpiHeader,
  QuotesStatusFilters,
  QuoteCard,
  QuotesEmptyState,
  getQuoteStatusTheme,
  statusTokenBg,
  statusTokenText
} from "@/components/quotes";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { AnalyticsCard, AnalyticsCardGrid } from "@/components/common/charts/AnalyticsCard";
import { QuoteStatusChart } from "@/components/quotes/QuoteStatusChart";
import { QuoteValueTrendChart } from "@/components/quotes/QuoteValueTrendChart";
import { PieChart as PieChartIcon, TrendingUp as TrendingUpIcon } from "lucide-react";

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { getCompanyName } = useCompanyLookup();

  // Fetch ALL quotes for accurate KPI calculations (no pagination needed for quotes)
  const { data: quotesData, isLoading, error, refetch } = useQuotes({
    q: searchTerm,
    status: statusFilter !== "all" ? statusFilter : undefined,
    limit: 9999  // Fetch all quotes for KPIs and charts
  });

  // Fetch status counts for filter buttons (excluding accepted quotes since they become orders)
  const { data: statusCounts = { draft: 0, sent: 0, declined: 0, expired: 0 } } = useQuoteStatusCounts();

  const quotes = quotesData?.data || [];
  const totalQuotes = quotesData?.total || 0;

  const filteredQuotes = quotes.filter((quote) => {
    // Automatically exclude accepted quotes since they become orders
    if (quote.status === "accepted") {
      return false;
    }

    const matchesSearch =
      (quote.number?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (quote.notes?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesStatus =
      statusFilter === "all" || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleGeneratePDF = async (quote: Quote) => {
    try {
      await generatePDF("quote", quote.id);
      toast({
        title: "PDF Generated",
        description: `Quote ${quote.number} has been opened in a new tab.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleConvertToOrder = async (quote: Quote) => {
    try {
      const { ensureOrderForQuote } = await import("@/services/conversions");
      await ensureOrderForQuote(quote.id);

      toast({
        title: "Order Created",
        description: `Quote ${quote.number} has been converted to an order successfully.`,
      });

      // Refresh quotes data
      await refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert quote to order. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendQuote = (quote: Quote) => {
    setSelectedQuoteId(quote.id);
    setSendDialogOpen(true);
  };

  const handleDeleteQuote = (quoteId: string) => {
    // This function will need to be updated to use the actual API
    // For now, it will just remove from the mock data
    // setQuotes(quotes.filter((q) => q.id !== quoteId));
    toast({
      title: "Quote Deleted",
      description: "The quote has been removed (mock).",
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Quotes"
        subtitle="Proposals at a glance — status, totals and quick actions."
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            New Quote
          </Button>
        }
      />

      {/* Gradient Divider */}
      <div className="h-0.5 w-full bg-gradient-to-r from-accent/30 via-primary/30 to-transparent rounded-full" aria-hidden="true" />

      {/* KPI Header */}
      <QuotesKpiHeader quotes={quotes} currency="DKK" />

      {/* Analytics Charts */}
      <AnalyticsCardGrid columns={2}>
        <AnalyticsCard
          title="Quote Status Distribution"
          description="Breakdown by status"
          icon={PieChartIcon}
          chartName="Quote Status Distribution"
        >
          <QuoteStatusChart quotes={quotes} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Quote Value Trend"
          description="Monthly quote value over time"
          icon={TrendingUpIcon}
          chartName="Quote Value Trend"
        >
          <QuoteValueTrendChart quotes={quotes} />
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
                placeholder="Search quotes..."
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

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border bg-card p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-8 px-2"
                aria-label="Table view"
              >
                <List className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-2"
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filters */}
        <QuotesStatusFilters
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          counts={statusCounts}
        />
      </div>

      {/* Quotes View */}
      {filteredQuotes.length === 0 ? (
        <div className="p-8">
          <QuotesEmptyState onCreateClick={() => setCreateModalOpen(true)} />
        </div>
      ) : viewMode === "table" ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotes.map((quote) => {
              const theme = getQuoteStatusTheme(quote.status);
              const Icon = theme.icon;

              return (
                <TableRow key={quote.id}>
                  <TableCell className="min-w-[220px]">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {quote.number || generateFriendlyNumber(quote.id, 'quote')}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {quote.notes || "No description"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {getCompanyName(quote.company_id)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm font-medium">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: quote.currency || "DKK",
                    }).format((quote.total_minor || 0) / 100)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                      statusTokenBg(theme.color),
                      statusTokenText(theme.color)
                    )}>
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {quote.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGeneratePDF(quote)}
                            aria-label={`Generate PDF for ${quote.number || quote.id}`}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate PDF</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendQuote(quote)}
                            aria-label={`Send quote ${quote.number || quote.id}`}
                          >
                            <Mail className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Quote</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label={`View ${quote.number || quote.id}`}
                          >
                            <Link to={`/quotes/${quote.id}`}>
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Quote</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleConvertToOrder(quote)}
                            disabled={quote.status === "accepted"}
                            aria-label={`Convert ${quote.number || quote.id} to Order`}
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {quote.status === "accepted" ? "Already converted" : "Convert to Order"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteQuote(quote.id)}
                            aria-label={`Delete ${quote.number || quote.id}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Quote</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredQuotes.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onSend={handleSendQuote}
              onOpenPdf={handleGeneratePDF}
              onConvertToOrder={handleConvertToOrder}
            />
          ))}
        </div>
      )}

      <CreateQuoteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {selectedQuoteId && (
        <SendQuoteDialog
          quoteId={selectedQuoteId}
          open={sendDialogOpen}
          onOpenChange={(open) => {
            setSendDialogOpen(open);
            if (!open) setSelectedQuoteId(null);
          }}
        />
      )}
    </div>
  );
};

export default Quotes;
