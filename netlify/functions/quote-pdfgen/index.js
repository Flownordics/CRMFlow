// Netlify Function - Professional PDF Quote Generator (Cleaned: no HS, no tracking, no notes)
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

// ===== Colors =====
const COLORS = {
    primary: '#698BB5',
    dark: '#5E6367',
    green: '#98A095',
    lightGreen: '#C5CB9D',
    cream: '#ECE0CA',
    tan: '#CDBA9A',
    white: '#FFFFFF',
    lightGray: '#F8F6F0'
};

const hexToRgb = (hex = '#000000') => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
};

// ===== Page geometry (A4) =====
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 48;
const MARGIN_SIDE = 40;
const CONTENT_LEFT = MARGIN_SIDE;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_SIDE;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;

// ===== Draw helpers =====
const drawText = (page, text, opts) => {
    const { x, y, size, color = COLORS.dark, font, align = 'left', maxWidth } = opts;
    const c = hexToRgb(color);
    const t = text == null ? '' : String(text);
    if (!maxWidth) {
        let px = x;
        const w = font.widthOfTextAtSize(t, size);
        if (align === 'center') px = x - w / 2;
        if (align === 'right') px = x - w;
        page.drawText(t, { x: px, y, size, font, color: rgb(c.r, c.g, c.b) });
        return;
    }
    const lines = wrapText(t, maxWidth, font, size);
    lines.forEach((line, i) => {
        let px = x;
        const w = font.widthOfTextAtSize(line, size);
        if (align === 'center') px = x - w / 2;
        if (align === 'right') px = x - w;
        page.drawText(line, { x: px, y: y - i * (size + 2), size, font, color: rgb(c.r, c.g, c.b) });
    });
};

const drawLine = (page, x1, y1, x2, y2, color = COLORS.tan, width = 1) => {
    const c = hexToRgb(color);
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: width, color: rgb(c.r, c.g, c.b) });
};

const drawRect = (page, x, y, width, height, { color, borderColor, borderWidth = 0 } = {}) => {
    if (color) {
        const c = hexToRgb(color);
        page.drawRectangle({ x, y, width, height, color: rgb(c.r, c.g, c.b) });
    }
    if (borderColor && borderWidth > 0) {
        const b = hexToRgb(borderColor);
        page.drawRectangle({ x, y, width, height, borderColor: rgb(b.r, b.g, b.b), borderWidth });
    }
};

const formatCurrency = (v) => new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' }).format(v || 0);

const wrapText = (text, maxWidth, font, fontSize) => {
    const words = (text || '').toString().split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (font.widthOfTextAtSize(t, fontSize) <= maxWidth) line = t;
        else { if (line) lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
};

// ===== Fonts & Images =====
const loadFonts = async (pdfDoc) => {
    try {
        const r = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2');
        const b = await fetch('https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2');
        if (r.ok && b.ok) {
            const rf = await pdfDoc.embedFont(new Uint8Array(await r.arrayBuffer()));
            const bf = await pdfDoc.embedFont(new Uint8Array(await b.arrayBuffer()));
            return { regular: rf, bold: bf };
        }
    } catch { }
    return { regular: await pdfDoc.embedFont(StandardFonts.Helvetica), bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold) };
};

const loadPng = async (pdfDoc, url) => {
    try { const res = await fetch(url); if (res.ok) return await pdfDoc.embedPng(new Uint8Array(await res.arrayBuffer())); } catch { }
    return null;
};

// ===== Header (no tracking field) =====
const computeHeaderHeight = (fonts, meta, colW) => {
    let extra = 0;
    const values = [meta.date, meta.validUntil || '-', meta.number, meta.dealId || '-'];
    values.forEach((val) => {
        const lines = wrapText(String(val ?? ''), colW, fonts.bold, 10).length;
        if (lines > 1) extra = Math.max(extra, lines - 1);
    });
    return 110 + extra * 12;
};

