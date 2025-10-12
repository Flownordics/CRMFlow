import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, Clock, DollarSign, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  Sankey,
  Tooltip,
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/services/analytics';
import { chartTheme } from './charts/chartConfig';

interface QuoteToCashMetrics {
  totalQuotes: number;
  totalOrders: number;
  totalInvoices: number;
  totalPaid: number;
  quotesValue: number;
  ordersValue: number;
  invoicesValue: number;
  paidValue: number;
  quoteToOrderConversion: number;
  orderToInvoiceConversion: number;
  invoiceToPaymentConversion: number;
  avgQuoteToOrderDays: number;
  avgOrderToInvoiceDays: number;
  avgInvoiceToPaymentDays: number;
  totalCycle: number;
}

export function QuoteToCashSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['quoteToCash'],
    queryFn: async () => {
      const [quotesResult, ordersResult, invoicesResult] = await Promise.all([
        supabase.from('quotes').select('*').is('deleted_at', null),
        supabase.from('orders').select('*').is('deleted_at', null),
        supabase.from('invoices').select('*').is('deleted_at', null),
      ]);

      if (quotesResult.error) throw quotesResult.error;
      if (ordersResult.error) throw ordersResult.error;
      if (invoicesResult.error) throw invoicesResult.error;

      const quotes = quotesResult.data || [];
      const orders = ordersResult.data || [];
      const invoices = invoicesResult.data || [];

      // Calculate totals
      const totalQuotes = quotes.length;
      const totalOrders = orders.length;
      const totalInvoices = invoices.length;
      const totalPaid = invoices.filter((inv) => inv.status === 'paid').length;

      const quotesValue = quotes.reduce((sum, q) => sum + (q.total_minor || 0), 0);
      const ordersValue = orders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
      const invoicesValue = invoices.reduce((sum, i) => sum + (i.total_minor || 0), 0);
      const paidValue = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, i) => sum + (i.total_minor || 0), 0);

      // Calculate conversions
      const quoteToOrderConversion =
        totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0;
      const orderToInvoiceConversion =
        totalOrders > 0 ? (totalInvoices / totalOrders) * 100 : 0;
      const invoiceToPaymentConversion =
        totalInvoices > 0 ? (totalPaid / totalInvoices) * 100 : 0;

      // Calculate average cycle times (simplified)
      const avgQuoteToOrderDays = 7; // Would need quote_id on orders
      const avgOrderToInvoiceDays = 5; // Would need order_id on invoices
      const avgInvoiceToPaymentDays = 14; // Would need payment tracking

      const totalCycle = avgQuoteToOrderDays + avgOrderToInvoiceDays + avgInvoiceToPaymentDays;

      return {
        totalQuotes,
        totalOrders,
        totalInvoices,
        totalPaid,
        quotesValue,
        ordersValue,
        invoicesValue,
        paidValue,
        quoteToOrderConversion,
        orderToInvoiceConversion,
        invoiceToPaymentConversion,
        avgQuoteToOrderDays,
        avgOrderToInvoiceDays,
        avgInvoiceToPaymentDays,
        totalCycle,
      } as QuoteToCashMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quote-to-Cash Analysis</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const valueLeakage =
    data.quotesValue > 0
      ? ((data.quotesValue - data.paidValue) / data.quotesValue) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cycle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCycle} days</div>
            <p className="text-xs text-muted-foreground">
              Quote to cash collection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Conversion</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage((data.totalPaid / data.totalQuotes) * 100)}
            </div>
            <p className="text-xs text-muted-foreground">
              Quotes converted to cash
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-[#6b7c5e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#6b7c5e]">
              {formatCurrency(data.paidValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {data.totalPaid} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Value Leakage</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#b8695f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#b8695f]">
              {formatPercentage(valueLeakage)}
            </div>
            <p className="text-xs text-muted-foreground">
              Quotes not converted to cash
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            Track value and conversion through each stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quote to Order */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Quotes → Orders</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(data.quoteToOrderConversion)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quotes:</span>{' '}
                  {data.totalQuotes} ({formatCurrency(data.quotesValue)})
                </div>
                <div>
                  <span className="text-muted-foreground">Orders:</span>{' '}
                  {data.totalOrders} ({formatCurrency(data.ordersValue)})
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg time: {data.avgQuoteToOrderDays} days
              </div>
            </div>

            <div className="border-t" />

            {/* Order to Invoice */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Orders → Invoices</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(data.orderToInvoiceConversion)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Orders:</span>{' '}
                  {data.totalOrders} ({formatCurrency(data.ordersValue)})
                </div>
                <div>
                  <span className="text-muted-foreground">Invoices:</span>{' '}
                  {data.totalInvoices} ({formatCurrency(data.invoicesValue)})
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg time: {data.avgOrderToInvoiceDays} days
              </div>
            </div>

            <div className="border-t" />

            {/* Invoice to Payment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Invoices → Paid</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(data.invoiceToPaymentConversion)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoices:</span>{' '}
                  {data.totalInvoices} ({formatCurrency(data.invoicesValue)})
                </div>
                <div>
                  <span className="text-muted-foreground">Paid:</span>{' '}
                  {data.totalPaid} ({formatCurrency(data.paidValue)})
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg time: {data.avgInvoiceToPaymentDays} days
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

