// Netlify Function - Professional PDF Invoice Generator
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

// Color palette
const COLORS = {
    primary: '#698BB5',
    dark: '#5E6367',
    green: '#98A095',
    lightGreen: '#C5CB9D',
    cream: '#ECE0CA',
    gold: '#E1BB7A',
    tan: '#CDBA9A',
    brown: '#D2AE89',
    coral: '#FE968D',
    red: '#AF4337',
    white: '#FFFFFF',
    lightGray: '#F8F6F0'
};

// Convert hex to RGB for pdf-lib
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : { r: 0, g: 0, b: 0 };
};

// Layout constants
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_TOP = 24;
const MARGIN_BOTTOM = 24;
const MARGIN_SIDE = 32;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN_SIDE * 2);

// Safe content area
const CONTENT_LEFT = MARGIN_SIDE;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_SIDE;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

// Measure + aligned text (med wrap)
const textWidth = (font, size, str) => font.widthOfTextAtSize(String(str ?? ''), size);

const drawTextAligned = (page, text, {
    x, y, size, font, color = COLORS.dark, align = 'left',
    maxWidth, lineHeight
}) => {
    const { r, g, b } = hexToRgb(color);
    const lh = lineHeight || Math.round(size * 1.2);
    const drawOne = (line, yy) => {
        const w = textWidth(font, size, line);
        let xx = x; if (align === 'center') xx -= w / 2; if (align === 'right') xx -= w;
        page.drawText(line, { x: xx, y: yy, size, font, color: rgb(r, g, b) });
    };
    if (!maxWidth) { drawOne(String(text ?? ''), y); return { lastY: y - lh, lines: 1 }; }

    const words = String(text ?? '').split(/\s+/);
    let cur = '', lines = [];
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (textWidth(font, size, test) <= maxWidth) cur = test;
        else {
            if (cur) lines.push(cur);
            if (textWidth(font, size, w) > maxWidth) { // hard-break long word
                let chunk = '';
                for (const ch of w) {
                    const t = chunk + ch;
                    if (textWidth(font, size, t) <= maxWidth) chunk = t;
                    else { if (chunk) { lines.push(chunk); chunk = ch; } }
                }
                cur = chunk;
            } else cur = w;
        }
    }
    if (cur) lines.push(cur);
    let yy = y; for (const line of lines) { drawOne(line, yy); yy -= lh; }
    return { lastY: yy, lines: lines.length };
};

const drawRightInBox = (page, text, { boxX, boxWidth, paddingRight = 10, y, size, font, color = COLORS.dark }) =>
    drawTextAligned(page, text, { x: boxX + boxWidth - paddingRight, y, size, font, color, align: 'right' });

// Helper functions for PDF generation
const drawText = (page, text, options) => {
    const { x, y, size, color = COLORS.dark, font, align = 'left', maxWidth } = options;
    const colorRgb = hexToRgb(color);

    page.drawText(text, {
        x,
        y,
        size,
        font,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        ...(maxWidth && { maxWidth })
    });
};

const drawLine = (page, startX, startY, endX, endY, color = COLORS.tan, width = 1) => {
    const colorRgb = hexToRgb(color);
    page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: width,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b)
    });
};

const drawRect = (page, x, y, width, height, options) => {
    const { color, borderColor, borderWidth = 0 } = options;

    if (color) {
        const colorRgb = hexToRgb(color);
        page.drawRectangle({
            x,
            y,
            width,
            height,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b)
        });
    }

    if (borderColor && borderWidth > 0) {
        const borderRgb = hexToRgb(borderColor);
        page.drawRectangle({
            x,
            y,
            width,
            height,
            borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
            borderWidth
        });
    }
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('da-DK', {
        style: 'currency',
        currency: 'DKK'
    }).format(amount);
};

const wrapText = (text, maxWidth, font, fontSize) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (textWidth <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                lines.push(word);
            }
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines;
};

