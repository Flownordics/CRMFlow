// Netlify Function - Analytics PDF Report Generator
import { createClient } from '@supabase/supabase-js';
import { renderToStream, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import React from 'react';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper functions
const formatCurrency = (value, currency = 'DKK') => {
  const amount = value / 100;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('da-DK');
};

// Create Analytics PDF Document
const createAnalyticsPDF = (data) => {
  const { dateRange, kpiData, performanceMetrics, charts, activityMetrics, salespersonData, forecastSummary } = data;
  
  const styles = StyleSheet.create({
    page: { 
      padding: 40, 
      fontSize: 10, 
      fontFamily: 'Helvetica', 
      backgroundColor: '#FFFFFF' 
    },
    
    // Header styles
    header: { 
      marginBottom: 30, 
      borderBottom: '2px solid #3b82f6',
      paddingBottom: 15
    },
    title: { 
      fontSize: 24, 
      fontWeight: 'bold', 
      color: '#1e40af',
      marginBottom: 5
    },
    subtitle: { 
      fontSize: 12, 
      color: '#6b7280',
      marginBottom: 10
    },
    dateRange: {
      fontSize: 10,
      color: '#6b7280',
      fontStyle: 'italic'
    },
    
    // Section styles
    section: { 
      marginTop: 20, 
      marginBottom: 15 
    },
    sectionTitle: { 
      fontSize: 16, 
      fontWeight: 'bold', 
      color: '#1e40af',
      marginBottom: 10,
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: 5
    },
    
    // KPI Grid
    kpiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 20
    },
    kpiCard: {
      width: '48%',
      marginRight: '2%',
      marginBottom: 10,
      padding: 10,
      backgroundColor: '#f3f4f6',
      borderRadius: 4,
      border: '1px solid #e5e7eb'
    },
    kpiLabel: {
      fontSize: 9,
      color: '#6b7280',
      marginBottom: 3
    },
    kpiValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: 3
    },
    kpiGrowth: {
      fontSize: 8,
      color: '#10b981',
      marginBottom: 2
    },
    kpiProgress: {
      fontSize: 8,
      color: '#6b7280'
    },
    
    // Chart styles
    chart: {
      marginVertical: 15,
      padding: 10,
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: 4
    },
    chartTitle: {
      fontSize: 12,
      fontWeight: 'bold',
      color: '#374151',
      marginBottom: 8
    },
    chartImage: {
      width: '100%',
      height: 200,
      objectFit: 'contain'
    },
    
    // Table styles
    table: {
      marginVertical: 10
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#3b82f6',
      padding: 8,
      fontWeight: 'bold',
      color: '#ffffff',
      fontSize: 9
    },
    tableRow: {
      flexDirection: 'row',
      borderBottom: '1px solid #e5e7eb',
      padding: 8,
      fontSize: 8
    },
    tableRowEven: {
      backgroundColor: '#f9fafb'
    },
    tableCol: {
      flex: 1
    },
    
    // Metrics list
    metricsList: {
      marginVertical: 10
    },
    metricItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottom: '1px solid #f3f4f6'
    },
    metricLabel: {
      fontSize: 9,
      color: '#374151'
    },
    metricValue: {
      fontSize: 9,
      fontWeight: 'bold',
      color: '#111827'
    },
    
    // Footer
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      textAlign: 'center',
      color: '#9ca3af',
      fontSize: 8,
      borderTop: '1px solid #e5e7eb',
      paddingTop: 10
    },
    
    pageNumber: {
      position: 'absolute',
      bottom: 30,
      right: 40,
      color: '#9ca3af',
      fontSize: 8
    }
  });

  const formattedDateRange = dateRange 
    ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`
    : 'All Time';

  return React.createElement(
    Document,
    null,
    // Page 1: Executive Summary & KPIs
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.title }, 'Analytics Report'),
        React.createElement(Text, { style: styles.subtitle }, 'CRMFlow Business Intelligence'),
        React.createElement(Text, { style: styles.dateRange }, `Period: ${formattedDateRange}`)
      ),
      
      // KPIs Section
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Key Performance Indicators'),
        React.createElement(
          View,
          { style: styles.kpiGrid },
          
          // Revenue KPI
          React.createElement(
            View,
            { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Total Revenue'),
            React.createElement(Text, { style: styles.kpiValue }, formatCurrency(kpiData.revenue.current)),
            React.createElement(Text, { style: styles.kpiGrowth }, `Growth: ${formatPercentage(kpiData.revenue.growth)}`),
            React.createElement(Text, { style: styles.kpiProgress }, `Target: ${formatCurrency(kpiData.revenue.target)} (${formatPercentage(kpiData.revenue.progress)})`)
          ),
          
          // Deals KPI
          React.createElement(
            View,
            { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Total Deals'),
            React.createElement(Text, { style: styles.kpiValue }, kpiData.deals.current.toString()),
            React.createElement(Text, { style: styles.kpiGrowth }, `Growth: ${formatPercentage(kpiData.deals.growth)}`),
            React.createElement(Text, { style: styles.kpiProgress }, `Target: ${kpiData.deals.target} (${formatPercentage(kpiData.deals.progress)})`)
          ),
          
          // Win Rate KPI
          React.createElement(
            View,
            { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Win Rate'),
            React.createElement(Text, { style: styles.kpiValue }, formatPercentage(kpiData.winRate.current)),
            React.createElement(Text, { style: styles.kpiGrowth }, `Growth: ${formatPercentage(kpiData.winRate.growth)}`),
            React.createElement(Text, { style: styles.kpiProgress }, `Target: ${formatPercentage(kpiData.winRate.target)}`)
          ),
          
          // Avg Deal Size KPI
          React.createElement(
            View,
            { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Avg Deal Size'),
            React.createElement(Text, { style: styles.kpiValue }, formatCurrency(kpiData.averageDealSize.current)),
            React.createElement(Text, { style: styles.kpiGrowth }, `Growth: ${formatPercentage(kpiData.averageDealSize.growth)}`),
            React.createElement(Text, { style: styles.kpiProgress }, `Target: ${formatCurrency(kpiData.averageDealSize.target)}`)
          )
        )
      ),
      
      // Performance Metrics
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Performance Metrics'),
        React.createElement(
          View,
          { style: styles.metricsList },
          React.createElement(
            View,
            { style: styles.metricItem },
            React.createElement(Text, { style: styles.metricLabel }, 'Quote to Order Conversion'),
            React.createElement(Text, { style: styles.metricValue }, formatPercentage(performanceMetrics.quoteToOrderConversion))
          ),
          React.createElement(
            View,
            { style: styles.metricItem },
            React.createElement(Text, { style: styles.metricLabel }, 'Order to Invoice Conversion'),
            React.createElement(Text, { style: styles.metricValue }, formatPercentage(performanceMetrics.orderToInvoiceConversion))
          ),
          React.createElement(
            View,
            { style: styles.metricItem },
            React.createElement(Text, { style: styles.metricLabel }, 'Invoice to Payment Conversion'),
            React.createElement(Text, { style: styles.metricValue }, formatPercentage(performanceMetrics.invoiceToPaymentConversion))
          ),
          React.createElement(
            View,
            { style: styles.metricItem },
            React.createElement(Text, { style: styles.metricLabel }, 'Average Sales Cycle'),
            React.createElement(Text, { style: styles.metricValue }, `${performanceMetrics.averageSalesCycle} days`)
          ),
          React.createElement(
            View,
            { style: styles.metricItem },
            React.createElement(Text, { style: styles.metricLabel }, 'Total Revenue'),
            React.createElement(Text, { style: styles.metricValue }, formatCurrency(performanceMetrics.totalRevenue))
          )
        )
      ),
      
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, `Generated on ${new Date().toLocaleString('da-DK')} • CRMFlow Analytics`)
      ),
      React.createElement(
        Text,
        { style: styles.pageNumber, render: ({ pageNumber }) => `Page ${pageNumber}` }
      )
    ),
    
    // Page 2: Charts
    charts && charts.length > 0 && React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Visual Analytics')
      ),
      
      // Render charts
      ...charts.slice(0, 3).map(([chartName, chartDataUrl]) => 
        chartDataUrl && React.createElement(
          View,
          { key: chartName, style: styles.chart },
          React.createElement(Text, { style: styles.chartTitle }, chartName),
          React.createElement(Image, { src: chartDataUrl, style: styles.chartImage })
        )
      ),
      
      React.createElement(
        Text,
        { style: styles.pageNumber, render: ({ pageNumber }) => `Page ${pageNumber}` }
      )
    ),
    
    // Page 3: Activity Metrics (if available)
    activityMetrics && React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Activity Analytics')
      ),
      
      React.createElement(
        View,
        { style: styles.metricsList },
        React.createElement(
          View,
          { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricLabel }, 'Total Activities'),
          React.createElement(Text, { style: styles.metricValue }, activityMetrics.totalActivities.toString())
        ),
        React.createElement(
          View,
          { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricLabel }, 'Calls'),
          React.createElement(Text, { style: styles.metricValue }, `${activityMetrics.callCount} (${formatPercentage(activityMetrics.callSuccessRate)} success rate)`)
        ),
        React.createElement(
          View,
          { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricLabel }, 'Emails'),
          React.createElement(Text, { style: styles.metricValue }, `${activityMetrics.emailCount} (${formatPercentage(activityMetrics.emailSuccessRate)} success rate)`)
        ),
        React.createElement(
          View,
          { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricLabel }, 'Meetings'),
          React.createElement(Text, { style: styles.metricValue }, `${activityMetrics.meetingCount} (${formatPercentage(activityMetrics.meetingSuccessRate)} success rate)`)
        ),
        React.createElement(
          View,
          { style: styles.metricItem },
          React.createElement(Text, { style: styles.metricLabel }, 'Average Activities per Day'),
          React.createElement(Text, { style: styles.metricValue }, activityMetrics.avgActivitiesPerDay.toFixed(1))
        )
      ),
      
      React.createElement(
        Text,
        { style: styles.pageNumber, render: ({ pageNumber }) => `Page ${pageNumber}` }
      )
    ),
    
    // Page 4: Salesperson Performance (if available)
    salespersonData && salespersonData.length > 0 && React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Team Performance')
      ),
      
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: [styles.tableCol, { flex: 2 }] }, 'Salesperson'),
          React.createElement(Text, { style: styles.tableCol }, 'Revenue'),
          React.createElement(Text, { style: styles.tableCol }, 'Deals Won'),
          React.createElement(Text, { style: styles.tableCol }, 'Win Rate'),
          React.createElement(Text, { style: styles.tableCol }, 'Activities')
        ),
        ...salespersonData.slice(0, 15).map((person, index) =>
          React.createElement(
            View,
            { 
              key: person.userId, 
              style: [styles.tableRow, index % 2 === 0 && styles.tableRowEven] 
            },
            React.createElement(Text, { style: [styles.tableCol, { flex: 2 }] }, person.userName),
            React.createElement(Text, { style: styles.tableCol }, formatCurrency(person.totalRevenue)),
            React.createElement(Text, { style: styles.tableCol }, person.wonDeals.toString()),
            React.createElement(Text, { style: styles.tableCol }, formatPercentage(person.winRate)),
            React.createElement(Text, { style: styles.tableCol }, person.totalActivities.toString())
          )
        )
      ),
      
      React.createElement(
        Text,
        { style: styles.pageNumber, render: ({ pageNumber }) => `Page ${pageNumber}` }
      )
    )
  );
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    // Convert charts array back to format expected by React-PDF
    if (data.charts && Array.isArray(data.charts)) {
      data.charts = data.charts;
    }

    console.log('Generating analytics PDF with data:', {
      hasKpiData: !!data.kpiData,
      hasPerformanceMetrics: !!data.performanceMetrics,
      chartsCount: data.charts?.length || 0,
      hasActivityMetrics: !!data.activityMetrics,
      hasSalespersonData: !!data.salespersonData,
    });

    const pdfDocument = createAnalyticsPDF(data);
    const stream = await renderToStream(pdfDocument);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64PDF = buffer.toString('base64');

    console.log('PDF generated successfully:', {
      size: buffer.length,
      base64Length: base64PDF.length,
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        pdf: base64PDF,
        size: buffer.length,
        filename: `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`,
      }),
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to generate PDF',
        details: error.stack,
      }),
    };
  }
};

