// Netlify Function - React PDF Generator (ES Module)
import { createClient } from '@supabase/supabase-js';
import { renderToStream, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Brand Colors - FlowNordics
const COLORS = {
  brand: {
    purple: '#330065',        // Primary brand purple
    purpleDark: '#220044',    // Darker shade for depth
    purpleLight: '#4d0099',   // Lighter shade
    green: '#7ef791',         // Accent green
    greenLight: '#b3fac1',    // Light green for backgrounds
    greenDark: '#5ed975',     // Darker green for emphasis
  },
  neutral: {
    white: '#ffffff',
    gray50: '#fafafa',
    gray100: '#f5f5f5',
    gray200: '#efefef',
    gray300: '#dcdcdc',
    gray400: '#bdbdbd',
    gray500: '#989898',
    gray600: '#7c7c7c',
    gray700: '#656565',
    gray800: '#464646',
    gray900: '#3d3d3d',
    black: '#292929',
  },
  semantic: {
    success: '#7ef791',
    info: '#4d0099',
  }
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

// Modern shared styles for all document types
const createSharedStyles = () => StyleSheet.create({
  // Page structure
  page: { 
    padding: 45, 
    fontSize: 10, 
    fontFamily: 'Helvetica', 
    backgroundColor: COLORS.neutral.white,
    color: COLORS.neutral.gray900,
  },
  
  // Header section with modern design
  header: { 
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.brand.purple,
    borderBottomStyle: 'solid',
  },
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  companyName: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: COLORS.brand.purple,
    letterSpacing: 0.5,
  },
  documentTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: COLORS.brand.purple,
    textAlign: 'right',
    letterSpacing: 1.5,
  },
  
  // Metadata section with clean grid
  metadata: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metaColumn: { 
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  metaItem: { 
    marginBottom: 10,
  },
  metaLabel: { 
    fontSize: 8, 
    color: COLORS.neutral.gray600,
    marginBottom: 3,
    letterSpacing: 0.8,
    fontWeight: 600,
  },
  metaValue: { 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: COLORS.neutral.gray900,
  },
  
  // Two-column section for addresses
  twoColumns: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginVertical: 25,
  },
  column: { 
    flex: 1,
    padding: 15,
    marginHorizontal: 5,
    backgroundColor: COLORS.neutral.gray50,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
  },
  columnTitle: { 
    fontSize: 10, 
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.brand.purple,
    letterSpacing: 0.8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.brand.green,
    borderBottomStyle: 'solid',
  },
  columnText: { 
    fontSize: 9.5, 
    marginBottom: 4,
    color: COLORS.neutral.gray800,
    lineHeight: 1.4,
  },
  
  // Modern table design
  table: { 
    marginVertical: 20,
    borderWidth: 1,
    borderColor: COLORS.neutral.gray200,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  tableHeader: { 
    flexDirection: 'row',
    backgroundColor: COLORS.brand.purple,
    padding: 10,
    fontWeight: 'bold',
    fontSize: 9,
    color: COLORS.neutral.white,
    letterSpacing: 0.5,
  },
  tableRow: { 
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.gray200,
    borderBottomStyle: 'solid',
    padding: 10,
    fontSize: 9,
  },
  tableRowEven: { 
    backgroundColor: COLORS.neutral.gray50,
  },
  tableCol1: { 
    flex: 3,
    paddingRight: 10,
  },
  tableCol2: { 
    flex: 1,
    textAlign: 'right',
    paddingRight: 10,
  },
  tableCol3: { 
    flex: 1.2,
    textAlign: 'right',
    paddingRight: 10,
  },
  tableCol4: { 
    flex: 1.2,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  
  // Modern totals section with accent color
  totals: { 
    marginTop: 25,
    marginLeft: 'auto',
    width: 240,
    backgroundColor: COLORS.neutral.white,
    borderWidth: 2,
    borderColor: COLORS.brand.purple,
    borderStyle: 'solid',
    borderRadius: 4,
  },
  totalsHeader: {
    backgroundColor: COLORS.brand.purple,
    padding: 10,
  },
  totalsHeaderText: {
    color: COLORS.neutral.white,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  totalsBody: {
    padding: 15,
  },
  totalRow: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    fontSize: 9.5,
    color: COLORS.neutral.gray800,
  },
  totalsDivider: { 
    borderTopWidth: 2,
    borderTopColor: COLORS.brand.green,
    borderTopStyle: 'solid',
    marginVertical: 12,
  },
  totalFinal: { 
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.brand.purple,
    paddingTop: 5,
  },
  totalFinalAmount: {
    color: COLORS.brand.green,
    fontSize: 14,
  },
  
  // Professional footer
  footer: { 
    position: 'absolute',
    bottom: 30,
    left: 45,
    right: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.brand.purple,
    borderTopStyle: 'solid',
    fontSize: 7.5,
    color: COLORS.neutral.gray600,
  },
  footerText: {
    color: COLORS.neutral.gray600,
  },
});

// Create Quote PDF Document
const createQuotePDF = (quote, items) => {
  const currency = quote.currency || 'DKK';
  const styles = createSharedStyles();

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
          { style: styles.totalsHeader },
          React.createElement(Text, { style: styles.totalsHeaderText }, 'OVERSIGT')
        ),
        React.createElement(
          View,
          { style: styles.totalsBody },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(quote.subtotal_minor || 0, currency))
          ),
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Moms (25%)'),
            React.createElement(Text, null, formatCurrency(quote.tax_minor || 0, currency))
          ),
          React.createElement(View, { style: styles.totalsDivider }),
          React.createElement(
            View,
            { style: [styles.totalRow, styles.totalFinal] },
            React.createElement(Text, null, 'Total'),
            React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(quote.total_minor || 0, currency))
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, companyFooter),
        React.createElement(Text, { 
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

// Create Order PDF Document
const createOrderPDF = (order, items) => {
  const currency = order.currency || 'DKK';
  const styles = createSharedStyles();

  const soldByLines = [
    order.company?.name,
    order.company?.address,
    `${order.company?.postal_code || ''} ${order.company?.city || ''}`.trim(),
    order.company?.email,
    order.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    order.person?.name || 'Kunde',
    order.person?.email,
    order.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    order.company?.website,
    order.company?.email,
    order.company?.phone,
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
          React.createElement(Text, { style: styles.companyName }, order.company?.name || 'VIRKSOMHED'),
          React.createElement(Text, { style: styles.documentTitle }, 'ORDRE')
        ),
        React.createElement(
          View,
          { style: styles.metadata },
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem }, 
              React.createElement(Text, { style: styles.metaLabel }, 'ORDRE DATO'),
              React.createElement(Text, { style: styles.metaValue }, formatDate(order.order_date || order.created_at))
            ),
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'ORDRE NR.'),
              React.createElement(Text, { style: styles.metaValue }, order.number || '-')
            )
          ),
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'STATUS'),
              React.createElement(Text, { style: styles.metaValue }, (order.status || 'draft').toUpperCase())
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
          React.createElement(Text, { style: styles.columnTitle }, 'KUNDE'),
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
          { style: styles.totalsHeader },
          React.createElement(Text, { style: styles.totalsHeaderText }, 'OVERSIGT')
        ),
        React.createElement(
          View,
          { style: styles.totalsBody },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(order.subtotal_minor || 0, currency))
          ),
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Moms (25%)'),
            React.createElement(Text, null, formatCurrency(order.tax_minor || 0, currency))
          ),
          React.createElement(View, { style: styles.totalsDivider }),
          React.createElement(
            View,
            { style: [styles.totalRow, styles.totalFinal] },
            React.createElement(Text, null, 'Total'),
            React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(order.total_minor || 0, currency))
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, companyFooter),
        React.createElement(Text, { 
          style: styles.footerText,
          render: ({ pageNumber, totalPages }) => `Side ${pageNumber} af ${totalPages}` 
        })
      )
    )
  );
};