// Font loading helper
const loadFonts = async (pdfDoc) => {
    try {
        // Try to load Inter font from Google Fonts
        const interRegularResponse = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2');
        const interBoldResponse = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2');

        if (interRegularResponse.ok && interBoldResponse.ok) {
            const regularFontBytes = await interRegularResponse.arrayBuffer();
            const boldFontBytes = await interBoldResponse.arrayBuffer();

            const regularFont = await pdfDoc.embedFont(new Uint8Array(regularFontBytes));
            const boldFont = await pdfDoc.embedFont(new Uint8Array(boldFontBytes));

            return { regularFont, boldFont };
        }
    } catch (error) {
        console.log('Failed to load Inter fonts, using StandardFonts:', error);
    }

    // Fallback to StandardFonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    return { regularFont, boldFont };
};

// Image loading helper
const loadImage = async (pdfDoc, imageUrl) => {
    try {
        const response = await fetch(imageUrl);
        if (response.ok) {
            const imageBytes = await response.arrayBuffer();
            return await pdfDoc.embedPng(new Uint8Array(imageBytes));
        }
    } catch (error) {
        console.log('Failed to load image:', imageUrl, error);
    }
    return null;
};

export const handler = async (event, context) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { type, data, user } = JSON.parse(event.body);

        if (!type || !data) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Missing required fields: type and data' })
            };
        }

        // Get environment variables with fallbacks
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

        console.log('Environment check:', {
            SUPABASE_URL: !!supabaseUrl,
            SUPABASE_SERVICE_KEY: !!supabaseServiceKey,
            VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
            SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
        });

        if (!supabaseUrl || !supabaseServiceKey) {
            return {
                statusCode: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Missing Supabase configuration',
                    details: {
                        SUPABASE_URL: !!supabaseUrl,
                        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
                        available: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
                    }
                })
            };
        }

        // Create Supabase client with service role key (bypasses RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let pdfContent;
        let filename;

        if (type === 'invoice') {
            // Fetch invoice data from database
            console.log('Looking for invoice with ID:', data.id);
            console.log('User context:', { user, userId: user?.id });

            // First check if invoice exists at all
            const { data: allInvoices, error: allInvoicesError } = await supabase
                .from('invoices')
                .select('id, created_by')
                .eq('id', data.id);

            console.log('All invoices check:', { allInvoices, allInvoicesError });

            // Get full invoice data (service role key bypasses RLS, so no user filter needed)
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    company:companies(*),
                    person:people(*),
                    deal:deals(*)
                `)
                .eq('id', data.id);

            const invoice = invoiceData && invoiceData.length > 0 ? invoiceData[0] : null;

            console.log('Invoice query result:', { invoice, invoiceError });

            if (invoiceError) {
                console.error('Invoice query failed:', invoiceError);
                return {
                    statusCode: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'Invoice query failed',
                        details: invoiceError.message,
                        code: invoiceError.code
                    })
                };
            }

            if (!invoice) {
                console.error('Invoice not found with ID:', data.id);
                return {
                    statusCode: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'Invoice not found',
                        details: `No invoice found with ID: ${data.id}`
                    })
                };
            }

            // Debug line item creation removed - using actual line items from database

            // Fetch line items separately
            let lineItems = [];
            if (!invoiceError && invoice) {
                console.log('Fetching line items for invoice:', data.id);
                const { data: lineItemsData, error: lineItemsError } = await supabase
                    .from('line_items')
                    .select('*')
                    .eq('parent_type', 'invoice')
                    .eq('parent_id', data.id)
                    .order('position');

                console.log('Line items query result:', {
                    lineItemsData,
                    lineItemsError,
                    count: lineItemsData?.length || 0
                });
                lineItems = lineItemsData || [];
            } else {
                console.log('Skipping line items fetch due to invoice error:', invoiceError);
            }

            if (invoiceError) {
                console.error('Invoice query error:', invoiceError);
                return {
                    statusCode: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        error: 'Invoice query failed',
                        details: invoiceError.message,
                        code: invoiceError.code
                    })
                };
            }

            if (!invoice) {
                console.error('Invoice not found for ID:', data.id);
                return {
                    statusCode: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ error: 'Invoice not found', invoiceId: data.id })
                };
            }

            // Create a professional PDF invoice using pdf-lib
            const invoiceDate = new Date(invoice.created_at).toLocaleDateString('da-DK');
            const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('da-DK') : 'Ikke angivet';

            const subtotal = (invoice.subtotal_minor || 0) / 100;
            const taxAmount = (invoice.tax_minor || 0) / 100;
            const totalAmount = (invoice.total_minor || 0) / 100;

            // Create PDF document
            const pdfDoc = await PDFDocument.create();

            // Load fonts (Inter with fallback to StandardFonts)
            const { regularFont, boldFont } = await loadFonts(pdfDoc);

            // Load logo if available
            let logoImage = null;
            if (invoice.company?.logo_url) {
                logoImage = await loadImage(pdfDoc, invoice.company.logo_url);
            }

            // Get company name for header
            const companyName = invoice.company?.name || 'Virksomhed';

            // Add page
            const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
            let currentY = PAGE_HEIGHT - MARGIN_TOP;

            // Header bar
            const headerHeight = 60;
            drawRect(page, 0, currentY - headerHeight, PAGE_WIDTH, headerHeight, { color: COLORS.primary });

            // Left: logo/navn
            const logoMaxH = 40, logoMaxW = 140;
            if (logoImage) {
                const ratio = logoImage.width / logoImage.height;
                const h = Math.min(logoMaxH, headerHeight - 20);
                const w = Math.min(logoMaxW, h * ratio);
                page.drawImage(logoImage, { x: CONTENT_LEFT, y: currentY - 10 - h, width: w, height: h });
            } else {
                drawTextAligned(page, companyName, { x: CONTENT_LEFT, y: currentY - 35, size: 20, font: boldFont, color: COLORS.white });
            }

            // Right: meta box
            const metaBoxWidth = 260, metaBoxHeight = 84;
            const metaBoxX = CONTENT_RIGHT - metaBoxWidth, metaBoxYTop = currentY - 10;
            drawRect(page, metaBoxX, metaBoxYTop - metaBoxHeight, metaBoxWidth, metaBoxHeight, {
                color: COLORS.cream, borderColor: COLORS.tan, borderWidth: 1
            });

            // Label "FAKTURA" (justeret til venstre for meta-boks)
            drawTextAligned(page, 'FAKTURA', { x: metaBoxX - 8, y: currentY - 32, size: 24, font: boldFont, color: COLORS.white, align: 'right' });

            // Meta indhold
            const invoiceNumber = invoice.number || invoice.invoice_number || `INV-${invoice.id.slice(-6)}`;
            const mbPad = 10; let mbY = metaBoxYTop - 16;
            drawTextAligned(page, `Faktura nr: ${invoiceNumber}`, { x: metaBoxX + mbPad, y: mbY, size: 10, font: regularFont, maxWidth: metaBoxWidth - 2 * mbPad });
            mbY -= 15;
            drawTextAligned(page, `Dato: ${invoiceDate}`, { x: metaBoxX + mbPad, y: mbY, size: 10, font: regularFont }); mbY -= 15;
            drawTextAligned(page, `Forfaldsdato: ${dueDate}`, { x: metaBoxX + mbPad, y: mbY, size: 10, font: regularFont });

            currentY -= headerHeight + 30;

            // Addresses (2 columns)
            const gutter = 40;
            const leftColWidth = Math.floor((CONTENT_WIDTH - gutter) / 2);
            const rightColWidth = CONTENT_WIDTH - gutter - leftColWidth;

            // Left (Fra:)
            let leftY = currentY;
            drawTextAligned(page, 'Fra:', { x: CONTENT_LEFT, y: leftY, size: 12, font: boldFont }); leftY -= 18;

            const companyAddress = invoice.company?.address || 'Adresse ikke angivet';
            const companyPostal = invoice.company?.postal_code || '';
            const companyCity = invoice.company?.city || '';
            const companyEmail = invoice.company?.email || '';
            const companyPhone = invoice.company?.phone || '';

            ({ lastY: leftY } = drawTextAligned(page, companyName, { x: CONTENT_LEFT, y: leftY, size: 11, font: boldFont, maxWidth: leftColWidth })); leftY -= 4;
            ({ lastY: leftY } = drawTextAligned(page, companyAddress, { x: CONTENT_LEFT, y: leftY, size: 10, font: regularFont, maxWidth: leftColWidth })); leftY -= 2;
            ({ lastY: leftY } = drawTextAligned(page, `${companyPostal} ${companyCity}`.trim(), { x: CONTENT_LEFT, y: leftY, size: 10, font: regularFont, maxWidth: leftColWidth }));
            if (companyEmail) ({ lastY: leftY } = drawTextAligned(page, companyEmail, { x: CONTENT_LEFT, y: leftY - 2, size: 10, font: regularFont, maxWidth: leftColWidth }));
            if (companyPhone) ({ lastY: leftY } = drawTextAligned(page, companyPhone, { x: CONTENT_LEFT, y: leftY - 2, size: 10, font: regularFont, maxWidth: leftColWidth }));

            // Right (Til:)
            let rightY = currentY;
            drawTextAligned(page, 'Til:', { x: CONTENT_LEFT + leftColWidth + gutter, y: rightY, size: 12, font: boldFont }); rightY -= 18;

            const personName = invoice.person?.name || 'Kunde';
            const personEmail = invoice.person?.email || '';
            const personPhone = invoice.person?.phone || '';

            ({ lastY: rightY } = drawTextAligned(page, personName, { x: CONTENT_LEFT + leftColWidth + gutter, y: rightY, size: 11, font: boldFont, maxWidth: rightColWidth })); rightY -= 2;
            if (personEmail) ({ lastY: rightY } = drawTextAligned(page, personEmail, { x: CONTENT_LEFT + leftColWidth + gutter, y: rightY, size: 10, font: regularFont, maxWidth: rightColWidth }));
            if (personPhone) ({ lastY: rightY } = drawTextAligned(page, personPhone, { x: CONTENT_LEFT + leftColWidth + gutter, y: rightY, size: 10, font: regularFont, maxWidth: rightColWidth }));

            currentY = Math.min(leftY, rightY) - 30;

            // Line items table
            const rowBaseH = 22;
            const col = {
                desc: CONTENT_LEFT,
                qty: CONTENT_LEFT + 250,
                unit: CONTENT_LEFT + 250 + 80,
                total: CONTENT_LEFT + 250 + 80 + 100,
            };
            const widths = { desc: 250, qty: 80, unit: 100, total: 100 };

            // Header
            drawRect(page, CONTENT_LEFT, currentY - rowBaseH, CONTENT_WIDTH, rowBaseH, { color: COLORS.lightGreen });
            drawTextAligned(page, 'Beskrivelse', { x: col.desc + 10, y: currentY - 16, size: 10, font: boldFont });
            drawTextAligned(page, 'Antal', { x: col.qty + widths.qty - 10, y: currentY - 16, size: 10, font: boldFont, align: 'right' });
            drawTextAligned(page, 'Enhedspris', { x: col.unit + widths.unit - 10, y: currentY - 16, size: 10, font: boldFont, align: 'right' });
            drawTextAligned(page, 'Total', { x: col.total + widths.total - 10, y: currentY - 16, size: 10, font: boldFont, align: 'right' });
            currentY -= rowBaseH;

            // Rows
            if (lineItems && lineItems.length > 0) {
                for (let i = 0; i < lineItems.length; i++) {
                    const it = lineItems[i];
                    const rowColor = i % 2 === 0 ? COLORS.white : COLORS.cream;
                    const description = it.description || 'Beskrivelse';
                    const quantity = it.qty ?? 1;
                    const unitPrice = (it.unit_minor || 0) / 100;
                    const total = quantity * unitPrice;

                    // measure wrapped height
                    const { lines } = drawTextAligned(page, description, { x: col.desc + 10, y: currentY - 14, size: 9, font: regularFont, maxWidth: widths.desc - 20 });
                    const rowH = Math.max(rowBaseH, Math.round(lines * 11 + 8));

                    // background
                    drawRect(page, CONTENT_LEFT, currentY - rowH, CONTENT_WIDTH, rowH, { color: rowColor });

                    // text
                    drawTextAligned(page, description, { x: col.desc + 10, y: currentY - 14, size: 9, font: regularFont, maxWidth: widths.desc - 20 });
                    drawTextAligned(page, String(quantity), { x: col.qty + widths.qty - 10, y: currentY - 14, size: 9, font: regularFont, align: 'right' });
                    drawTextAligned(page, formatCurrency(unitPrice), { x: col.unit + widths.unit - 10, y: currentY - 14, size: 9, font: regularFont, align: 'right' });
                    drawTextAligned(page, formatCurrency(total), { x: col.total + widths.total - 10, y: currentY - 14, size: 9, font: regularFont, align: 'right' });

                    currentY -= rowH;
                }
            } else {
                drawRect(page, CONTENT_LEFT, currentY - rowBaseH, CONTENT_WIDTH, rowBaseH, { color: COLORS.cream });
                drawTextAligned(page, 'Ingen linjeposter fundet', { x: col.desc + 10, y: currentY - 16, size: 9, font: regularFont });
                currentY -= rowBaseH;
            }

            currentY -= 20;

            const totalsBoxWidth = 320, totalsBoxHeight = 104;
            const totalsBoxX = CONTENT_RIGHT - totalsBoxWidth;
            drawRect(page, totalsBoxX, currentY - totalsBoxHeight, totalsBoxWidth, totalsBoxHeight, {
                color: COLORS.lightGray, borderColor: COLORS.green, borderWidth: 1
            });

            let tY = currentY - 22;
            drawTextAligned(page, 'Subtotal:', { x: totalsBoxX + 10, y: tY, size: 10, font: regularFont });
            drawRightInBox(page, formatCurrency(subtotal), { boxX: totalsBoxX, boxWidth: totalsBoxWidth, y: tY, size: 10, font: regularFont });
            tY -= 20;

            drawTextAligned(page, 'Moms:', { x: totalsBoxX + 10, y: tY, size: 10, font: regularFont });
            drawRightInBox(page, formatCurrency(taxAmount), { boxX: totalsBoxX, boxWidth: totalsBoxWidth, y: tY, size: 10, font: regularFont });
            tY -= 18;

            drawLine(page, totalsBoxX + 10, tY, totalsBoxX + totalsBoxWidth - 10, tY, COLORS.green, 1); tY -= 18;

            drawTextAligned(page, 'TOTAL:', { x: totalsBoxX + 10, y: tY, size: 12, font: boldFont });
            drawRightInBox(page, formatCurrency(totalAmount), { boxX: totalsBoxX, boxWidth: totalsBoxWidth, y: tY, size: 12, font: boldFont });

            currentY -= totalsBoxHeight + 30;

            // Payment section
            ({ lastY: currentY } = drawTextAligned(page, `Betalingsbetingelser: ${invoice.payment_terms || 'Netto 30 dage'}`, {
                x: CONTENT_LEFT, y: currentY, size: 10, font: regularFont, maxWidth: CONTENT_WIDTH
            }));
            ({ lastY: currentY } = drawTextAligned(page, `Noter: ${invoice.notes || 'Tak for din forretning!'}`, {
                x: CONTENT_LEFT, y: currentY, size: 10, font: regularFont, maxWidth: CONTENT_WIDTH
            }));

            // QR code if available
            if (invoice.payment_qr_url) {
                const qrImage = await loadImage(pdfDoc, invoice.payment_qr_url);
                if (qrImage) {
                    const qrSize = 120;
                    const qrX = CONTENT_RIGHT - qrSize;
                    const qrY = currentY - qrSize - 10;
                    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
                }
            }

            // Footer
            drawTextAligned(page, 'Side 1/1', { x: CONTENT_RIGHT, y: MARGIN_BOTTOM + 20, size: 8, font: regularFont, align: 'right', color: COLORS.dark });

            // Generate PDF bytes
            const pdfBytes = await pdfDoc.save();
            pdfContent = Buffer.from(pdfBytes);

            filename = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
        } else {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unsupported document type. Use "invoice"' })
            };
        }

        // Return the generated document
        return {
            statusCode: 200,
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfContent.length.toString(),
            },
            body: pdfContent.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Error in pdf-generator-v2 function:', error);
        return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};
