import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMoneyMinor } from "@/lib/money";

interface PaymentTrendsChartProps {
  payments: Array<{
    date: string;
    amount_minor: number;
  }>;
  currency?: string;
}

export function PaymentTrendsChart({ payments, currency = "DKK" }: PaymentTrendsChartProps) {
  // Group payments by date and calculate totals
  const chartData = useMemo(() => {
    const grouped = new Map<string, number>();

    payments.forEach((payment) => {
      const date = new Date(payment.date).toLocaleDateString();
      grouped.set(date, (grouped.get(date) || 0) + payment.amount_minor);
    });

    // Convert to array and sort by date
    const data = Array.from(grouped.entries())
      .map(([date, amount]) => ({
        date,
        amount: amount / 100, // Convert minor to major for better chart display
        displayAmount: formatMoneyMinor(amount, currency),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30); // Last 30 days

    return data;
  }, [payments, currency]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
            <CardTitle className="text-base">Payment Trends</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-sm text-muted-foreground">
            No payment data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
          <CardTitle className="text-base">Payment Trends</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Last {chartData.length} days
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-1">
                        <div className="text-xs text-muted-foreground">
                          {payload[0].payload.date}
                        </div>
                        <div className="text-sm font-medium">
                          {payload[0].payload.displayAmount}
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              name="Payment Amount"
              stroke="#6b7c5e"
              strokeWidth={2}
              dot={{ fill: "#6b7c5e", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