const addHeader = (page, fonts, { logo, companyName, meta }) => {
    const colW = 150;
    const headerH = computeHeaderHeight(fonts, meta, colW);
    const topY = PAGE_HEIGHT - MARGIN_TOP;

    drawRect(page, CONTENT_LEFT - 18, topY - headerH + 12, 12, headerH - 24, { color: COLORS.tan });

    if (logo) {
        const maxH = 42; const ratio = maxH / logo.height; const w = Math.min(170, logo.width * ratio);
        page.drawImage(logo, { x: CONTENT_LEFT, y: topY - maxH - 10, width: w, height: maxH });
    } else {
        drawText(page, companyName || 'VIRKSOMHED', { x: CONTENT_LEFT, y: topY - 28, size: 22, font: fonts.bold });
    }

    drawText(page, 'TILBUD', { x: CONTENT_RIGHT, y: topY - 16, size: 26, font: fonts.bold, align: 'right' });

    const metaTop = topY - 66;
    const label = (t, x, y) => drawText(page, t, { x, y, size: 9, font: fonts.regular });
    const valueBlock = (t, x, y) => { const lines = wrapText(String(t ?? ''), colW, fonts.bold, 10); lines.forEach((ln, i) => drawText(page, ln, { x, y: y - i * 12, size: 10, font: fonts.bold })); return lines.length * 12; };

    const c1 = CONTENT_RIGHT - colW * 2 - 18; const c2 = CONTENT_RIGHT - colW;
    let y1 = metaTop; label('DATO', c1, y1); y1 -= 14; y1 -= valueBlock(meta.date, c1, y1); y1 -= 8; label('GYLDIG TIL', c1, y1); y1 -= 14; y1 -= valueBlock(meta.validUntil || '-', c1, y1);
    let y2 = metaTop; label('TILBUD NR.', c2, y2); y2 -= 14; y2 -= valueBlock(meta.number, c2, y2); y2 -= 8; label('DEAL ID', c2, y2); y2 -= 14; y2 -= valueBlock(meta.dealId || '-', c2, y2);

    drawLine(page, CONTENT_LEFT, topY - headerH, CONTENT_RIGHT, topY - headerH, COLORS.tan, 1);
    return topY - headerH - 10;
};

const addFooter = (page, fonts, pageIndex, totalPages, companyFooter) => {
    const y = MARGIN_BOTTOM + 20;
    drawLine(page, CONTENT_LEFT, y + 14, CONTENT_RIGHT, y + 14, COLORS.tan, 1);
    drawText(page, companyFooter || '', { x: CONTENT_LEFT, y, size: 8, font: fonts.regular });
    drawText(page, `Side ${pageIndex}/${totalPages}`, { x: CONTENT_RIGHT, y, size: 8, font: fonts.regular, align: 'right' });
};

// ===== Table model (NO HS column; fits content width exactly) =====
const TABLE = {
    pad: 10,
    rowH: 26,
    headerH: 28,
    getColumns: () => {
        const qty = 70; const unitPrice = 110; const total = 110;
        const description = CONTENT_WIDTH - (qty + unitPrice + total); // fill the rest — guarantees fit
        const totalWidth = CONTENT_WIDTH;
        const sx = CONTENT_LEFT;
        const x = { description: sx + TABLE.pad, qty: sx + description + TABLE.pad, unit: sx + description + qty + TABLE.pad, total: sx + description + qty + unitPrice + TABLE.pad };
        const right = { qty: x.qty + qty - TABLE.pad, unit: x.unit + unitPrice - TABLE.pad, total: x.total + total - TABLE.pad };
        return { widths: { description, qty, unitPrice, total, totalWidth }, x, right };
    }
};

// Start a new page if not enough room
const ensureSpace = (ctx, needed) => {
    if (ctx.currentY - needed >= ctx.bottomSafeY) return false;
    const p = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pages.push(p);
    ctx.currentY = addHeader(p, ctx.fonts, ctx.header);
    ctx.tableHeaderDrawn = false;
    return true;
};

