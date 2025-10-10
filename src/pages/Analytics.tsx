import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Target,
    BarChart3,
    PieChart,
    Calendar,
    Download,
    RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useAnalytics, formatCurrency, formatPercentage, formatGrowth } from "@/services/analytics";
import { DateRange } from "@/services/analytics";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { logger } from '@/lib/logger';

// Chart components (simplified for now - would use a proper charting library like Recharts)
function RevenueTrendChart({ data }: { data: any[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No data available
            </div>
        );
    }

    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxDeals = Math.max(...data.map(d => d.deals));

    return (
        <div className="space-y-4">
            <div className="h-64 flex items-end space-x-2">
                {data.map((point, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                        <div className="w-full flex flex-col items-center space-y-1">
                            <div
                                className="w-full bg-primary rounded-t"
                                style={{ height: `${(point.revenue / maxRevenue) * 200}px` }}
                                title={`Revenue: ${formatCurrency(point.revenue)}`}
                            />
                            <div
                                className="w-full bg-accent rounded-t"
                                style={{ height: `${(point.deals / maxDeals) * 100}px` }}
                                title={`Deals: ${point.deals}`}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded"></div>
                    <span>Revenue</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-accent rounded"></div>
                    <span>Deals</span>
                </div>
            </div>
        </div>
    );
}

function PipelineChart({ data }: { data: any[] }) {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
                No data available
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.totalValue));

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {data.map((stage, index) => (
                    <div key={stage.stageId} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{stage.stageName}</span>
                            <div className="flex items-center space-x-4 text-muted-foreground">
                                <span>{stage.dealCount} deals</span>
                                <span>{formatCurrency(stage.totalValue)}</span>
                                <span>{formatPercentage(stage.conversionRate)}</span>
                            </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                            <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(stage.totalValue / maxValue) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function KPICard({
    title,
    value,
    growth,
    target,
    progress,
    icon: Icon,
    format = 'number'
}: {
    title: string;
    value: number;
    growth: number;
    target: number;
    progress: number;
    icon: React.ComponentType<any>;
    format?: 'number' | 'currency' | 'percentage';
}) {
    const formatValue = (val: number) => {
        switch (format) {
            case 'currency':
                return formatCurrency(val);
            case 'percentage':
                return formatPercentage(val);
            default:
                return val.toLocaleString();
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatValue(value)}</div>
                <div className="flex items-center space-x-2 mt-2">
                    <div className="flex items-center space-x-1">
                        {growth >= 0 ? (
                            <TrendingUp className="h-3 w-3 text-success" />
                        ) : (
                            <TrendingDown className="h-3 w-3 text-destructive" />
                        )}
                        <span className={cn(
                            "text-xs",
                            growth >= 0 ? "text-success" : "text-destructive"
                        )}>
                            {formatGrowth(growth)}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                        vs target: {formatValue(target)}
                    </span>
                </div>
                <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Progress</span>
                        <span>{formatPercentage(progress)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Analytics() {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

    const { revenueTrends, pipelineAnalysis, performanceMetrics, kpiData, isLoading } = useAnalytics(dateRange);

    const handlePeriodChange = (period: string) => {
        setSelectedPeriod(period);

        const now = new Date();
        let start: Date;
        let end: Date = now;

        switch (period) {
            case "7d":
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case "1y":
                start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case "ytd":
                start = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                setDateRange(undefined);
                return;
        }

        setDateRange({ start, end });
    };

    const handleCustomDateRange = (range: DateRange | undefined) => {
        setDateRange(range);
        setSelectedPeriod("custom");
    };

    const handleExport = () => {
        // TODO: Implement export functionality
        logger.debug("Export analytics data");
    };

    const handleRefresh = () => {
        // TODO: Implement refresh functionality
        window.location.reload();
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <PageHeader
                title="Analytics & Reporting"
                actions={
                    <div className="flex items-center space-x-2">
                        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="7d">Last 7 days</SelectItem>
                                <SelectItem value="30d">Last 30 days</SelectItem>
                                <SelectItem value="90d">Last 90 days</SelectItem>
                                <SelectItem value="1y">Last year</SelectItem>
                                <SelectItem value="ytd">Year to date</SelectItem>
                                <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>
                        {selectedPeriod === "custom" && (
                            <DateRangePicker
                                value={dateRange}
                                onChange={handleCustomDateRange}
                                placeholder="Select custom range"
                            />
                        )}
                        <Button variant="outline" size="sm" onClick={handleRefresh}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                }
            />

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                        <Card key={index}>
                            <CardHeader className="space-y-0 pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32 mb-2" />
                                <Skeleton className="h-3 w-16" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <>
                        <KPICard
                            title="Total Revenue"
                            value={kpiData.revenue.current}
                            growth={kpiData.revenue.growth}
                            target={kpiData.revenue.target}
                            progress={kpiData.revenue.progress}
                            icon={DollarSign}
                            format="currency"
                        />
                        <KPICard
                            title="Total Deals"
                            value={kpiData.deals.current}
                            growth={kpiData.deals.growth}
                            target={kpiData.deals.target}
                            progress={kpiData.deals.progress}
                            icon={Target}
                            format="number"
                        />
                        <KPICard
                            title="Win Rate"
                            value={kpiData.winRate.current}
                            growth={kpiData.winRate.growth}
                            target={kpiData.winRate.target}
                            progress={kpiData.winRate.progress}
                            icon={TrendingUp}
                            format="percentage"
                        />
                        <KPICard
                            title="Avg Deal Size"
                            value={kpiData.averageDealSize.current}
                            growth={kpiData.averageDealSize.growth}
                            target={kpiData.averageDealSize.target}
                            progress={kpiData.averageDealSize.progress}
                            icon={BarChart3}
                            format="currency"
                        />
                    </>
                )}
            </div>

            {/* Revenue Trends */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Revenue Trends
                    </CardTitle>
                    <CardDescription>
                        Monthly revenue and deal activity over time
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : (
                        <RevenueTrendChart data={revenueTrends} />
                    )}
                </CardContent>
            </Card>

            {/* Pipeline Analysis */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5" />
                            Pipeline Analysis
                        </CardTitle>
                        <CardDescription>
                            Deal distribution and conversion rates by stage
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-64 w-full" />
                        ) : (
                            <PipelineChart data={pipelineAnalysis} />
                        )}
                    </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Performance Metrics
                        </CardTitle>
                        <CardDescription>
                            Key performance indicators and conversion rates
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 6 }).map((_, index) => (
                                    <div key={index} className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-2 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Quote to Order</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatPercentage(performanceMetrics.quoteToOrderConversion)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Order to Invoice</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatPercentage(performanceMetrics.orderToInvoiceConversion)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Invoice to Payment</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatPercentage(performanceMetrics.invoiceToPaymentConversion)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Average Sales Cycle</span>
                                    <span className="text-sm text-muted-foreground">
                                        {performanceMetrics.averageSalesCycle} days
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Total Deals</span>
                                    <span className="text-sm text-muted-foreground">
                                        {performanceMetrics.totalDeals}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Total Revenue</span>
                                    <span className="text-sm text-muted-foreground">
                                        {formatCurrency(performanceMetrics.totalRevenue)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
