import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useInvoices } from "@/services/invoices";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fromMinor } from "@/lib/money";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueChart() {
  const { data: invoices, isLoading } = useInvoices({ limit: 5000 });

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
          <CardDescription>Monthly revenue over last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!invoices?.data || invoices.data.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Trend
          </CardTitle>
          <CardDescription>Monthly revenue over last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No invoice data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get last 6 months
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Calculate revenue per month
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const paidInvoices = invoices.data.filter(invoice => {
      if (invoice.status !== 'paid' || !invoice.issue_date) return false;
      const issueDate = parseISO(invoice.issue_date);
      return issueDate >= monthStart && issueDate <= monthEnd;
    });

    const revenue = paidInvoices.reduce((sum, inv) => sum + inv.total_minor, 0);

    return {
      month: format(month, 'MMM yyyy'),
      revenue: revenue / 100, // Convert to major units for chart
      revenueFormatted: fromMinor(revenue, 'DKK'),
      invoiceCount: paidInvoices.length
    };
  });

  // Calculate total and average
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const avgRevenue = totalRevenue / monthlyData.length;

  return (
    <Card className="rounded-2xl border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Revenue Trend
        </CardTitle>
        <CardDescription>
          Monthly revenue • Avg: {fromMinor(Math.round(avgRevenue * 100), 'DKK')}/month
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              tickFormatter={(value) => `${Math.round(value / 1000)}K`}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <div className="font-medium mb-1">{data.month}</div>
                    <div className="text-sm text-muted-foreground">
                      Revenue: <span className="font-medium text-foreground">{data.revenueFormatted}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Invoices: <span className="font-medium text-foreground">{data.invoiceCount}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

