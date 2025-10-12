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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    PieChart as PieChartIcon,
    Download,
    RefreshCw,
    Activity,
    Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import { useAnalytics, formatCurrency, formatPercentage, formatGrowth } from "@/services/analytics";
import { DateRange } from "@/services/analytics";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { logger } from '@/lib/logger';

// New Recharts components
import { RevenueChart } from "@/components/analytics/charts/RevenueChart";
import { PipelineChart } from "@/components/analytics/charts/PipelineChart";
import { WinRateChart } from "@/components/analytics/charts/WinRateChart";
import { SalesFunnelChart } from "@/components/analytics/charts/SalesFunnelChart";

// Activity analytics
import { useActivityAnalytics } from "@/services/activityAnalytics";
import { ActivityTimelineChart } from "@/components/analytics/charts/ActivityTimelineChart";
import { ActivityDistributionChart } from "@/components/analytics/charts/ActivityDistributionChart";
import { CallOutcomesChart } from "@/components/analytics/charts/CallOutcomesChart";
import { ActivityMetricsCard } from "@/components/analytics/ActivityMetricsCard";

// Salesperson analytics
import { useSalespersonAnalytics } from "@/services/salespersonAnalytics";
import { SalespersonLeaderboard } from "@/components/analytics/SalespersonLeaderboard";
import { SalespersonComparisonChart } from "@/components/analytics/charts/SalespersonComparisonChart";

// Forecasting
import { useForecast } from "@/services/forecasting";
import { ForecastChart } from "@/components/analytics/charts/ForecastChart";
import { ForecastSummaryCard } from "@/components/analytics/ForecastSummaryCard";

// Additional insights
import { CompanyHealthSection } from "@/components/analytics/CompanyHealthSection";
import { DealVelocityCard } from "@/components/analytics/DealVelocityCard";
import { QuoteToCashSection } from "@/components/analytics/QuoteToCashSection";

// Export utilities
import { exportAnalyticsToCSV, exportActivitiesToCSV, exportSalespersonDataToCSV } from "@/services/export/csvExport";
import { downloadAnalyticsPDF } from "@/services/export/analyticsPDFService";
import { convertMultipleCharts, waitForChartAnimations } from "@/utils/chartToImage";

