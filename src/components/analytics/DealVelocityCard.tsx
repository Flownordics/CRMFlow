import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { useStageLookup } from '@/hooks/useStageLookup';
import { chartColors, chartTheme } from './charts/chartConfig';

interface StageVelocity {
  stageId: string;
  stageName: string;
  avgDays: number;
  dealCount: number;
}

export function DealVelocityCard() {
  const { getStageName } = useStageLookup();

  const { data, isLoading } = useQuery({
    queryKey: ['dealVelocity'],
    queryFn: async () => {
      // Fetch all deals with their stage history (simplified - using created_at and updated_at)
      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, stage_id, created_at, updated_at, close_date')
        .is('deleted_at', null);

      if (error) throw error;

      // Group by stage and calculate average time
      const stageMap = new Map<string, { totalDays: number; count: number }>();

      deals?.forEach((deal) => {
        const created = new Date(deal.created_at);
        const updated = new Date(deal.updated_at);
        const daysDiff = Math.floor(
          (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (!stageMap.has(deal.stage_id)) {
          stageMap.set(deal.stage_id, { totalDays: 0, count: 0 });
        }

        const stage = stageMap.get(deal.stage_id)!;
        stage.totalDays += daysDiff;
        stage.count += 1;
      });

      // Convert to array
      const stageVelocity: StageVelocity[] = Array.from(stageMap.entries())
        .map(([stageId, data]) => ({
          stageId,
          stageName: getStageName(stageId),
          avgDays: Math.round(data.totalDays / data.count),
          dealCount: data.count,
        }))
        .sort((a, b) => b.avgDays - a.avgDays);

      // Calculate overall metrics
      const totalDeals = deals?.length || 0;
      const avgSalesCycle = stageVelocity.reduce((sum, stage) => sum + stage.avgDays, 0) / (stageVelocity.length || 1);
      
      const fastest = Math.min(...stageVelocity.map(s => s.avgDays));
      const slowest = Math.max(...stageVelocity.map(s => s.avgDays));

      return {
        stageVelocity,
        totalDeals,
        avgSalesCycle: Math.round(avgSalesCycle),
        fastest,
        slowest,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Velocity</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getBarColor = (avgDays: number) => {
    if (avgDays <= 7) return chartColors.success;
    if (avgDays <= 30) return chartColors.warning;
    return chartColors.danger;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={chartTheme.tooltipStyle} className="shadow-lg">
          <p className="font-semibold mb-2">{data.stageName}</p>
          <p className="text-sm">
            <span className="font-medium">Avg Time:</span> {data.avgDays} days
          </p>
          <p className="text-sm">
            <span className="font-medium">Deals:</span> {data.dealCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Sales Cycle</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgSalesCycle} days</div>
            <p className="text-xs text-muted-foreground">
              Across {data.totalDeals} deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fastest Stage</CardTitle>
            <Zap className="h-4 w-4 text-[#6b7c5e]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#6b7c5e]">{data.fastest} days</div>
            <p className="text-xs text-muted-foreground">
              Most efficient stage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slowest Stage</CardTitle>
            <TrendingDown className="h-4 w-4 text-[#b8695f]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#b8695f]">{data.slowest} days</div>
            <p className="text-xs text-muted-foreground">
              Potential bottleneck
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Velocity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Time Spent in Each Stage</CardTitle>
          <CardDescription>
            Average days deals spend in each pipeline stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data.stageVelocity}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.gridStyle.stroke}
                strokeOpacity={chartTheme.gridStyle.strokeOpacity}
              />
              <XAxis
                dataKey="stageName"
                style={chartTheme.axisStyle}
                stroke={chartTheme.gridStyle.stroke}
              />
              <YAxis
                style={chartTheme.axisStyle}
                stroke={chartTheme.gridStyle.stroke}
                label={{
                  value: 'Days',
                  angle: -90,
                  position: 'insideLeft',
                  style: chartTheme.axisStyle,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgDays" radius={[4, 4, 0, 0]}>
                {data.stageVelocity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.avgDays)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

