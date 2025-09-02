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
          className: 'bg-green-100 text-green-800 border-green-200',
          label: 'Paid'
        };
      case 'overdue':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          label: 'Overdue'
        };
      case 'partial':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Partial'
        };
      case 'sent':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          label: 'Sent'
        };
      case 'draft':
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          label: 'Draft'
        };
      default:
        return {
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
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