const drawTableHeader = (ctx) => {
    const { widths, x, right } = ctx.cols;
    const p = ctx.pages.at(-1);
    drawRect(p, CONTENT_LEFT, ctx.currentY - TABLE.headerH, widths.totalWidth, TABLE.headerH, { color: COLORS.tan });
    drawText(p, 'PRODUKT', { x: x.description, y: ctx.currentY - 18, size: 10, font: ctx.fonts.bold });
    drawText(p, 'ENHEDER', { x: right.qty, y: ctx.currentY - 18, size: 10, font: ctx.fonts.bold, align: 'right' });
    drawText(p, 'ENHEDSPRIS', { x: right.unit, y: ctx.currentY - 18, size: 10, font: ctx.fonts.bold, align: 'right' });
    drawText(p, 'TOTAL', { x: right.total, y: ctx.currentY - 18, size: 10, font: ctx.fonts.bold, align: 'right' });
    ctx.currentY -= TABLE.headerH; ctx.tableHeaderDrawn = true;
};

// ===== Handler =====
export const handler = async (event) => {
    const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
    try {
        const { type, data } = JSON.parse(event.body || '{}');
        if (type !== 'quote' || !data) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unsupported or missing data' }) };

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseServiceKey) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Supabase configuration' }) };

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: quoteData, error: quoteErr } = await supabase.from('quotes').select(`*, company:companies(*), person:people(*), deal:deals(*)`).eq('id', data.id);
        if (quoteErr) return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Quote query failed', details: quoteErr.message }) };
        const quote = quoteData?.[0];
        if (!quote) return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'Quote not found' }) };

        const { data: items = [] } = await supabase.from('line_items').select('*').eq('parent_type', 'quote').eq('parent_id', data.id).order('position');

        const quoteDate = new Date(quote.created_at).toLocaleDateString('da-DK');
        const validUntil = quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('da-DK') : null;
        const subtotal = (quote.subtotal_minor || 0) / 100;
        const tax = (quote.tax_minor || 0) / 100;
        const total = (quote.total_minor || 0) / 100;

        const pdfDoc = await PDFDocument.create();
        const fonts = await loadFonts(pdfDoc);
        const logo = quote.company?.logo_url ? await loadPng(pdfDoc, quote.company.logo_url) : null;

        const pages = [];
        const first = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        pages.push(first);

        const header = { logo, companyName: quote.company?.name || 'Virksomhed', meta: { date: quoteDate, number: quote.number || quote.quote_number || `QUO-${quote.id.slice(-6)}`, validUntil: validUntil || '-', dealId: quote.deal_id || '-' } };

        let currentY = addHeader(first, fonts, header);
        const bottomSafeY = MARGIN_BOTTOM + 60;

        const cols = TABLE.getColumns();

        const ctx = { pdfDoc, pages, fonts, header, currentY, bottomSafeY, cols, tableHeaderDrawn: false };

        // ===== SOLD BY / BILL TO =====
        const gutter = 36; const colW = (CONTENT_WIDTH - gutter) / 2; const leftX = CONTENT_LEFT; const rightX = CONTENT_LEFT + colW + gutter;
        const blockTitle = (t, x, y) => drawText(pages.at(-1), t, { x, y, size: 11, font: fonts.bold });
        const bodyLine = (t, x, y) => drawText(pages.at(-1), t, { x, y, size: 9.5, font: fonts.regular });

        blockTitle('SOLGT AF', leftX, ctx.currentY); blockTitle('TILBUD TIL', rightX, ctx.currentY); ctx.currentY -= 20;

        const soldLines = [quote.company?.name, quote.company?.address, `${quote.company?.postal_code || ''} ${quote.company?.city || ''}`.trim(), quote.company?.email, quote.company?.phone].filter(Boolean);
        const billLines = [quote.person?.name || 'Kunde', quote.person?.email, quote.person?.phone].filter(Boolean);
        const maxLines = Math.max(soldLines.length, billLines.length);
        ensureSpace(ctx, maxLines * 14 + 12);
        for (let i = 0; i < soldLines.length; i++) bodyLine(soldLines[i], leftX, ctx.currentY - i * 14);
        for (let i = 0; i < billLines.length; i++) bodyLine(billLines[i], rightX, ctx.currentY - i * 14);
        ctx.currentY -= maxLines * 14 + 24;
        drawLine(pages.at(-1), CONTENT_LEFT, ctx.currentY + 8, CONTENT_RIGHT, ctx.currentY + 8, COLORS.tan, 1);

        // ===== TABLE =====
        if (!ctx.tableHeaderDrawn) drawTableHeader(ctx);
        if (items.length === 0) {
            ensureSpace(ctx, TABLE.rowH);
            const p = pages.at(-1); drawRect(p, CONTENT_LEFT, ctx.currentY - TABLE.rowH, cols.widths.totalWidth, TABLE.rowH, { color: COLORS.cream });
            drawText(p, 'Ingen linjeposter', { x: cols.x.description, y: ctx.currentY - 18, size: 9, font: fonts.regular });
            ctx.currentY -= TABLE.rowH;
        } else {
            items.forEach((it, idx) => {
                const p = pages.at(-1);
                const bg = idx % 2 === 0 ? COLORS.white : COLORS.lightGray;
                const descMax = cols.widths.description - 2 * TABLE.pad;
                const lines = wrapText(it.description || '—', descMax, fonts.regular, 9);
                const rowH = Math.max(TABLE.rowH, lines.length * 11 + 8);
                if (ensureSpace(ctx, rowH + 6)) drawTableHeader(ctx);
                drawRect(p, CONTENT_LEFT, ctx.currentY - rowH, cols.widths.totalWidth, rowH, { color: bg });
                lines.forEach((ln, i) => drawText(p, ln, { x: cols.x.description, y: ctx.currentY - 18 - i * 11, size: 9, font: fonts.regular }));
                const qty = String(it.qty || 1); const unit = (it.unit_minor || 0) / 100; const tot = (it.qty || 1) * unit;
                drawText(p, qty, { x: cols.right.qty, y: ctx.currentY - 18, size: 9, font: fonts.regular, align: 'right' });
                drawText(p, formatCurrency(unit), { x: cols.right.unit, y: ctx.currentY - 18, size: 9, font: fonts.regular, align: 'right' });
                drawText(p, formatCurrency(tot), { x: cols.right.total, y: ctx.currentY - 18, size: 9, font: fonts.regular, align: 'right' });
                ctx.currentY -= rowH; drawLine(p, CONTENT_LEFT, ctx.currentY, CONTENT_RIGHT, ctx.currentY, COLORS.tan, 0.6);
            });
        }

        ctx.currentY -= 20;

        // ===== TOTALS ONLY (notes/insurance/incoterms removed) =====
        const totalsW = 300; const totalsH = 112; ensureSpace(ctx, totalsH + 12);
        const tX = CONTENT_RIGHT - totalsW; const tY = ctx.currentY - totalsH + 4;
        drawRect(pages.at(-1), tX, tY, totalsW, totalsH, { color: COLORS.white, borderColor: COLORS.tan, borderWidth: 1 });
        const pad = 14; const lx = tX + pad; const rx = tX + totalsW - pad; let ty = ctx.currentY - 24;
        drawText(pages.at(-1), 'Subtotal', { x: lx, y: ty, size: 10, font: fonts.regular }); drawText(pages.at(-1), formatCurrency(subtotal), { x: rx, y: ty, size: 10, font: fonts.regular, align: 'right' }); ty -= 18;
        drawText(pages.at(-1), 'Moms', { x: lx, y: ty, size: 10, font: fonts.regular }); drawText(pages.at(-1), formatCurrency(tax), { x: rx, y: ty, size: 10, font: fonts.regular, align: 'right' }); ty -= 12;
        drawLine(pages.at(-1), lx, ty, rx, ty, COLORS.tan, 1); ty -= 14;
        drawText(pages.at(-1), 'Total', { x: lx, y: ty, size: 12, font: fonts.bold }); drawText(pages.at(-1), formatCurrency(total), { x: rx, y: ty, size: 12, font: fonts.bold, align: 'right' });

        ctx.currentY = tY - 24;

        // FOOTER
        const totalPages = pages.length; const companyFooter = [quote.company?.website, quote.company?.email, quote.company?.phone].filter(Boolean).join('  •  ');
        pages.forEach((p, i) => addFooter(p, fonts, i + 1, totalPages, companyFooter));

        const pdfBytes = await pdfDoc.save();
        return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="quote-${quote.quote_number || quote.id}.pdf"` }, body: Buffer.from(pdfBytes).toString('base64'), isBase64Encoded: true };
    } catch (error) { return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Internal server error', details: error.message }) }; }
};
