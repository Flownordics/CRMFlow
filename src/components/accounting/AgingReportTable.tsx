import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AgingBucket } from "@/services/accounting";
import { formatMoneyMinor } from "@/lib/money";
import { useCompanyLookup } from "@/hooks/useCompanyLookup";
import { generateFriendlyNumber } from "@/lib/friendlyNumbers";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgingReportTableProps {
  bucket: AgingBucket;
  currency?: string;
}

const bucketColors: Record<string, string> = {
  "0-30": "text-[#9d855e]", // Muted gold
  "31-60": "text-[#b8947a]", // Muted warm
  "61-90": "text-[#b8695f]", // Muted coral
  "90+": "text-[#a05d54]", // Darker muted coral
};

export function AgingReportTable({ bucket, currency = "DKK" }: AgingReportTableProps) {
  const { getCompanyName } = useCompanyLookup();

  if (bucket.invoices.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No invoices in this aging bucket
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {bucket.bucket} Days Overdue
          </h3>
          <p className="text-sm text-muted-foreground">
            {bucket.count} invoice{bucket.count !== 1 ? 's' : ''} • Total: {formatMoneyMinor(bucket.total_minor, currency)}
          </p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Days Overdue</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bucket.invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {invoice.number ?? generateFriendlyNumber(invoice.id, 'invoice')}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {getCompanyName(invoice.company_id)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className={cn("text-right font-medium", bucketColors[bucket.bucket])}>
                  {invoice.days_overdue}
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  {formatMoneyMinor(invoice.balance_minor, invoice.currency)}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/invoices/${invoice.id}`}>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

