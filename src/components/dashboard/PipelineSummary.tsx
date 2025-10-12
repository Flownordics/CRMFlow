import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeals } from "@/services/deals";
import { usePipelines } from "@/services/pipelines";
import { fromMinor, formatNumber } from "@/lib/money";
import { TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface StageMetrics {
  id: string;
  name: string;
  dealCount: number;
  totalValue: number;
  percentage: number;
  color: string;
}

export function PipelineSummary() {
  const navigate = useNavigate();
  const { data: deals, isLoading: dealsLoading } = useDeals({ limit: 5000 });
  const { data: pipelines, isLoading: pipelinesLoading } = usePipelines();

  const isLoading = dealsLoading || pipelinesLoading;

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sales Pipeline
          </CardTitle>
          <CardDescription>Deal distribution across stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pipelines || pipelines.length === 0 || !deals?.data) {
    return null;
  }

  // Get first pipeline and its stages
  const pipeline = pipelines[0];
  const stages = pipeline.stages || [];

  // Calculate metrics per stage
  const stageMetrics: StageMetrics[] = stages.map(stage => {
    const stageDeals = deals.data.filter(deal => deal.stage_id === stage.id);
    const totalValue = stageDeals.reduce((sum, deal) => sum + deal.expected_value_minor, 0);
    
    return {
      id: stage.id,
      name: stage.name,
      dealCount: stageDeals.length,
      totalValue,
      percentage: 0, // Will calculate below
      color: getStageColor(stage.name)
    };
  });

  // Calculate total pipeline value
  const totalPipelineValue = stageMetrics.reduce((sum, stage) => sum + stage.totalValue, 0);

  // Calculate percentages
  stageMetrics.forEach(stage => {
    stage.percentage = totalPipelineValue > 0 ? (stage.totalValue / totalPipelineValue) * 100 : 0;
  });

  // Calculate conversion rates between consecutive stages
  const conversionRates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < stageMetrics.length - 1; i++) {
    const current = stageMetrics[i];
    const next = stageMetrics[i + 1];
    
    if (current.dealCount > 0) {
      conversionRates.push({
        from: current.name,
        to: next.name,
        rate: (next.dealCount / current.dealCount) * 100
      });
    }
  }

  return (
    <Card className="rounded-2xl border shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sales Pipeline
            </CardTitle>
            <CardDescription>
              {formatNumber(deals.data.length)} deals • {fromMinor(totalPipelineValue, "DKK")} total value
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {pipeline.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {stageMetrics.map((stage) => (
            <div
              key={stage.id}
              className={cn(
                "p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md",
                stage.color
              )}
              onClick={() => navigate(`/deals?stage=${stage.id}`)}
            >
              <div className="text-xs font-medium text-muted-foreground mb-1">
                {stage.name}
              </div>
              <div className="text-2xl font-bold mb-1">
                {formatNumber(stage.dealCount)}
              </div>
              <div className="text-sm text-muted-foreground">
                {fromMinor(stage.totalValue, "DKK")}
              </div>
              {stage.percentage > 0 && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {stage.percentage.toFixed(1)}%
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Visual Pipeline Bar */}
        <div className="h-4 flex rounded-full overflow-hidden">
          {stageMetrics.map((stage, index) => (
            stage.percentage > 0 && (
              <div
                key={stage.id}
                className={cn("transition-all", getBarColor(stage.name))}
                style={{ width: `${stage.percentage}%` }}
                title={`${stage.name}: ${stage.percentage.toFixed(1)}%`}
              />
            )
          ))}
        </div>

        {/* Conversion Rates */}
        {conversionRates.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm font-medium mb-2">Conversion Rates</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {conversionRates.map((conv, index) => (
                <div key={index} className="text-xs">
                  <span className="text-muted-foreground">{conv.from} → {conv.to}:</span>
                  <span className={cn(
                    "ml-1 font-medium",
                    conv.rate >= 50 ? "text-[#6b7c5e]" : conv.rate >= 25 ? "text-[#9d855e]" : "text-[#b8695f]"
                  )}>
                    {conv.rate.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStageColor(stageName: string): string {
  const name = stageName.toLowerCase();
  
  if (name.includes('lead') || name.includes('new')) return 'border-[#d0dfe8] bg-[#eff4f7]';
  if (name.includes('qual')) return 'border-[#d0e9e5] bg-[#f0f5f4]';
  if (name.includes('prop') || name.includes('presentation')) return 'border-[#ddd8e6] bg-[#f5f2f8]';
  if (name.includes('neg') || name.includes('negotiation')) return 'border-[#e8dac8] bg-[#faf5ef]';
  if (name.includes('won') || name.includes('closed won')) return 'border-[#d4dcc8] bg-[#f0f4ec]';
  if (name.includes('lost') || name.includes('closed lost')) return 'border-[#fdd9d3] bg-[#fef2f0]';
  
  return 'border-gray-200 bg-gray-50';
}

function getBarColor(stageName: string): string {
  const name = stageName.toLowerCase();
  
  if (name.includes('lead') || name.includes('new')) return 'bg-[#7a9db3]';
  if (name.includes('qual')) return 'bg-[#7fa39b]';
  if (name.includes('prop') || name.includes('presentation')) return 'bg-[#9d94af]';
  if (name.includes('neg') || name.includes('negotiation')) return 'bg-[#d4a574]';
  if (name.includes('won') || name.includes('closed won')) return 'bg-[#b5c69f]';
  if (name.includes('lost') || name.includes('closed lost')) return 'bg-[#fb8674]';
  
  return 'bg-gray-500';
}