// Old chart components removed - now using Recharts

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
    const [activeTab, setActiveTab] = useState<string>("overview");

    const { revenueTrends, pipelineAnalysis, performanceMetrics, kpiData, isLoading } = useAnalytics(dateRange);
    const { data: activityData, isLoading: activityLoading } = useActivityAnalytics(dateRange);
    const { data: salespersonData, isLoading: salespersonLoading } = useSalespersonAnalytics(dateRange);
    const { data: forecastData, isLoading: forecastLoading } = useForecast(dateRange);

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

    const handleExport = (format: 'csv' | 'pdf' = 'csv') => {
        logger.debug("Exporting analytics data", { tab: activeTab, format });
        
        try {
            if (format === 'csv') {
                if (activeTab === "activity" && activityData) {
                    exportActivitiesToCSV(activityData.metrics, dateRange);
                } else if (activeTab === "team" && salespersonData) {
                    exportSalespersonDataToCSV(salespersonData.salespeople, dateRange);
                } else {
                    // Export main analytics
                    exportAnalyticsToCSV(
                        { kpiData, performanceMetrics, revenueTrends, pipelineAnalysis },
                        dateRange
                    );
                }
            } else if (format === 'pdf') {
                handleExportPDF();
            }
        } catch (error) {
            logger.error("Failed to export analytics", error);
        }
    };

    const handleExportPDF = async () => {
        try {
            logger.debug("Generating PDF report");
            
            // Wait for charts to render
            await waitForChartAnimations(500);
            
            // Collect chart elements
            const chartElements = new Map<string, HTMLElement>();
            
            // Find all chart containers by their data attributes or classes
            const chartContainers = document.querySelectorAll('[data-chart-name]');
            chartContainers.forEach((container) => {
                const chartName = container.getAttribute('data-chart-name');
                if (chartName) {
                    chartElements.set(chartName, container as HTMLElement);
                }
            });
            
            // Convert charts to images
            const chartImages = await convertMultipleCharts(chartElements, {
                format: 'png',
                backgroundColor: '#ffffff',
            });
            
            // Prepare PDF data
            const pdfData = {
                dateRange,
                kpiData,
                performanceMetrics,
                charts: chartImages,
                activityMetrics: activityData?.metrics,
                salespersonData: salespersonData?.salespeople,
                forecastSummary: forecastData?.summary,
            };
            
            // Generate filename
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `analytics-report-${timestamp}.pdf`;
            
            // Download PDF
            await downloadAnalyticsPDF(pdfData, filename);
        } catch (error) {
            logger.error("Failed to generate PDF", error);
        }
    };

    const handleRefresh = () => {
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
                        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                        </Button>
                    </div>
                }
            />

            {/* Tabbed Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
                    <TabsTrigger value="overview">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="pipeline">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Pipeline
                    </TabsTrigger>
                    <TabsTrigger value="activity">
                        <Activity className="h-4 w-4 mr-2" />
                        Activity
                    </TabsTrigger>
                    <TabsTrigger value="team">
                        <Users className="h-4 w-4 mr-2" />
                        Team
                    </TabsTrigger>
                    <TabsTrigger value="forecast">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Forecast
                    </TabsTrigger>
                    <TabsTrigger value="insights">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Insights
                    </TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
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
                                <div data-chart-name="Revenue Trends">
                                    <RevenueChart data={revenueTrends} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Combined Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="h-5 w-5" />
                                    Win Rate Distribution
                                </CardTitle>
                                <CardDescription>
                                    Breakdown of deals by status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <div data-chart-name="Win Rate Distribution">
                                        <WinRateChart
                                            wonDeals={performanceMetrics.wonDeals || 0}
                                            lostDeals={performanceMetrics.lostDeals || 0}
                                            openDeals={performanceMetrics.openDeals || 0}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Sales Funnel
                                </CardTitle>
                                <CardDescription>
                                    Conversion through sales stages
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoading ? (
                                    <Skeleton className="h-64 w-full" />
                                ) : (
                                    <div data-chart-name="Sales Funnel">
                                        <SalesFunnelChart
                                            dealsCount={performanceMetrics.totalDeals || 0}
                                            dealsValue={performanceMetrics.totalRevenue || 0}
                                            quotesCount={performanceMetrics.totalQuotes || 0}
                                            quotesValue={performanceMetrics.quotesValue || 0}
                                            ordersCount={performanceMetrics.totalOrders || 0}
                                            ordersValue={performanceMetrics.ordersValue || 0}
                                            invoicesCount={performanceMetrics.totalInvoices || 0}
                                            invoicesValue={performanceMetrics.invoicesValue || 0}
                                            paidCount={performanceMetrics.paidInvoices || 0}
                                            paidValue={performanceMetrics.totalRevenue || 0}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

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
                </TabsContent>

                {/* PIPELINE TAB */}
                <TabsContent value="pipeline" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Pipeline Analysis
                            </CardTitle>
                            <CardDescription>
                                Deal distribution and conversion rates by stage
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-96 w-full" />
                            ) : (
                                <div data-chart-name="Pipeline Analysis">
                                    <PipelineChart data={pipelineAnalysis} height={400} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="space-y-6">
                    {activityLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : activityData ? (
                        <>
                            <ActivityMetricsCard metrics={activityData.metrics} />
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5" />
                                        Activity Timeline
                                    </CardTitle>
                                    <CardDescription>
                                        Activity trends over time by type
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div data-chart-name="Activity Timeline">
                                        <ActivityTimelineChart data={activityData.timeline} height={350} />
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5" />
                                            Activity Distribution
                                        </CardTitle>
                                        <CardDescription>
                                            Breakdown of activities by type
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ActivityDistributionChart data={activityData.distribution} />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <PieChartIcon className="h-5 w-5" />
                                            Call Outcomes
                                        </CardTitle>
                                        <CardDescription>
                                            Success rates and outcome distribution
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div data-chart-name="Call Outcomes">
                                            <CallOutcomesChart data={activityData.callOutcomes} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground py-12">
                            No activity data available
                        </div>
                    )}
                </TabsContent>

                {/* TEAM TAB */}
                <TabsContent value="team" className="space-y-6">
                    {salespersonLoading ? (
                        <Skeleton className="h-96 w-full" />
                    ) : salespersonData && salespersonData.salespeople.length > 0 ? (
                        <>
                            <SalespersonLeaderboard salespeople={salespersonData.salespeople} />
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team Performance Comparison</CardTitle>
                                    <CardDescription>
                                        Compare metrics across team members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SalespersonComparisonChart 
                                        salespeople={salespersonData.salespeople}
                                        height={400}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="text-center text-muted-foreground py-12">
                                No team performance data available
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* FORECAST TAB */}
                <TabsContent value="forecast" className="space-y-6">
                    {forecastLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-96 w-full" />
                        </div>
                    ) : forecastData ? (
                        <>
                            <ForecastSummaryCard summary={forecastData.summary} />
                            
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        Revenue Forecast (Next 6 Months)
                                    </CardTitle>
                                    <CardDescription>
                                        Historical data with projected revenue and confidence intervals
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div data-chart-name="Revenue Forecast">
                                        <ForecastChart data={forecastData.forecastData} height={400} />
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card>
                            <CardContent className="text-center text-muted-foreground py-12">
                                Not enough historical data for forecasting
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* INSIGHTS TAB */}
                <TabsContent value="insights" className="space-y-6">
                    <CompanyHealthSection />
                    <DealVelocityCard />
                    <QuoteToCashSection />
                </TabsContent>
            </Tabs>
        </div>
    );
}
