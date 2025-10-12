import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, Target, Activity } from 'lucide-react';
import { ForecastSummary } from '@/services/forecasting';
import { formatCurrency } from '@/services/analytics';

interface ForecastSummaryCardProps {
  summary: ForecastSummary;
}

export function ForecastSummaryCard({ summary }: ForecastSummaryCardProps) {
  const confidenceColors = {
    high: 'bg-[#b5c69f]',
    medium: 'bg-[#d4a574]',
    low: 'bg-[#fb8674]',
  };

  const confidenceLabels = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence',
  };

  const healthScoreColor = (score: number) => {
    if (score >= 75) return 'text-[#6b7c5e]';
    if (score >= 50) return 'text-[#9d855e]';
    return 'text-[#b8695f]';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Forecast
          </CardTitle>
          <Badge variant="outline" className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${confidenceColors[summary.confidence]}`} />
            {confidenceLabels[summary.confidence]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Next Month */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Next Month
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.nextMonthRevenue)}
            </div>
          </div>

          {/* Next Quarter */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Next Quarter
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.nextQuarterRevenue)}
            </div>
          </div>

          {/* Expected Deals */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Expected Deals to Close
            </div>
            <div className="text-2xl font-bold">{summary.expectedDealsToClose}</div>
            <p className="text-xs text-muted-foreground">
              Based on current pipeline
            </p>
          </div>

          {/* Pipeline Health */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              Pipeline Health Score
            </div>
            <div className={`text-2xl font-bold ${healthScoreColor(summary.pipelineHealthScore)}`}>
              {summary.pipelineHealthScore.toFixed(0)}/100
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.pipelineHealthScore >= 75
                ? 'Strong and stable'
                : summary.pipelineHealthScore >= 50
                ? 'Moderate stability'
                : 'Needs attention'}
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
          <p className="text-muted-foreground">
            Forecast based on {summary.confidence === 'high' ? '12+ months' : summary.confidence === 'medium' ? '6+ months' : '3+ months'} of
            historical revenue data using linear regression analysis with 95% confidence
            intervals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

