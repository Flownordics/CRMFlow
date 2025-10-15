import { Handshake } from "lucide-react";
import { useDeals } from "@/services/deals";
import { useStageLookup } from "@/hooks/useStageLookup";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { AnalyticsCard } from "@/components/common/charts/AnalyticsCard";
import { chartColors, chartTheme, animationDuration } from '@/components/analytics/charts/chartConfig';

export function DealsChart() {
  const { data: deals, isLoading } = useDeals({ limit: 5000 });
  const { getStageName } = useStageLookup();

  if (isLoading) {
    return (
      <AnalyticsCard
        title="Deals Won/Lost"
        description="Monthly deal outcomes over last 6 months"
        icon={Handshake}
        isLoading={true}
      >
        <div />
      </AnalyticsCard>
    );
  }

  if (!deals?.data || deals.data.length === 0) {
    return (
      <AnalyticsCard
        title="Deals Won/Lost"
        description="Monthly deal outcomes over last 6 months"
        icon={Handshake}
      >
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          No deal data available
        </div>
      </AnalyticsCard>
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
      <div style={chartTheme.tooltipStyle} className="shadow-lg">
        <p className="font-semibold mb-2">{data.month}</p>
        <p className="text-sm">
          <span className="font-medium">Won:</span> {data.won}
        </p>
        <p className="text-sm">
          <span className="font-medium">Lost:</span> {data.lost}
        </p>
      </div>
    );
  };

  return (
    <AnalyticsCard
      title="Deals Won/Lost"
      description="Monthly deal outcomes over last 6 months"
      icon={Handshake}
      chartName="Dashboard Deals Won Lost"
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridStyle.stroke}
            strokeOpacity={chartTheme.gridStyle.strokeOpacity}
          />
          <XAxis
            dataKey="month"
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
          <YAxis
            style={chartTheme.axisStyle}
            stroke={chartTheme.gridStyle.stroke}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={chartTheme.legendStyle}
            iconType="rect"
            iconSize={12}
          />
          <Bar
            dataKey="won"
            fill={chartColors.success}
            name="Won"
            radius={[4, 4, 0, 0]}
            animationDuration={animationDuration}
          />
          <Bar
            dataKey="lost"
            fill={chartColors.danger}
            name="Lost"
            radius={[4, 4, 0, 0]}
            animationDuration={animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}

