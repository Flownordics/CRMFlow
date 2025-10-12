import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake } from "lucide-react";
import { useDeals } from "@/services/deals";
import { useStageLookup } from "@/hooks/useStageLookup";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function DealsChart() {
  const { data: deals, isLoading } = useDeals({ limit: 5000 });
  const { getStageName } = useStageLookup();

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Deals Won/Lost
          </CardTitle>
          <CardDescription>Monthly deal outcomes over last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!deals?.data || deals.data.length === 0) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-5 w-5" />
            Deals Won/Lost
          </CardTitle>
          <CardDescription>Monthly deal outcomes over last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No deal data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get last 6 months
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });

  // Calculate won/lost deals per month
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const wonDeals = deals.data.filter(deal => {
      if (!deal.updated_at) return false;
      const stageName = getStageName(deal.stage_id);
      const isWon = stageName?.toLowerCase().includes('won');
      const updatedDate = parseISO(deal.updated_at);
      return isWon && updatedDate >= monthStart && updatedDate <= monthEnd;
    });

    const lostDeals = deals.data.filter(deal => {
      if (!deal.updated_at) return false;
      const stageName = getStageName(deal.stage_id);
      const isLost = stageName?.toLowerCase().includes('lost');
      const updatedDate = parseISO(deal.updated_at);
      return isLost && updatedDate >= monthStart && updatedDate <= monthEnd;
    });

    return {
      month: format(month, 'MMM yyyy'),
      won: wonDeals.length,
      lost: lostDeals.length,
    };
  });

  return (
    <Card className="rounded-2xl border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          Deals Won/Lost
        </CardTitle>
        <CardDescription>Monthly deal outcomes over last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <div className="font-medium mb-1">{data.month}</div>
                    <div className="text-sm text-[#6b7c5e]">
                      Won: <span className="font-medium">{data.won}</span>
                    </div>
                    <div className="text-sm text-[#b8695f]">
                      Lost: <span className="font-medium">{data.lost}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend />
            <Bar dataKey="won" fill="#b5c69f" name="Won" />
            <Bar dataKey="lost" fill="#fb8674" name="Lost" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