// Create Invoice PDF Document
const createInvoicePDF = (invoice, items) => {
  const currency = invoice.currency || 'DKK';
  const styles = createSharedStyles();

  const soldByLines = [
    invoice.company?.name,
    invoice.company?.address,
    `${invoice.company?.postal_code || ''} ${invoice.company?.city || ''}`.trim(),
    invoice.company?.email,
    invoice.company?.phone,
  ].filter(Boolean);

  const billToLines = [
    invoice.person?.name || 'Kunde',
    invoice.person?.email,
    invoice.person?.phone,
  ].filter(Boolean);

  const companyFooter = [
    invoice.company?.website,
    invoice.company?.email,
    invoice.company?.phone,
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
          React.createElement(Text, { style: styles.companyName }, invoice.company?.name || 'VIRKSOMHED'),
          React.createElement(Text, { style: styles.documentTitle }, 'FAKTURA')
        ),
        React.createElement(
          View,
          { style: styles.metadata },
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem }, 
              React.createElement(Text, { style: styles.metaLabel }, 'FAKTURA DATO'),
              React.createElement(Text, { style: styles.metaValue }, formatDate(invoice.invoice_date || invoice.created_at))
            ),
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'FAKTURA NR.'),
              React.createElement(Text, { style: styles.metaValue }, invoice.invoice_number || '-')
            )
          ),
          React.createElement(
            View,
            { style: styles.metaColumn },
            React.createElement(View, { style: styles.metaItem },
              React.createElement(Text, { style: styles.metaLabel }, 'BETALINGSFRIST'),
              React.createElement(Text, { style: styles.metaValue }, formatDate(invoice.due_date))
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
          React.createElement(Text, { style: styles.columnTitle }, 'FAKTURERET TIL'),
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
          { style: styles.totalsHeader },
          React.createElement(Text, { style: styles.totalsHeaderText }, 'OVERSIGT')
        ),
        React.createElement(
          View,
          { style: styles.totalsBody },
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Subtotal'),
            React.createElement(Text, null, formatCurrency(invoice.subtotal_minor || 0, currency))
          ),
          React.createElement(
            View,
            { style: styles.totalRow },
            React.createElement(Text, null, 'Moms (25%)'),
            React.createElement(Text, null, formatCurrency(invoice.tax_minor || 0, currency))
          ),
          React.createElement(View, { style: styles.totalsDivider }),
          React.createElement(
            View,
            { style: [styles.totalRow, styles.totalFinal] },
            React.createElement(Text, null, 'Total'),
            React.createElement(Text, { style: styles.totalFinalAmount }, formatCurrency(invoice.total_minor || 0, currency))
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, companyFooter),
        React.createElement(Text, { 
          style: styles.footerText,
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
    
    // Select the appropriate PDF generator based on type
    let pdfDoc;
    switch (type) {
      case 'quote':
        pdfDoc = createQuotePDF(docData, items);
        break;
      case 'order':
        pdfDoc = createOrderPDF(docData, items);
        break;
      case 'invoice':
        pdfDoc = createInvoicePDF(docData, items);
        break;
      default:
        throw new Error(`Unsupported document type: ${type}`);
    }
    
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

