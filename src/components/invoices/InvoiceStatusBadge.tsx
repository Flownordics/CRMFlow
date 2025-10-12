import { Badge } from "@/components/ui/badge";
import { Invoice, deriveInvoiceStatus } from "@/services/invoices";

interface InvoiceStatusBadgeProps {
  invoice: Invoice;
  className?: string;
}

export function InvoiceStatusBadge({ invoice, className }: InvoiceStatusBadgeProps) {
  const status = deriveInvoiceStatus(invoice);
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          variant: 'default' as const,
          className: 'status-paid border',
          label: 'Paid'
        };
      case 'overdue':
        return {
          variant: 'destructive' as const,
          className: 'status-overdue border',
          label: 'Overdue'
        };
      case 'partial':
        return {
          variant: 'secondary' as const,
          className: 'status-partial border',
          label: 'Partial'
        };
      case 'sent':
        return {
          variant: 'secondary' as const,
          className: 'status-sent border',
          label: 'Sent'
        };
      case 'draft':
        return {
          variant: 'outline' as const,
          className: 'status-draft border',
          label: 'Draft'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'status-draft border',
          label: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}
