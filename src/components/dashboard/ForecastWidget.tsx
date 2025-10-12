import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target } from "lucide-react";
import { useDeals } from "@/services/deals";
import { useStageLookup } from "@/hooks/useStageLookup";
import { fromMinor, formatNumber } from "@/lib/money";
import { endOfMonth, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

export function ForecastWidget() {
  const { data: deals } = useDeals({ limit: 5000 });
  const { getStageName } = useStageLookup();

  if (!deals?.data) {
    return null;
  }

  // Calculate weighted forecast (deal value * probability)
  const activeDeals = deals.data.filter(deal => {
    const stageName = getStageName(deal.stage_id);
    return !stageName?.toLowerCase().includes('won') && !stageName?.toLowerCase().includes('lost');
  });

  const forecastedRevenue = activeDeals.reduce((sum, deal) => {
    const probability = deal.probability || 0;
    return sum + (deal.expected_value_minor * probability);
  }, 0);

  // Mock target for now (can be made configurable later)
  const monthlyTarget = 200000 * 100; // 200,000 DKK in minor units

  // Calculate current month won deals
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonDealsThisMonth = deals.data.filter(deal => {
    const stageName = getStageName(deal.stage_id);
    const isWon = stageName?.toLowerCase().includes('won');
    const wasWonThisMonth = deal.updated_at && new Date(deal.updated_at) >= monthStart;
    return isWon && wasWonThisMonth;
  });

  const actualRevenue = wonDealsThisMonth.reduce((sum, deal) => sum + deal.expected_value_minor, 0);
  const projectedRevenue = actualRevenue + forecastedRevenue;
  const progress = (projectedRevenue / monthlyTarget) * 100;
  const gap = monthlyTarget - projectedRevenue;
  const daysRemaining = differenceInDays(endOfMonth(now), now);

  const confidence = activeDeals.length > 0
    ? (activeDeals.filter(d => (d.probability || 0) > 0.5).length / activeDeals.length) * 100
    : 0;

  return (
    <Card className="rounded-2xl border shadow-card bg-gradient-to-br from-primary/5 to-background">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Revenue Forecast
            </CardTitle>
            <CardDescription>This month projection</CardDescription>
          </div>
          <Badge variant={progress >= 100 ? "default" : progress >= 70 ? "secondary" : "outline"}>
            {progress.toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target</span>
            <span className="font-semibold">{fromMinor(monthlyTarget, "DKK")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Actual (Won)</span>
            <span className="font-medium text-[#6b7c5e]">{fromMinor(actualRevenue, "DKK")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Forecasted</span>
            <span className="font-medium text-[#7a9db3]">{fromMinor(forecastedRevenue, "DKK")}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Projected Total</span>
            <span className="font-semibold">{fromMinor(projectedRevenue, "DKK")}</span>
          </div>
        </div>

        <Progress value={Math.min(progress, 100)} className="h-2" />

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground">Gap to Target</div>
            <div className={cn(
              "text-sm font-medium",
              gap > 0 ? "text-destructive" : "text-success"
            )}>
              {gap > 0 ? fromMinor(gap, "DKK") : "Target Met!"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Days Remaining</div>
            <div className="text-sm font-medium">{formatNumber(daysRemaining)} days</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Confidence</div>
            <div className="text-sm font-medium">{formatNumber(confidence)}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Active Deals</div>
            <div className="text-sm font-medium">{formatNumber(activeDeals.length)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

