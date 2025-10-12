import { formatMoneyMinor } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { FileText, Send, TrendingUp } from "lucide-react";
import { Quote } from "@/services/quotes";

interface QuotesKpiHeaderProps {
    quotes: Quote[];
    currency?: string;
}

export function QuotesKpiHeader({ quotes, currency = "DKK" }: QuotesKpiHeaderProps) {
    const totalCount = quotes.length;
    const totalValueMinor = quotes.reduce((sum, q) => sum + (q.total_minor || 0), 0);

    const byStatus = quotes.reduce((acc, q) => {
        acc[q.status] = (acc[q.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sentCount = byStatus.sent || 0;
    const declinedCount = byStatus.declined || 0;
    const hitRate = sentCount > 0 ? Math.round(((sentCount - declinedCount) / sentCount) * 100) : 0;

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Total quotes</div>
                        <div className="text-h2">{totalCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            Value: {formatMoneyMinor(totalValueMinor, currency)}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Sent quotes</div>
                        <div className="text-h2">{sentCount}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {sentCount > 0 ? `${Math.round((sentCount / totalCount) * 100)}% of total` : "No quotes sent"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-info/10">
                        <Send className="h-4 w-4 text-info" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-info/5 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Draft quotes</div>
                        <div className="text-h2">{byStatus.draft || 0}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {(byStatus.draft || 0) > 0 ? `${Math.round(((byStatus.draft || 0) / totalCount) * 100)}% of total` : "No draft quotes"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-[hsl(210,5%,39%)]/15">
                        <FileText className="h-4 w-4 text-[hsl(210,5%,35%)]" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[hsl(210,5%,39%)]/10 to-transparent" aria-hidden="true" />
            </Card>

            <Card className="p-4 overflow-hidden relative">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-xs text-muted-foreground">Success rate</div>
                        <div className="text-h2">{hitRate}%</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {sentCount > 0 ? `${sentCount - declinedCount} of ${sentCount} sent` : "No quotes sent yet"}
                        </div>
                    </div>
                    <div className="rounded-full p-2 bg-accent/10">
                        <TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-accent/5 to-transparent" aria-hidden="true" />
            </Card>
        </div>
    );
}
