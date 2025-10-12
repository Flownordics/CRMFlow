import { logger } from '@/lib/logger';
import { toastBus } from '@/lib/toastBus';

export interface AnalyticsPDFData {
  dateRange?: {
    start: Date;
    end: Date;
  };
  kpiData: any;
  performanceMetrics: any;
  charts: Map<string, string>; // Map of chart name to base64 image
  activityMetrics?: any;
  salespersonData?: any[];
  forecastSummary?: any;
}

/**
 * Generate analytics PDF report
 * @param data - Analytics data including KPIs, metrics, and chart images
 * @returns PDF blob
 */
export async function generateAnalyticsPDF(
  data: AnalyticsPDFData
): Promise<Blob> {
  try {
    logger.debug('[AnalyticsPDF] Generating PDF report', {
      hasCharts: data.charts.size,
      hasActivityMetrics: !!data.activityMetrics,
      hasSalespersonData: !!data.salespersonData,
    });

    // Call Netlify function to generate PDF
    const response = await fetch('/.netlify/functions/analytics-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRange: data.dateRange
          ? {
              start: data.dateRange.start.toISOString(),
              end: data.dateRange.end.toISOString(),
            }
          : undefined,
        kpiData: data.kpiData,
        performanceMetrics: data.performanceMetrics,
        charts: Array.from(data.charts.entries()), // Convert Map to array for JSON
        activityMetrics: data.activityMetrics,
        salespersonData: data.salespersonData,
        forecastSummary: data.forecastSummary,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[AnalyticsPDF] PDF generation failed', {
        status: response.status,
        error: errorData,
      });
      throw new Error(errorData.error || 'Failed to generate PDF report');
    }

    // Parse response
    const responseData = await response.json();

    if (!responseData.success || !responseData.pdf) {
      throw new Error('Invalid PDF response from server');
    }

    // Decode base64 PDF
    const base64Data = responseData.pdf;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'application/pdf' });

    logger.debug('[AnalyticsPDF] PDF generated successfully', {
      size: blob.size,
    });

    return blob;
  } catch (error) {
    logger.error('[AnalyticsPDF] Failed to generate PDF', error);
    throw error;
  }
}

/**
 * Download analytics PDF report
 * @param data - Analytics data
 * @param filename - Name of the PDF file
 */
export async function downloadAnalyticsPDF(
  data: AnalyticsPDFData,
  filename: string = 'analytics-report.pdf'
): Promise<void> {
  try {
    toastBus.show('Generating PDF report...', 'info');

    const blob = await generateAnalyticsPDF(data);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toastBus.show('PDF report downloaded successfully', 'success');
    logger.debug('[AnalyticsPDF] PDF downloaded', { filename });
  } catch (error) {
    logger.error('[AnalyticsPDF] Failed to download PDF', error);
    toastBus.show('Failed to generate PDF report', 'error');
    throw error;
  }
}

/**
 * Open analytics PDF report in new tab
 * @param data - Analytics data
 */
export async function openAnalyticsPDF(data: AnalyticsPDFData): Promise<void> {
  try {
    toastBus.show('Generating PDF report...', 'info');

    const blob = await generateAnalyticsPDF(data);
    const url = URL.createObjectURL(blob);

    window.open(url, '_blank');

    // Clean up after a delay
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    toastBus.show('PDF report opened', 'success');
  } catch (error) {
    logger.error('[AnalyticsPDF] Failed to open PDF', error);
    toastBus.show('Failed to generate PDF report', 'error');
    throw error;
  }
}

