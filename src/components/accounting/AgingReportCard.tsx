import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AgingBucket } from "@/services/accounting";
import { AgingReportTable } from "./AgingReportTable";
import { formatMoneyMinor } from "@/lib/money";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgingReportCardProps {
  buckets: AgingBucket[];
  currency: string;
}

const bucketConfig: Record<string, { 
  label: string; 
  shortLabel: string;
  bgColor: string;
  barColor: string;
  textColor: string;
}> = {
  "0-30": { 
    label: "0-30 Days Overdue", 
    shortLabel: "0-30",
    bgColor: "bg-[#faf5ef] dark:bg-[#9d855e]/10", 
    barColor: "bg-[#9d855e]", // Muted gold
    textColor: "text-[#9d855e]"
  },
  "31-60": { 
    label: "31-60 Days Overdue", 
    shortLabel: "31-60",
    bgColor: "bg-[#faf3ed] dark:bg-[#b8947a]/10", 
    barColor: "bg-[#b8947a]", // Muted warm
    textColor: "text-[#b8947a]"
  },
  "61-90": { 
    label: "61-90 Days Overdue", 
    shortLabel: "61-90",
    bgColor: "bg-[#fef2f0] dark:bg-[#b8695f]/10", 
    barColor: "bg-[#b8695f]", // Muted coral
    textColor: "text-[#b8695f]"
  },
  "90+": { 
    label: "90+ Days Overdue", 
    shortLabel: "90+",
    bgColor: "bg-[#fcefed] dark:bg-[#a05d54]/10", 
    barColor: "bg-[#a05d54]", // Darker muted coral
    textColor: "text-[#a05d54]"
  },
};

export function AgingReportCard({ buckets, currency }: AgingReportCardProps) {
  const [selectedBucket, setSelectedBucket] = useState<AgingBucket | null>(null);

  const totalOverdue = buckets.reduce((sum, b) => sum + b.total_minor, 0);
  const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <>
      <Card className="p-4 overflow-hidden relative">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" focusable="false" />
            <h2 className="text-base font-semibold">Aging Analysis</h2>
          </div>
          <p className="text-xs text-muted-foreground">Overdue receivables by age</p>
        </div>

        {totalCount === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No overdue invoices</p>
            <p className="text-xs text-muted-foreground mt-1">Great job staying on top of receivables!</p>
          </div>
        ) : (
          <>
            {/* Visual Bar Chart */}
            <div className="space-y-3 mb-4">
              {buckets.map((bucket) => {
                const config = bucketConfig[bucket.bucket];
                const percentage = totalOverdue > 0 ? (bucket.total_minor / totalOverdue) * 100 : 0;
                
                return (
                  <button
                    key={bucket.bucket}
                    onClick={() => bucket.count > 0 && setSelectedBucket(bucket)}
                    disabled={bucket.count === 0}
                    className={cn(
                      "w-full text-left transition-all duration-200 group",
                      bucket.count > 0 && "cursor-pointer hover:scale-[1.02]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold",
                          config.bgColor,
                          config.textColor
                        )}>
                          {config.shortLabel}
                        </div>
                        <span className="text-xs font-medium text-foreground">
                          {bucket.count} invoice{bucket.count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className={cn("text-sm font-semibold", config.textColor)}>
                        {formatMoneyMinor(bucket.total_minor, currency)}
                      </span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          bucket.count > 0 ? config.barColor : 'bg-transparent'
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Total Summary */}
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total Overdue</span>
                <span className="text-lg font-bold text-[#b8695f]">
                  {formatMoneyMinor(totalOverdue, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Invoices</span>
                <span className="text-sm font-medium">{totalCount}</span>
              </div>
            </div>
          </>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBucket} onOpenChange={() => setSelectedBucket(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBucket && bucketConfig[selectedBucket.bucket].label} Overdue
            </DialogTitle>
            <DialogDescription>
              Detailed list of invoices in this aging bucket
            </DialogDescription>
          </DialogHeader>
          {selectedBucket && (
            <AgingReportTable bucket={selectedBucket} currency={currency} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

