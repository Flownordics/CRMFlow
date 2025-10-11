// Netlify Function - React PDF Generator (ES Module)
import { createClient } from '@supabase/supabase-js';
import { renderToStream, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
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

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('da-DK');
};

// Create Quote PDF Document
const createQuotePDF = (quote, items) => {
  const currency = quote.currency || 'DKK';
  
  const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', backgroundColor: '#FFFFFF' },
    header: { marginBottom: 20, paddingBottom: 15, borderBottom: '2px solid #CDBA9A' },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    companyName: { fontSize: 20, fontWeight: 'bold', color: '#5E6367' },
    documentTitle: { fontSize: 24, fontWeight: 'bold', color: '#5E6367', textAlign: 'right' },
    metadata: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    metaColumn: { flex: 1 },
    metaItem: { marginBottom: 8 },
    metaLabel: { fontSize: 8, color: '#5E6367', marginBottom: 2 },
    metaValue: { fontSize: 10, fontWeight: 'bold', color: '#5E6367' },
    twoColumns: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20, paddingVertical: 15, borderBottom: '1px solid #CDBA9A' },
    column: { flex: 1 },
    columnTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 8, color: '#5E6367' },
    columnText: { fontSize: 9, marginBottom: 3, color: '#5E6367' },
    table: { marginVertical: 15 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#CDBA9A', padding: 8, fontWeight: 'bold', fontSize: 9 },
    tableRow: { flexDirection: 'row', borderBottom: '1px solid #CDBA9A', padding: 8, fontSize: 8 },
    tableRowEven: { backgroundColor: '#F8F6F0' },
    tableCol1: { flex: 3 },
    tableCol2: { flex: 1, textAlign: 'right' },
    tableCol3: { flex: 1, textAlign: 'right' },
    tableCol4: { flex: 1, textAlign: 'right' },
    totals: { marginTop: 20, marginLeft: 'auto', width: 200, border: '2px solid #CDBA9A', padding: 15 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, fontSize: 9 },
    totalsDivider: { borderTop: '1px solid #CDBA9A', marginVertical: 8 },
    totalFinal: { fontSize: 12, fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #CDBA9A', fontSize: 7 },
  });

  const soldByLines = [
    quote.company?.name,
    quote.company?.address,
    `${quote.company?.postal_code || ''} ${quote.company?.city || ''}`.trim(),
    quote.company?.email,
    quote.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    quote.person?.name || 'Kunde',
    quote.person?.email,
    quote.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    quote.company?.website,
    quote.company?.email,
    quote.company?.phone,
  ].filter(Boolean).join('  •  ');

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(
          View,
          { style: styles.headerTop },
          React.createElement(Text, { style: styles.companyName }, quote.company?.name || 'VIRKSOMHED'),
          React.createElement(Text, { style: styles.documentTitle }, 'TILBUD')
        ),
        React.createElement(
          View,
          { style: styles.metadata },
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem }, 
              React.createElement(Text, { style: styles.metaLabel }, 'DATO'),
              React.createElement(Text, { style: styles.metaValue }, formatDate(quote.created_at))
            ),
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'TILBUD NR.'),
              React.createElement(Text, { style: styles.metaValue }, quote.number || '-')
            )
          ),
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'GYLDIG TIL'),
              React.createElement(Text, { style: styles.metaValue }, formatDate(quote.valid_until))
            )
          )
        )
      ),
      // Two Columns
      React.createElement(
        View,
        { style: styles.twoColumns },
        React.createElement(
          View,
          { style: styles.column },
          React.createElement(Text, { style: styles.columnTitle }, 'SOLGT AF'),
          ...soldByLines.map((line, i) => React.createElement(Text, { key: i, style: styles.columnText }, line))
        ),
        React.createElement(
          View,
          { style: styles.column },
          React.createElement(Text, { style: styles.columnTitle }, 'TILBUD TIL'),
          ...billToLines.map((line, i) => React.createElement(Text, { key: i, style: styles.columnText }, line))
        )
      ),
      // Table
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.tableCol1 }, 'PRODUKT'),
          React.createElement(Text, { style: styles.tableCol2 }, 'ENHEDER'),
          React.createElement(Text, { style: styles.tableCol3 }, 'ENHEDSPRIS'),
          React.createElement(Text, { style: styles.tableCol4 }, 'TOTAL')
        ),
        ...items.map((item, i) => {
          const qty = item.qty || 1;
          const unitPrice = item.unit_minor || 0;
          const total = qty * unitPrice;
          return React.createElement(
            View,
            { key: i, style: [styles.tableRow, i % 2 === 0 && styles.tableRowEven] },
            React.createElement(Text, { style: styles.tableCol1 }, item.description || '—'),
            React.createElement(Text, { style: styles.tableCol2 }, String(qty)),
            React.createElement(Text, { style: styles.tableCol3 }, formatCurrency(unitPrice, currency)),
            React.createElement(Text, { style: styles.tableCol4 }, formatCurrency(total, currency))
          );
        })
      ),
      // Totals
      React.createElement(
        View,
        { style: styles.totals },
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'Subtotal'),
          React.createElement(Text, null, formatCurrency(quote.subtotal_minor || 0, currency))
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, null, 'Moms'),
          React.createElement(Text, null, formatCurrency(quote.tax_minor || 0, currency))
        ),
        React.createElement(View, { style: styles.totalsDivider }),
        React.createElement(
          View,
          { style: [styles.totalRow, styles.totalFinal] },
          React.createElement(Text, null, 'Total'),
          React.createElement(Text, null, formatCurrency(quote.total_minor || 0, currency))
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, companyFooter),
        React.createElement(Text, { 
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    console.log('[PDF-React] Request started');
    const { type, data } = JSON.parse(event.body || '{}');
    console.log('[PDF-React] Type:', type, 'ID:', data?.id);

    if (!type || !data || !data.id) {
      console.error('[PDF-React] Missing parameters');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing type or data.id' }),
      };
    }

    // Validate type
    if (!['quote', 'order', 'invoice'].includes(type)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: `Unsupported type: ${type}` }),
      };
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[PDF-React] Missing Supabase configuration');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Supabase configuration' }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[PDF-React] Supabase client initialized');

    // Determine table name
    const tableName = type === 'quote' ? 'quotes' : type === 'order' ? 'orders' : 'invoices';

    // Fetch document data
    console.log('[PDF-React] Fetching document from', tableName);
    const { data: docData, error: docErr } = await supabase
      .from(tableName)
      .select(`*, company:companies(*), person:people(*), deal:deals(*)`)
      .eq('id', data.id)
      .single();

    if (docErr || !docData) {
      console.error('[PDF-React] Document not found:', docErr?.message);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
          details: docErr?.message
        }),
      };
    }

    console.log('[PDF-React] Document found:', docData.id);

    // Fetch line items
    console.log('[PDF-React] Fetching line items');
    const { data: items = [] } = await supabase
      .from('line_items')
      .select('*')
      .eq('parent_type', type)
      .eq('parent_id', data.id)
      .order('position');

    console.log('[PDF-React] Found', items.length, 'line items');

    // Generate PDF using React PDF
    console.log('[PDF-React] Generating PDF with @react-pdf/renderer');
    
    const pdfDoc = createQuotePDF(docData, items);
    
    // Convert stream to buffer
    const stream = await renderToStream(pdfDoc);
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const pdfBuffer = Buffer.concat(chunks);
    console.log('[PDF-React] PDF generated, size:', pdfBuffer.length, 'bytes');

    // Convert to base64
    const base64Pdf = pdfBuffer.toString('base64');
    console.log('[PDF-React] Converted to base64, length:', base64Pdf.length);

    // Determine filename
    const docNumber = docData.number || docData.invoice_number || docData.order_number || docData.id.slice(-6);
    const filename = `${type}-${docNumber}.pdf`;

    console.log('[PDF-React] Returning response');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        pdf: base64Pdf,
        filename: filename,
        size: pdfBuffer.length,
        contentType: 'application/pdf'
      }),
    };

  } catch (error) {
    console.error('[PDF-React] Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'PDF generation failed',
        details: error.message,
        errorType: error.name,
        stack: error.stack
      }),
    };
  }
};

