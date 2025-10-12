import { toPng, toJpeg } from 'html-to-image';
import { logger } from '@/lib/logger';

export type ImageFormat = 'png' | 'jpeg';

interface ChartToImageOptions {
  format?: ImageFormat;
  quality?: number; // 0-1 for JPEG
  width?: number;
  height?: number;
  backgroundColor?: string;
}

/**
 * Convert a chart/DOM element to an image data URL
 * @param element - The DOM element to convert (usually a chart container)
 * @param options - Conversion options
 * @returns Base64 data URL of the image
 */
export async function chartToImageDataUrl(
  element: HTMLElement,
  options: ChartToImageOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 0.95,
    width,
    height,
    backgroundColor = '#ffffff',
  } = options;

  try {
    logger.debug('[ChartToImage] Converting chart to image', {
      format,
      width,
      height,
    });

    const convertOptions = {
      quality,
      backgroundColor,
      width: width || element.offsetWidth,
      height: height || element.offsetHeight,
      pixelRatio: 2, // Higher quality for PDF
      cacheBust: true,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      },
    };

    let dataUrl: string;

    if (format === 'jpeg') {
      dataUrl = await toJpeg(element, convertOptions);
    } else {
      dataUrl = await toPng(element, convertOptions);
    }

    logger.debug('[ChartToImage] Chart converted successfully', {
      dataUrlLength: dataUrl.length,
    });

    return dataUrl;
  } catch (error) {
    logger.error('[ChartToImage] Failed to convert chart', error);
    throw new Error('Failed to convert chart to image');
  }
}

/**
 * Convert a chart to a Blob
 * @param element - The DOM element to convert
 * @param options - Conversion options
 * @returns Blob of the image
 */
export async function chartToBlob(
  element: HTMLElement,
  options: ChartToImageOptions = {}
): Promise<Blob> {
  const dataUrl = await chartToImageDataUrl(element, options);
  
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  
  return blob;
}

/**
 * Download a chart as an image file
 * @param element - The DOM element to convert
 * @param filename - Name of the file to download
 * @param options - Conversion options
 */
export async function downloadChartAsImage(
  element: HTMLElement,
  filename: string,
  options: ChartToImageOptions = {}
): Promise<void> {
  try {
    const dataUrl = await chartToImageDataUrl(element, options);
    
    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    logger.debug('[ChartToImage] Chart downloaded', { filename });
  } catch (error) {
    logger.error('[ChartToImage] Failed to download chart', error);
    throw error;
  }
}

/**
 * Convert multiple charts to images in parallel
 * @param elements - Map of chart names to DOM elements
 * @param options - Conversion options
 * @returns Map of chart names to data URLs
 */
export async function convertMultipleCharts(
  elements: Map<string, HTMLElement>,
  options: ChartToImageOptions = {}
): Promise<Map<string, string>> {
  logger.debug('[ChartToImage] Converting multiple charts', {
    count: elements.size,
  });

  const promises = Array.from(elements.entries()).map(async ([name, element]) => {
    try {
      const dataUrl = await chartToImageDataUrl(element, options);
      return [name, dataUrl] as [string, string];
    } catch (error) {
      logger.error(`[ChartToImage] Failed to convert chart: ${name}`, error);
      // Return empty string for failed conversions
      return [name, ''] as [string, string];
    }
  });

  const results = await Promise.all(promises);
  return new Map(results);
}

/**
 * Wait for all chart animations to complete before converting
 * @param delayMs - Delay in milliseconds to wait
 */
export function waitForChartAnimations(delayMs: number = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

