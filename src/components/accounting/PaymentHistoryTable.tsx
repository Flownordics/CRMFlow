import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { PaymentWithInvoice } from "@/services/payments";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";
import { cn } from "@/lib/utils";

interface PaymentHistoryTableProps {
  payments: PaymentWithInvoice[];
  isLoading?: boolean;
  onExport?: () => void;
  showSearch?: boolean;
  showFilters?: boolean;
}

const paymentMethodLabels: Record<string, string> = {
  bank: "Bank Transfer",
  card: "Card",
  cash: "Cash",
  other: "Other",
};

const paymentMethodColors: Record<string, string> = {
  bank: "bg-blue-100 text-blue-800",
  card: "bg-purple-100 text-purple-800",
  cash: "bg-green-100 text-green-800",
  other: "bg-gray-100 text-gray-800",
};

export function PaymentHistoryTable({
  payments,
  isLoading = false,
  onExport,
  showSearch = true,
  showFilters = true,
}: PaymentHistoryTableProps) {
  const { getCompanyName } = useCompanyLookup();
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = searchTerm
      ? (payment.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         getCompanyName(payment.company_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
         payment.note?.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;

    const matchesMethod = methodFilter === "all" || payment.method === methodFilter;

    return matchesSearch && matchesMethod;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showSearch && (
          <div className="flex gap-2">
            <div className="h-10 bg-muted/30 animate-pulse rounded flex-1" />
            {showFilters && <div className="h-10 bg-muted/30 animate-pulse rounded w-[180px]" />}
          </div>
        )}
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted/30 animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {showSearch && (
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="Search by invoice, company, or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          
          {showFilters && (
            <div className="flex gap-2">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Export
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {filteredPayments.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {searchTerm || methodFilter !== "all" 
            ? "No payments found matching your filters." 
            : "No payment history available."}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden md:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(payment.date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {payment.invoice_number ?? generateFriendlyNumber(payment.invoice_id, 'invoice')}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {getCompanyName(payment.company_id)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        paymentMethodColors[payment.method] || paymentMethodColors.other
                      )}
                    >
                      {paymentMethodLabels[payment.method] || payment.method}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap">
                    {formatMoneyMinor(payment.amount_minor, payment.currency)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[250px] truncate text-muted-foreground text-sm">
                    {payment.note || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {filteredPayments.length > 0 && (
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">
            Total: {formatMoneyMinor(
              filteredPayments.reduce((sum, p) => sum + p.amount_minor, 0),
              filteredPayments[0]?.currency || "DKK"
            )}
          </span>
        </div>
      )}
    </div>
  );
}

