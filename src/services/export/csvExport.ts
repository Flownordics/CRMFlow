// CSV Export utilities for analytics data

import { formatCurrency, formatPercentage } from '../analytics';
import { SalespersonMetrics } from '../salespersonAnalytics';
import { ActivityMetrics } from '../activityAnalytics';

interface AnalyticsData {
  kpiData: any;
  performanceMetrics: any;
  revenueTrends: any[];
  pipelineAnalysis: any[];
}

// Helper to convert data to CSV format
function convertToCSV(data: any[][], headers: string[]): string {
  const rows = [headers, ...data];
  return rows
    .map((row) =>
      row.map((cell) => {
        // Escape quotes and wrap in quotes if contains comma
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
    .join('\n');
}

// Helper to download CSV file
function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export main analytics data
export function exportAnalyticsToCSV(
  data: AnalyticsData,
  dateRange?: { start: Date; end: Date }
) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `analytics-report-${timestamp}.csv`;
  
  // Metadata section
  const metadata = [
    ['Analytics Report'],
    ['Generated:', new Date().toLocaleString()],
    ...(dateRange
      ? [
          [
            'Period:',
            `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
          ],
        ]
      : []),
    [''],
  ];
  
  // KPI Summary
  const kpiHeaders = ['Metric', 'Current', 'Target', 'Growth', 'Progress'];
  const kpiRows = [
    [
      'Revenue',
      formatCurrency(data.kpiData.revenue.current),
      formatCurrency(data.kpiData.revenue.target),
      formatPercentage(data.kpiData.revenue.growth),
      formatPercentage(data.kpiData.revenue.progress),
    ],
    [
      'Deals',
      data.kpiData.deals.current.toString(),
      data.kpiData.deals.target.toString(),
      formatPercentage(data.kpiData.deals.growth),
      formatPercentage(data.kpiData.deals.progress),
    ],
    [
      'Win Rate',
      formatPercentage(data.kpiData.winRate.current),
      formatPercentage(data.kpiData.winRate.target),
      formatPercentage(data.kpiData.winRate.growth),
      formatPercentage(data.kpiData.winRate.progress),
    ],
    [
      'Avg Deal Size',
      formatCurrency(data.kpiData.averageDealSize.current),
      formatCurrency(data.kpiData.averageDealSize.target),
      formatPercentage(data.kpiData.averageDealSize.growth),
      formatPercentage(data.kpiData.averageDealSize.progress),
    ],
  ];
  
  // Performance Metrics
  const performanceHeaders = ['Metric', 'Value'];
  const performanceRows = [
    ['Quote to Order Conversion', formatPercentage(data.performanceMetrics.quoteToOrderConversion)],
    ['Order to Invoice Conversion', formatPercentage(data.performanceMetrics.orderToInvoiceConversion)],
    ['Invoice to Payment Conversion', formatPercentage(data.performanceMetrics.invoiceToPaymentConversion)],
    ['Average Sales Cycle (days)', data.performanceMetrics.averageSalesCycle.toString()],
    ['Total Deals', data.performanceMetrics.totalDeals.toString()],
    ['Total Revenue', formatCurrency(data.performanceMetrics.totalRevenue)],
  ];
  
  // Revenue Trends
  const revenueHeaders = ['Date', 'Revenue', 'Deals'];
  const revenueRows = data.revenueTrends.map((point) => [
    new Date(point.date).toLocaleDateString(),
    formatCurrency(point.revenue),
    point.deals.toString(),
  ]);
  
  // Pipeline Analysis
  const pipelineHeaders = ['Stage', 'Deal Count', 'Total Value', 'Conversion Rate'];
  const pipelineRows = data.pipelineAnalysis.map((stage) => [
    stage.stageName,
    stage.dealCount.toString(),
    formatCurrency(stage.totalValue),
    formatPercentage(stage.conversionRate),
  ]);
  
  // Combine all sections
  const csvContent = [
    ...metadata.map((row) => row.join(',')),
    '',
    'KEY PERFORMANCE INDICATORS',
    convertToCSV(kpiRows, kpiHeaders),
    '',
    'PERFORMANCE METRICS',
    convertToCSV(performanceRows, performanceHeaders),
    '',
    'REVENUE TRENDS',
    convertToCSV(revenueRows, revenueHeaders),
    '',
    'PIPELINE ANALYSIS',
    convertToCSV(pipelineRows, pipelineHeaders),
  ].join('\n');
  
  downloadCSV(filename, csvContent);
}

// Export activities data
export function exportActivitiesToCSV(
  metrics: ActivityMetrics,
  dateRange?: { start: Date; end: Date }
) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `activities-report-${timestamp}.csv`;
  
  const metadata = [
    ['Activity Report'],
    ['Generated:', new Date().toLocaleString()],
    ...(dateRange
      ? [
          [
            'Period:',
            `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
          ],
        ]
      : []),
    [''],
  ];
  
  const headers = ['Activity Type', 'Count', 'Success Rate', 'Percentage'];
  const rows = [
    [
      'Calls',
      metrics.callCount.toString(),
      formatPercentage(metrics.callSuccessRate),
      formatPercentage((metrics.callCount / metrics.totalActivities) * 100),
    ],
    [
      'Emails',
      metrics.emailCount.toString(),
      formatPercentage(metrics.emailSuccessRate),
      formatPercentage((metrics.emailCount / metrics.totalActivities) * 100),
    ],
    [
      'Meetings',
      metrics.meetingCount.toString(),
      formatPercentage(metrics.meetingSuccessRate),
      formatPercentage((metrics.meetingCount / metrics.totalActivities) * 100),
    ],
    [
      'Notes',
      metrics.noteCount.toString(),
      '-',
      formatPercentage((metrics.noteCount / metrics.totalActivities) * 100),
    ],
    [
      'Tasks',
      metrics.taskCount.toString(),
      '-',
      formatPercentage((metrics.taskCount / metrics.totalActivities) * 100),
    ],
  ];
  
  const summaryRows = [
    ['Total Activities', metrics.totalActivities.toString()],
    ['Avg Activities per Day', metrics.avgActivitiesPerDay.toFixed(2)],
    ['Avg Activities per Company', metrics.avgActivitiesPerCompany.toFixed(2)],
    ['Growth vs Previous Period', formatPercentage(metrics.activitiesGrowth)],
  ];
  
  const csvContent = [
    ...metadata.map((row) => row.join(',')),
    '',
    'ACTIVITY BREAKDOWN',
    convertToCSV(rows, headers),
    '',
    'SUMMARY METRICS',
    convertToCSV(summaryRows, ['Metric', 'Value']),
  ].join('\n');
  
  downloadCSV(filename, csvContent);
}

// Export salesperson data
export function exportSalespersonDataToCSV(
  salespeople: SalespersonMetrics[],
  dateRange?: { start: Date; end: Date }
) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `salesperson-performance-${timestamp}.csv`;
  
  const metadata = [
    ['Salesperson Performance Report'],
    ['Generated:', new Date().toLocaleString()],
    ...(dateRange
      ? [
          [
            'Period:',
            `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
          ],
        ]
      : []),
    [''],
  ];
  
  const headers = [
    'Name',
    'Email',
    'Revenue',
    'Revenue Growth',
    'Deals Won',
    'Deals Lost',
    'Open Deals',
    'Win Rate',
    'Avg Deal Size',
    'Pipeline Value',
    'Activities',
    'Calls',
    'Emails',
    'Meetings',
    'Activities per Deal',
  ];
  
  const rows = salespeople.map((person) => [
    person.userName,
    person.userEmail,
    formatCurrency(person.totalRevenue),
    formatPercentage(person.revenueGrowth),
    person.wonDeals.toString(),
    person.lostDeals.toString(),
    person.openDeals.toString(),
    formatPercentage(person.winRate),
    formatCurrency(person.averageDealSize),
    formatCurrency(person.pipelineValue),
    person.totalActivities.toString(),
    person.callCount.toString(),
    person.emailCount.toString(),
    person.meetingCount.toString(),
    person.activitiesToConversion.toFixed(1),
  ]);
  
  const csvContent = [
    ...metadata.map((row) => row.join(',')),
    convertToCSV(rows, headers),
  ].join('\n');
  
  downloadCSV(filename, csvContent);
}

